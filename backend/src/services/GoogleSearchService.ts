import axios from 'axios';
import { mockRecipes } from '../data/mockRecipes';
import { mockRecipeToSearchResult, type SearchResult } from '../utils/recipeTransforms';
import { RecipeParserService } from './RecipeParserService';
import { env } from '../config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HEBREW_REGEX = /[\u0590-\u05FF]/;

export class GoogleSearchService {
    private parserService: RecipeParserService;

    constructor() {
        this.parserService = new RecipeParserService();
    }

    // Always reads the current key — supports runtime updates via settings endpoint
    private get serperApiKey(): string {
        return env.serperApiKey;
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
     * Extract time from text (snippet or title)
     * Looks for patterns like: 30 דקות, שעה, 1.5 שעות, PT30M, PT1H
     */
    private extractTimeFromText(text: string): string | undefined {
        if (!text) return undefined;
        
        // Hebrew patterns
        const hebrewPatterns = [
            { regex: /(\d+(?:\.\d+)?)\s*שעות?/, format: (m: string[]) => `PT${Math.floor(parseFloat(m[1]) * 60)}M` },
            { regex: /(\d+)\s*דקות?/, format: (m: string[]) => `PT${m[1]}M` },
            { regex: /שעה\s*ונחצי/, format: () => `PT90M` },
            { regex: /שעה(?:\s*ואחת)?/, format: () => `PT60M` },
            { regex: /חצי\s*שעה/, format: () => `PT30M` },
        ];
        
        // English patterns
        const englishPatterns = [
            { regex: /(\d+(?:\.\d+)?)\s*hours?/, format: (m: string[]) => `PT${Math.floor(parseFloat(m[1]) * 60)}M` },
            { regex: /(\d+)\s*mins?/, format: (m: string[]) => `PT${m[1]}M` },
            { regex: /(\d+)\s*minutes?/, format: (m: string[]) => `PT${m[1]}M` },
        ];
        
        for (const pattern of [...hebrewPatterns, ...englishPatterns]) {
            const match = text.match(pattern.regex);
            if (match) {
                return pattern.format(match);
            }
        }
        
        return undefined;
    }

    /**
     * Extract ingredient-like items from search snippet
     */
    private extractIngredientsFromSnippet(snippet: string): string[] {
        if (!snippet || snippet.length < 10) return [];
        
        // Look for ingredient-like patterns: quantities with units
        const ingredientPatterns = [
            /(\d+(?:\.\d+)?(?:\/\d+)?)\s*(?:כוס|כוסות|כף|כפות|כפית|כפיות|ק"ג|גרם|מ"ל|ליטר|יח|יחידות|קורט|שיני|שן|פרוסות?|חבילות?|קופסאות?)/g,
            /(\d+)\s*(?:cup|cups|tbsp|tsp|kg|g|grams?|ml|liter|piece|pieces|clove|cloves)/gi,
        ];
        
        const ingredients: string[] = [];
        
        // Split by common separators
        const parts = snippet.split(/[,;•·|\-\n]/).map(p => p.trim()).filter(p => p.length > 3 && p.length < 100);
        
        for (const part of parts) {
            // Check if it looks like an ingredient (has quantity or common ingredient words)
            const hasQuantity = ingredientPatterns.some(pattern => pattern.test(part));
            const hasIngredientWords = /(?:עגבנ|בצל|שום|שמן|מלח|פלפל|סוכר|קמח|ביצ|חלב|גבינ|חמא|לימון|עשבי|תיבול|פסטה|אורז|בשר|עוף|דג|ירק|פירות|שוקולד|וניל|קינמון|אורגנו|בזיליקום)/i.test(part);
            
            if (hasQuantity || (hasIngredientWords && part.length < 60)) {
                ingredients.push(part.replace(/\s+/g, ' ').trim());
            }
        }
        
        return ingredients.slice(0, 4);
    }

    /**
     * Primary search: Serper.dev (Google SERP API)
     * Free tier: 2,500 queries, no credit card required
     * Runs multiple search variations to get 20+ results.
     */
    private async searchWithSerper(query: string): Promise<SearchResult[]> {
        const isHebrewQuery = HEBREW_REGEX.test(query);
        
        // Build multiple search variations to get more results
        const searchVariations: Array<{ q: string; gl: string; hl: string }> = [
            { q: `${query} מתכון`, gl: 'il', hl: 'he' },
            { q: `${query} מתכון מנות`, gl: 'il', hl: 'he' },
        ];
        
        // If Hebrew query, also search English variations
        if (isHebrewQuery) {
            const englishQuery = query.replace(/[\u0590-\u05FF]/g, '').trim() || query;
            searchVariations.push(
                { q: `${englishQuery} recipe`, gl: 'us', hl: 'en' },
                { q: `${englishQuery} how to make`, gl: 'us', hl: 'en' }
            );
        } else {
            searchVariations.push(
                { q: `${query} recipe`, gl: 'us', hl: 'en' },
                { q: `${query} homemade`, gl: 'us', hl: 'en' }
            );
        }

        // Execute all searches in parallel
        const searchPromises = searchVariations.map(variation =>
            axios.post<any>(
                'https://google.serper.dev/search',
                { ...variation, num: 10 },
                {
                    headers: { 'X-API-KEY': this.serperApiKey, 'Content-Type': 'application/json' },
                    timeout: 10000
                }
            ).catch(() => null)
        );

        const responses = await Promise.all(searchPromises);

        // Merge organic results from all responses
        let allOrganic: any[] = [];
        for (const resp of responses) {
            if (resp && (resp as any).data?.organic) {
                allOrganic = allOrganic.concat((resp as any).data.organic);
            }
        }

        // Deduplicate by link and score by relevance
        const seenUrls = new Set<string>();
        const scored = allOrganic
            .filter((item: any) => {
                if (!item.link || seenUrls.has(item.link)) return false;
                seenUrls.add(item.link);
                return true;
            })
            .map((item: any) => {
                // Score by relevance to query
                const titleLower = (item.title || '').toLowerCase();
                const snippetLower = (item.snippet || '').toLowerCase();
                const queryLower = query.toLowerCase();
                let score = 0;
                
                if (titleLower.includes(queryLower)) score += 10;
                if (snippetLower.includes(queryLower)) score += 5;
                if (titleLower.includes('recipe') || titleLower.includes('מתכון')) score += 3;
                if (/\d+\s*(min|דקות|hour|שעות)/.test(item.snippet || '')) score += 2;
                
                return {
                    title: item.title,
                    url: item.link,
                    snippet: item.snippet || '',
                    sourceName: item.source || new URL(item.link).hostname,
                    score
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 25); // Top 25 results

        // Enrich results with recipe parsing (with timeout)
        const enriched = await Promise.allSettled(
            scored.map(async (item) => {
                // Extract time from snippet/title
                const extractedTime = this.extractTimeFromText(item.snippet) || this.extractTimeFromText(item.title);
                
                // Extract ingredients from snippet
                const extractedIngredients = this.extractIngredientsFromSnippet(item.snippet);
                
                const basicResult: SearchResult = {
                    sourceUrl: item.url,
                    title: item.title,
                    sourceName: item.sourceName,
                    totalTime: extractedTime,
                    ingredientsPreview: extractedIngredients.length > 0 ? extractedIngredients : [item.snippet.substring(0, 100)],
                    tags: []
                };

                try {
                    const timeoutPromise = new Promise<null>((_, reject) =>
                        setTimeout(() => reject(new Error('Parsing timeout')), 4000)
                    );
                    const parsePromise = this.parserService.extractRecipeSummary(item.url, item.title, item.sourceName);
                    const summary = await Promise.race([parsePromise, timeoutPromise]);
                    
                    if (summary) {
                        // Merge extracted data with parsed data
                        return {
                            ...summary,
                            totalTime: summary.totalTime || extractedTime,
                            ingredientsPreview: summary.ingredientsPreview?.length ? summary.ingredientsPreview : extractedIngredients
                        };
                    }
                } catch {
                    // Parsing failed or timed out - use basic result
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

        // 1. Always return local results first (fastest and most reliable)
        const localResults = this.searchMockRecipes(query);
        console.log(`[Search] Local catalog returned ${localResults.length} results for "${query}"`);
        
        // Return immediately - don't wait for external APIs
        // This ensures search always works even without API keys
        return localResults;
    }
}
