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
exports.RecipeParserService = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const mockRecipes_1 = require("../data/mockRecipes");
const recipeTransforms_1 = require("../utils/recipeTransforms");
class RecipeParserService {
    async fetchHtml(url) {
        const { data: html } = await axios_1.default.get(url, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            }
        });
        return html;
    }
    extractRecipeJsonLd(html) {
        const $ = cheerio.load(html);
        let recipeJsonLd = null;
        $('script[type="application/ld+json"]').each((_, el) => {
            if (recipeJsonLd)
                return;
            try {
                const content = $(el).html();
                if (!content)
                    return;
                const parsed = JSON.parse(content);
                const candidates = Array.isArray(parsed)
                    ? parsed
                    : parsed?.['@graph']
                        ? parsed['@graph']
                        : [parsed];
                for (const item of candidates) {
                    if (item?.['@type'] === 'Recipe' || (Array.isArray(item?.['@type']) && item['@type'].includes('Recipe'))) {
                        recipeJsonLd = item;
                        return;
                    }
                }
            }
            catch {
                // Ignore malformed JSON-LD blocks.
            }
        });
        return { $, recipeJsonLd };
    }
    async extractRecipeSummary(url, fallbackTitle, fallbackSourceName) {
        const mockRecipe = mockRecipes_1.mockRecipes.find((recipe) => recipe.sourceUrl === url);
        if (mockRecipe) {
            const parsed = (0, recipeTransforms_1.mockRecipeToParsedRecipe)(mockRecipe);
            return {
                sourceUrl: url,
                title: parsed.title,
                image: parsed.image,
                totalTime: parsed.totalTime,
                servings: parsed.servings,
                ingredientsPreview: parsed.ingredients.slice(0, 4).map((ingredient) => ingredient.originalSpec || ingredient.name),
                sourceName: parsed.sourceName,
                difficulty: parsed.difficulty,
                tags: parsed.tags
            };
        }
        try {
            const html = await this.fetchHtml(url);
            const { $, recipeJsonLd } = this.extractRecipeJsonLd(html);
            if (!recipeJsonLd) {
                return null;
            }
            const image = Array.isArray(recipeJsonLd.image)
                ? recipeJsonLd.image[0]?.url || recipeJsonLd.image[0]
                : recipeJsonLd.image?.url || recipeJsonLd.image;
            const recipeYield = recipeJsonLd.recipeYield;
            const servings = typeof recipeYield === 'number'
                ? recipeYield
                : typeof recipeYield === 'string'
                    ? Number.parseInt(recipeYield, 10) || undefined
                    : undefined;
            const keywords = Array.isArray(recipeJsonLd.keywords)
                ? recipeJsonLd.keywords
                : typeof recipeJsonLd.keywords === 'string'
                    ? recipeJsonLd.keywords.split(',').map((value) => value.trim()).filter(Boolean)
                    : [];
            const ingredients = Array.isArray(recipeJsonLd.recipeIngredient) ? recipeJsonLd.recipeIngredient.slice(0, 4) : [];
            return {
                sourceUrl: url,
                title: recipeJsonLd.name || fallbackTitle || $('title').text().trim(),
                image,
                totalTime: recipeJsonLd.totalTime || recipeJsonLd.prepTime || recipeJsonLd.cookTime,
                servings,
                ingredientsPreview: ingredients,
                sourceName: fallbackSourceName || new URL(url).hostname.replace('www.', ''),
                difficulty: recipeJsonLd.recipeCategory,
                tags: keywords
            };
        }
        catch (error) {
            console.error(`Failed to extract summary for URL: ${url}`, error);
            return null;
        }
    }
    async parseUrl(url) {
        try {
            const mockRecipe = mockRecipes_1.mockRecipes.find((recipe) => recipe.sourceUrl === url);
            if (mockRecipe) {
                return (0, recipeTransforms_1.mockRecipeToParsedRecipe)(mockRecipe);
            }
            const html = await this.fetchHtml(url);
            const { $, recipeJsonLd } = this.extractRecipeJsonLd(html);
            if (!recipeJsonLd) {
                throw new Error('Could not find Recipe schema in the page metadata');
            }
            // 3. Extract and normalize data
            const title = recipeJsonLd.name || $('title').text();
            const rawIngredients = recipeJsonLd.recipeIngredient || [];
            let rawSteps = recipeJsonLd.recipeInstructions || [];
            // Normalize steps to array of strings
            const stepsText = [];
            if (typeof rawSteps === 'string') {
                stepsText.push(rawSteps);
            }
            else {
                for (const step of rawSteps) {
                    if (step['@type'] === 'HowToStep' && step.text) {
                        stepsText.push(step.text);
                    }
                    else if (typeof step === 'string') {
                        stepsText.push(step);
                    }
                    else if (step['@type'] === 'HowToSection' && step.itemListElement) {
                        // Handle sections
                        for (const subStep of step.itemListElement) {
                            if (subStep['@type'] === 'HowToStep' && subStep.text) {
                                stepsText.push(subStep.text);
                            }
                        }
                    }
                }
            }
            // 4. Map strings to our normalized format
            const ingredients = rawIngredients.map((str, idx) => (0, recipeTransforms_1.parseIngredientLine)(str, idx + 1));
            // 5. Algorithm MVP: Map Ingredients to Step based on string inclusion
            const steps = stepsText.map((text, idx) => {
                const stepNumber = idx + 1;
                const ingredientIds = [];
                ingredients.forEach(ing => {
                    // If the step text includes part of the ingredient name (naive check)
                    // e.g. "בשר" in "מטגנים את הבשר"
                    // Strip common Hebrew prefixes like ה, ב, ל for better matching if needed
                    const cleanName = ing.name.replace(/^(ה|ב|ל|מ|כ)/, '');
                    if (text.includes(cleanName) || text.includes(ing.name)) {
                        ingredientIds.push(ing.id);
                    }
                });
                return {
                    stepNumber,
                    text: text.replace(/<[^>]*>?/gm, ''), // Ensure no HTML markup
                    ingredientIds
                };
            });
            return {
                title,
                ingredients,
                steps,
                totalTime: recipeJsonLd.totalTime,
                servings: Number.parseInt(recipeJsonLd.recipeYield, 10) || undefined,
                difficulty: recipeJsonLd.recipeCategory,
                image: Array.isArray(recipeJsonLd.image) ? recipeJsonLd.image[0] : recipeJsonLd.image,
                sourceName: new URL(url).hostname.replace('www.', ''),
                tags: Array.isArray(recipeJsonLd.keywords) ? recipeJsonLd.keywords : []
            };
        }
        catch (error) {
            console.error(`Failed to parse URL: ${url}`, error);
            throw error;
        }
    }
}
exports.RecipeParserService = RecipeParserService;
