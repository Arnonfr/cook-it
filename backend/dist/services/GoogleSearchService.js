"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSearchService = void 0;
const axios_1 = __importDefault(require("axios"));
const mockRecipes_1 = require("../data/mockRecipes");
const recipeTransforms_1 = require("../utils/recipeTransforms");
const RecipeParserService_1 = require("./RecipeParserService");
const env_1 = require("../config/env");
class GoogleSearchService {
    constructor() {
        this.apiKey = env_1.env.googleApiKey;
        this.cx = env_1.env.googleCx;
        this.parserService = new RecipeParserService_1.RecipeParserService();
    }
    normalize(text) {
        return text
            .toLowerCase()
            .replace(/[^\u0590-\u05FFa-z0-9\s]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    scoreRecipe(query, candidate) {
        const normalizedQuery = this.normalize(query);
        const haystack = this.normalize([
            candidate.title,
            candidate.sourceName,
            candidate.tags.join(' '),
            candidate.ingredients.join(' ')
        ].join(' '));
        const tokens = normalizedQuery.split(' ').filter(Boolean);
        if (!tokens.length)
            return 0;
        return tokens.reduce((score, token) => {
            if (candidate.title.includes(token))
                return score + 5;
            if (candidate.tags.some((tag) => tag.includes(token)))
                return score + 3;
            if (haystack.includes(token))
                return score + 1;
            return score;
        }, 0);
    }
    searchMockRecipes(query) {
        const ranked = mockRecipes_1.mockRecipes
            .map((recipe) => ({ recipe, score: this.scoreRecipe(query, recipe) }))
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score);
        const fallback = ranked.length > 0 ? ranked : mockRecipes_1.mockRecipes.map((recipe) => ({ recipe, score: 0 }));
        return fallback.slice(0, 12).map(({ recipe }) => (0, recipeTransforms_1.mockRecipeToSearchResult)(recipe));
    }
    extractResultUrl(rawHref) {
        if (!rawHref)
            return null;
        try {
            const absolute = rawHref.startsWith('http') ? rawHref : `https:${rawHref}`;
            const parsed = new URL(absolute);
            const redirectUrl = parsed.searchParams.get('uddg');
            return redirectUrl ? decodeURIComponent(redirectUrl) : absolute;
        }
        catch {
            return null;
        }
    }
    async searchRecipePagesFromWeb(query) {
        const searchQuery = `${query} מתכון`;
        const response = await axios_1.default.get('https://html.duckduckgo.com/html/', {
            params: {
                q: searchQuery,
                kl: 'il-he'
            },
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            }
        });
        const cheerio = await Promise.resolve().then(() => __importStar(require('cheerio')));
        const $ = cheerio.load(response.data);
        const rawResults = $('.result').map((_, element) => {
            const title = $(element).find('.result__title').text().trim();
            const href = $(element).find('.result__title a, .result__a').attr('href');
            const snippet = $(element).find('.result__snippet').text().trim();
            const sourceName = $(element).find('.result__extras__url').text().trim() || undefined;
            const url = this.extractResultUrl(href);
            if (!url || !title)
                return null;
            return { title, url, snippet, sourceName };
        }).get().filter(Boolean);
        const uniqueResults = rawResults.filter((item, index, items) => (items.findIndex((candidate) => candidate.url === item.url) === index)).slice(0, 8);
        const enriched = await Promise.allSettled(uniqueResults.map(async (item) => {
            const summary = await this.parserService.extractRecipeSummary(item.url, item.title, item.sourceName);
            if (summary)
                return summary;
            return {
                sourceUrl: item.url,
                title: item.title,
                sourceName: item.sourceName,
                ingredientsPreview: item.snippet ? [item.snippet] : [],
                tags: []
            };
        }));
        return enriched
            .filter((result) => result.status === 'fulfilled')
            .map((result) => result.value)
            .filter((result) => result.title);
    }
    async searchRecipes(query) {
        if (this.apiKey === 'MOCK_FOR_NOW' || !this.apiKey) {
            try {
                const webResults = await this.searchRecipePagesFromWeb(query);
                if (webResults.length > 0) {
                    return webResults;
                }
            }
            catch (error) {
                console.error('Web recipe search failed, falling back to local catalog:', error);
            }
            return this.searchMockRecipes(query);
        }
        try {
            const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.cx}&q=${encodeURIComponent(query + ' מתכון')}`;
            const response = await axios_1.default.get(url);
            const items = response.data.items || [];
            return items.map((item) => {
                // Attempt to extract recipe metadata if Google indexed it
                let metadata = {};
                if (item.pagemap && item.pagemap.Recipe) {
                    metadata = item.pagemap.Recipe[0] || {};
                }
                else if (item.pagemap && item.pagemap.recipe) {
                    metadata = item.pagemap.recipe[0] || {};
                }
                return {
                    sourceUrl: item.link,
                    title: item.title,
                    image: item.pagemap?.cse_image?.[0]?.src || metadata.image,
                    totalTime: metadata.totalTime || metadata.preptime || metadata.cooktime,
                    servings: metadata.recipeyield ? parseInt(metadata.recipeyield, 10) : undefined,
                    ingredientsPreview: [], // Full ingredients require URL parsing usually, unless indexed heavily
                    sourceName: item.displayLink,
                    tags: [],
                };
            });
        }
        catch (error) {
            console.error('Error fetching from Google Custom Search API:', error);
            throw new Error('Failed to search recipes');
        }
    }
}
exports.GoogleSearchService = GoogleSearchService;
