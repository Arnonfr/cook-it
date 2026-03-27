import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { mockRecipes } from '../data/mockRecipes';
import { mockRecipeToSearchResult, type SearchResult } from '../utils/recipeTransforms';
import { RecipeParserService } from './RecipeParserService';
import { env } from '../config/env';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HEBREW_REGEX = /[\u0590-\u05FF]/;

// Domains that are not single-recipe pages
const BLOCKED_DOMAINS = new Set([
    'youtube.com', 'youtu.be', 'm.youtube.com',
    'facebook.com', 'fb.com', 'm.facebook.com',
    'instagram.com',
    'tiktok.com',
    'pinterest.com', 'pinterest.co.il', 'pin.it', 'pinterest.co.uk', 'pinterest.de', 'pinterest.fr',
    'twitter.com', 'x.com',
    'reddit.com',
    'buzzfeed.com', 'tasty.co',
    'amazon.com', 'ebay.com',
    'walmart.com', 'target.com',
]);

// URL path patterns that indicate non-recipe pages
const BLOCKED_PATH_PATTERNS = [
    /\/gallery\//i,
    /\/slideshow\//i,
    /\/collection\//i,
    /\/roundup\//i,
    /\/best-.*-recipes/i,
];

// Listicle title patterns
const LISTICLE_PATTERNS = [
    // Starts with number: "15 Best Recipes", "9600 עוגיות"
    /^\d[\d,.']*\s+(?:best|easy|quick|simple|delicious|amazing|top|great|favorite|favourite|popular|ways?|ideas?|types?|kinds?|recipes?|cookies?|cakes?|dishes?|meals?|foods?|snacks?|desserts?|soups?|salads?|breads?|drinks?|cocktails?|smoothies?|מתכוני|מתכונים|דרכים?|טיפים?|אופני|שיטות?|קל|פשוט|מנות?|סוגי)/i,
    // "Top X", "Best X" with number
    /^(?:top|best|the\s+best|the\s+top)\s+\d+/i,
    // "The Best Cookie Recipes", "Best Chocolate Cake Recipes" (no number needed, plural only)
    /^(?:the\s+)?best\s+\w[\w\s]{0,30}recipes\b/i,
    // "65 of Our Best...", "10 of the Top..."
    /^\d+\s+of\s+(?:our|the|my|these)\s+/i,
    // "Ultimate Guide", "Complete List"
    /^(?:the\s+)?(?:ultimate|complete|definitive|comprehensive)\s+/i,
    // "X Popular Recipes", "X Easy Cookie Recipes"
    /^\d+\s+(?:popular|classic|traditional|famous|iconic|must-try|crowd-pleasing)/i,
    // Hebrew collection patterns: "אוסף מתכונים", "X מתכונים ש..."
    /^(?:אוסף|רשימת|קולקציית)/i,
    /\d+\s+מתכונים\s+(?:ש|ל|מ|ב)/i,
    // "מגוון מתכונים" anywhere — collection pages
    /מגוון\s+מתכונים/i,
    // "Topic: מתכונים ל..." or "Topic - מתכונים ל..."
    /^[^:–-]+[:–-]\s*מתכונים\s+ל/i,
    // "מתכונים לעוגיות / לכל..." — plural recipe list
    /^מתכונים\s+ל/i,
    // "כל המתכונים ל..." / "כל מתכוני"
    /^כל\s+(?:המתכונים|מתכוני)/i,
    // "X מתכונים" at start — collection pages with count
    /^\d+\s+מתכונים/i,
    // Site index pages: "מתכוני X - כל המתכונים"
    /כל\s+המתכונים/i,
    // Archive / category pages: "קטגוריה:", "ארכיון:", "תגית:"
    /^(?:קטגוריה|ארכיון|תגית|תג|category|tag|archive)\s*:/i,
    // "X recipes for Y" collection titles
    /^\d+\s+recipes?\s+for\b/i,
    // "How to make X different ways"
    /\bdifferent\s+ways?\b/i,
    // "X ways to cook..."
    /^\d+\s+ways?\s+(?:to|you)/i,
];

function isBlockedUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.replace(/^www\./, '');
        if (BLOCKED_DOMAINS.has(hostname)) return true;
        // Check path patterns
        return BLOCKED_PATH_PATTERNS.some(p => p.test(parsed.pathname));
    } catch {
        return false;
    }
}

