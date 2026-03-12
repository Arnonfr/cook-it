import axios from 'axios';
import { mockRecipes } from '../data/mockRecipes';
import { mockRecipeToSearchResult, type SearchResult } from '../utils/recipeTransforms';
import { RecipeParserService } from './RecipeParserService';
import { env } from '../config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HEBREW_REGEX = /[\u0590-\u05FF]/;

export class GoogleSearchService {
    private serperApiKey: string;
    private parserService: RecipeParserService;

    constructor() {
        this.serperApiKey = env.serperApiKey;
        this.parserService = new RecipeParserService();
    }

    private normalize(text: string) {
        return text
            .toLowerCase()
            .replace(/[^\u0590-\u05FFa-z0-9\s]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private scoreRecipe(query: string, candidate: typeof mockRecipes[number]) {
        const normalizedQuery = this.normalize(query);
        const haystack = this.normalize([
            candidate.title,
            candidate.sourceName,
            candidate.tags.join(' '),
            candidate.ingredients.join(' ')
        ].join(' '));

        const tokens = normalizedQuery.split(' ').filter(Boolean);
        if (!tokens.length) return 0;

        return tokens.reduce((score, token) => {
            if (candidate.title.includes(token)) return score + 5;
            if (candidate.tags.some((tag) => tag.includes(token))) return score + 3;
            if (haystack.includes(token)) return score + 1;
            return score;
        }, 0);
    }

    private searchMockRecipes(query: string, strict = false): SearchResult[] {
        const ranked = mockRecipes
            .map((recipe) => ({ recipe, score: this.scoreRecipe(query, recipe) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score);

        if (strict) {
            return ranked.slice(0, 12).map(({ recipe }) => mockRecipeToSearchResult(recipe));
        }

        const fallback = ranked.length > 0 ? ranked : mockRecipes.map((recipe) => ({ recipe, score: 0 }));
        return fallback.slice(0, 12).map(({ recipe }) => mockRecipeToSearchResult(recipe));
    }

    private extractResultUrl(rawHref?: string) {
        if (!rawHref) return null;

        try {
            const absolute = rawHref.startsWith('http') ? rawHref : `https:${rawHref}`;
            const parsed = new URL(absolute);
            const redirectUrl = parsed.searchParams.get('uddg');
            return redirectUrl ? decodeURIComponent(redirectUrl) : absolute;
        } catch {
            return null;
        }
    }

    /**
     * Search local DB recipes + mock recipes.
     * Returns results matching by title, tags, or ingredients.
     */
    async searchLocal(query: string): Promise<SearchResult[]> {
        // 1. Mock recipes (strict — only actual matches, no fallback to all)
        const mockResults = this.searchMockRecipes(query, true);

        // 2. DB recipes
        let dbResults: SearchResult[] = [];
        try {
            const recipes = await prisma.recipe.findMany({
                where: { parseStatus: 'parsed' },
                take: 100
            });

            const normalizedQuery = this.normalize(query);
            const queryTokens = normalizedQuery.split(' ').filter(Boolean);

            dbResults = recipes
                .map(r => {
                    const parsed = JSON.parse(r.parsedJson || '{}');
                    const haystack = this.normalize([
                        parsed.title || '',
                        (parsed.tags || []).join(' '),
                        (parsed.ingredients || []).map((i: any) => i.name || i.originalSpec || '').join(' ')
                    ].join(' '));

                    const score = queryTokens.reduce((s, token) =>
                        haystack.includes(token) ? s + 1 : s, 0);

                    return { recipe: r, parsed, score };
                })
                // Require at least half the query tokens to match (avoids single-token noise)
                .filter(({ score }) => score >= Math.max(1, Math.ceil(queryTokens.length / 2)))
                .sort((a, b) => b.score - a.score)
                .slice(0, 20)
                .map(({ recipe: r, parsed }) => ({
                    sourceUrl: r.sourceUrl,
                    title: parsed.title || 'ללא שם',
                    image: parsed.image,
                    totalTime: parsed.totalTime,
                    servings: parsed.servings,
                    ingredientsPreview: parsed.ingredients?.slice(0, 4).map((i: any) => i.originalSpec || i.name) || [],
                    sourceName: parsed.sourceName,
                    difficulty: parsed.difficulty,
                    tags: parsed.tags || [],
                    originalLanguage: r.originalLanguage || undefined
                }));
        } catch (dbError) {
            console.error('[Search] DB search failed:', dbError);
        }

        // Deduplicate by sourceUrl: DB results take precedence
        const seen = new Set(dbResults.map(r => r.sourceUrl));
        const combined = [
            ...dbResults,
            ...mockResults.filter(r => !seen.has(r.sourceUrl))
        ];

        return combined;
    }

    /**
     * Primary search: Serper.dev (Google SERP API)
     * Free tier: 2,500 queries, no credit card required
     * Runs both Hebrew and English queries for multilingual results.
     */
    private async searchWithSerper(query: string): Promise<SearchResult[]> {
        const isHebrewQuery = HEBREW_REGEX.test(query);
        const hebrewQuery = `${query} מתכון`;

        // Build search promises: always Hebrew, optionally English
        const hebrewSearch = axios.post<any>(
            'https://google.serper.dev/search',
            { q: hebrewQuery, gl: 'il', hl: 'he', num: 30 },
            {
                headers: { 'X-API-KEY': this.serperApiKey, 'Content-Type': 'application/json' },
                timeout: 8000
            }
        );

        // If query is Hebrew, also search in English for international results
        const responses = isHebrewQuery
            ? await Promise.allSettled([
                hebrewSearch,
                (async () => {
                    try {
                        return await axios.post<any>(
                            'https://google.serper.dev/search',
                            { q: `${query} recipe`, gl: 'us', hl: 'en', num: 15 },
                            {
                                headers: { 'X-API-KEY': this.serperApiKey, 'Content-Type': 'application/json' },
                                timeout: 8000
                            }
                        );
                    } catch { return null; }
                })()
            ])
            : await Promise.allSettled([hebrewSearch]);

        // Merge organic results from all responses
        let allOrganic: any[] = [];
        for (const resp of responses) {
            if (resp.status === 'fulfilled' && resp.value?.data?.organic) {
                allOrganic = allOrganic.concat(resp.value.data.organic);
            }
        }

        // Deduplicate by link
        const seenUrls = new Set<string>();
        const organic = allOrganic.filter((item: any) => {
            if (!item.link || seenUrls.has(item.link)) return false;
            seenUrls.add(item.link);
            return true;
        });

        const results = organic
            .filter((item: any) => item.link && item.title)
            .slice(0, 30)
            .map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet || '',
                sourceName: item.source || new URL(item.link).hostname
            }));

        // Enrich results with recipe parsing (with timeout)
        const enriched = await Promise.allSettled(
            results.map(async (item: { title: string; url: string; snippet: string; sourceName: string }) => {
                const basicResult: SearchResult = {
                    sourceUrl: item.url,
                    title: item.title,
                    sourceName: item.sourceName,
                    ingredientsPreview: item.snippet ? [item.snippet] : [],
                    tags: []
                };

                try {
                    const timeoutPromise = new Promise<null>((_, reject) =>
                        setTimeout(() => reject(new Error('Parsing timeout')), 5000)
                    );
                    const parsePromise = this.parserService.extractRecipeSummary(item.url, item.title, item.sourceName);
                    const summary = await Promise.race([parsePromise, timeoutPromise]);
                    if (summary) return summary;
                } catch {
                    // Parsing failed or timed out
                }

                return basicResult;
            })
        );

        return enriched
            .filter((result): result is PromiseFulfilledResult<SearchResult> => result.status === 'fulfilled')
            .map((result: PromiseFulfilledResult<SearchResult>) => result.value)
            .filter((result: SearchResult) => result.title);
    }

    /**
     * Fallback search: DuckDuckGo HTML scraping
     */
    private async searchRecipePagesFromWeb(query: string): Promise<SearchResult[]> {
        const searchQuery = `${query} מתכון`;
        const response = await axios.get<string>('https://html.duckduckgo.com/html/', {
            params: {
                q: searchQuery,
                kl: 'il-he'
            },
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            }
        });

        // DuckDuckGo returns 202 when rate-limiting (CAPTCHA/empty page)
        if (response.status !== 200) {
            throw new Error(`DuckDuckGo returned status ${response.status} (likely rate-limited)`);
        }

        const cheerio = await import('cheerio');
        const $ = cheerio.load(response.data);
        const rawResults = $('.result').map((_, element) => {
            const title = $(element).find('.result__title').text().trim();
            const href = $(element).find('.result__title a, .result__a').attr('href');
            const snippet = $(element).find('.result__snippet').text().trim();
            const sourceName = $(element).find('.result__extras__url').text().trim() || undefined;
            const url = this.extractResultUrl(href);

            if (!url || !title) return null;
            return { title, url, snippet, sourceName };
        }).get().filter(Boolean) as Array<{ title: string; url: string; snippet: string; sourceName?: string }>;

        if (rawResults.length === 0) {
            throw new Error('DuckDuckGo returned no results (possibly blocked)');
        }

        const uniqueResults = rawResults.filter((item, index, items) => (
            items.findIndex((candidate) => candidate.url === item.url) === index
        )).slice(0, 8);

        const enriched = await Promise.allSettled(
            uniqueResults.map(async (item) => {
                const basicResult: SearchResult = {
                    sourceUrl: item.url,
                    title: item.title,
                    sourceName: item.sourceName,
                    ingredientsPreview: item.snippet ? [item.snippet] : [],
                    tags: []
                };

                try {
                    const timeoutPromise = new Promise<null>((_, reject) =>
                        setTimeout(() => reject(new Error('Parsing timeout')), 5000)
                    );
                    const parsePromise = this.parserService.extractRecipeSummary(item.url, item.title, item.sourceName);
                    const summary = await Promise.race([parsePromise, timeoutPromise]);
                    if (summary) return summary;
                } catch {
                    // Parsing failed or timed out – return basic result
                }

                return basicResult;
            })
        );

        return enriched
            .filter((result): result is PromiseFulfilledResult<SearchResult> => result.status === 'fulfilled')
            .map((result) => result.value)
            .filter((result) => result.title);
    }