function isListicle(title: string): boolean {
    const trimmed = title.trim();
    return LISTICLE_PATTERNS.some(p => p.test(trimmed));
}

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
    private serperCall(q: string, gl: string, hl: string) {
        return axios.post<any>(
            'https://google.serper.dev/search',
            { q, gl, hl, num: 10 },
            {
                headers: { 'X-API-KEY': this.serperApiKey, 'Content-Type': 'application/json' },
                timeout: 5000
            }
        ).catch(() => null);
    }

    private async searchWithSerper(query: string): Promise<SearchResult[]> {
        // Fire both calls immediately — no Gemini translation delay
        const [hebrewResp, englishResp] = await Promise.all([
            this.serperCall(`${query} מתכון`, 'il', 'he'),
            this.serperCall(`${query} recipe`, 'us', 'en')
        ]);

        const responses = [hebrewResp, englishResp];

        // Merge organic results from all responses
        let allOrganic: any[] = [];
        for (const resp of responses) {
            if (resp && (resp as any).data?.organic) {
                allOrganic = allOrganic.concat((resp as any).data.organic);
            }
        }

        // Deduplicate by link, filter blocked domains + listicles, score by relevance
        const seenUrls = new Set<string>();
        const results = allOrganic
            .filter((item: any) => {
                if (!item.link || seenUrls.has(item.link)) return false;
                if (isBlockedUrl(item.link)) return false;
                if (isListicle(item.title || '')) return false;
                seenUrls.add(item.link);
                return true;
            })
            .map((item: any) => {
                const titleLower = (item.title || '').toLowerCase();
                const snippetLower = (item.snippet || '').toLowerCase();
                const queryLower = query.toLowerCase();
                let score = 0;

                if (titleLower.includes(queryLower)) score += 10;
                if (snippetLower.includes(queryLower)) score += 5;
                if (titleLower.includes('recipe') || titleLower.includes('מתכון')) score += 3;
                if (/\d+\s*(min|דקות|hour|שעות)/.test(item.snippet || '')) score += 2;

                const snippet = item.snippet || '';
                const extractedTime = this.extractTimeFromText(snippet) || this.extractTimeFromText(item.title);
                const extractedIngredients = this.extractIngredientsFromSnippet(snippet);

                const result: SearchResult = {
                    sourceUrl: item.link,
                    title: item.title,
                    sourceName: item.source || new URL(item.link).hostname,
                    image: item.imageUrl || item.thumbnailUrl || undefined,
                    totalTime: extractedTime,
                    ingredientsPreview: extractedIngredients,
                    tags: []
                };
                return { result, score };
            })
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 15)
            .map((x: any) => x.result)
            .filter((r: SearchResult) => r.title);

        return results;
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
            timeout: 4000,
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
            && !isBlockedUrl(item.url)
            && !isListicle(item.title)
        )).slice(0, 8);

        return uniqueResults.map((item) => ({
            sourceUrl: item.url,
            title: item.title,
            sourceName: item.sourceName,
            ingredientsPreview: this.extractIngredientsFromSnippet(item.snippet),
            tags: []
        }));
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
                console.error('[Search] Serper.dev failed, trying fallback:', error instanceof Error ? error.message : error);
            }
        }

        // 2. Fall back to DuckDuckGo HTML scraping
        try {
            console.log(`[Search] Trying DuckDuckGo fallback for "${query}"`);
            const ddgResults = await this.searchRecipePagesFromWeb(query);
            if (ddgResults.length > 0) {
                console.log(`[Search] DuckDuckGo returned ${ddgResults.length} results for "${query}"`);
                try {
                    await prisma.searchCache.upsert({
                        where: { query: normalizedQuery },
                        update: { resultsJson: JSON.stringify(ddgResults) },
                        create: { query: normalizedQuery, resultsJson: JSON.stringify(ddgResults) }
                    });
                } catch (cacheError) {
                    console.error('[Search] Failed to save DDG search cache:', cacheError);
                }
                return ddgResults;
            }
        } catch (ddgError) {
            console.error('[Search] DuckDuckGo fallback failed, using mock recipes:', ddgError instanceof Error ? ddgError.message : ddgError);
        }

        // 3. Fall back to local mock recipes
        console.log(`[Search] Using local recipe catalog for "${query}"`);
        return this.searchMockRecipes(query);
    }
}