    /**
     * Main search method with fallback chain:
     * 1. Serper.dev (Google SERP API) – best quality
     * 2. DuckDuckGo HTML scraping – free, no API key
     * 3. Local mock recipes – always available
     */
    async searchRecipes(query: string): Promise<SearchResult[]> {
        const normalizedQuery = query.trim().toLowerCase();

        // 0. Check Cache
        try {
            const cachedSearch = await prisma.searchCache.findUnique({
                where: { query: normalizedQuery }
            });
            if (cachedSearch) {
                const now = new Date();
                const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                if (cachedSearch.updatedAt > twentyFourHoursAgo) {
                    console.log(`[Search] Returning cached results for "${query}"`);
                    return JSON.parse(cachedSearch.resultsJson);
                }
            }
        } catch (error) {
            console.error('[Search] Failed to check search cache:', error);
        }

        // 1. Try Serper.dev first (if API key is configured)
        if (this.serperApiKey) {
            try {
                const results = await this.searchWithSerper(query);
                if (results.length > 0) {
                    console.log(`[Search] Serper.dev returned ${results.length} results for "${query}"`);

                    try {
                        await prisma.searchCache.upsert({
                            where: { query: normalizedQuery },
                            update: { resultsJson: JSON.stringify(results) },
                            create: { query: normalizedQuery, resultsJson: JSON.stringify(results) }
                        });
                    } catch (cacheError) {
                        console.error('[Search] Failed to save search cache:', cacheError);
                    }

                    return results;
                }
            } catch (error) {
                console.error('[Search] Serper.dev failed, trying DuckDuckGo:', error instanceof Error ? error.message : error);
            }
        }

        // 2. Try DuckDuckGo scraping
        try {
            const webResults = await this.searchRecipePagesFromWeb(query);
            if (webResults.length > 0) {
                console.log(`[Search] DuckDuckGo returned ${webResults.length} results for "${query}"`);
                return webResults;
            }
        } catch (error) {
            console.error('[Search] DuckDuckGo failed, falling back to local catalog:', error instanceof Error ? error.message : error);
        }

        // 3. Fall back to local mock recipes
        console.log(`[Search] Using local recipe catalog for "${query}"`);
        return this.searchMockRecipes(query);
    }
}
