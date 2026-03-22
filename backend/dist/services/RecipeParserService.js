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
const env_1 = require("../config/env");
const mockRecipes_1 = require("../data/mockRecipes");
const recipeTransforms_1 = require("../utils/recipeTransforms");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * Returns true if an ingredient name is mentioned in a step's text.
 * Handles: exact match, Hebrew prefix stripping (ה/ב/ל/מ/כ),
 * and multi-word ingredients where any significant word appears in the text.
 */
function ingredientMentionedInStep(ingName, stepText) {
    if (!ingName || !stepText)
        return false;
    // Exact match
    if (stepText.includes(ingName))
        return true;
    // Strip single Hebrew prefix from full name
    const cleanName = ingName.replace(/^(ה|ב|ל|מ|כ)/, '');
    if (cleanName.length > 2 && stepText.includes(cleanName))
        return true;
    // Multi-word: check if any significant word (>2 chars) from the ingredient appears in text
    const words = ingName.split(/\s+/).filter(w => w.length > 2);
    return words.some(word => {
        if (stepText.includes(word))
            return true;
        const cleanWord = word.replace(/^(ה|ב|ל|מ|כ)/, '');
        return cleanWord.length > 2 && stepText.includes(cleanWord);
    });
}
class RecipeParserService {
    async fetchHtml(url, longTimeout = false) {
        const timeout = longTimeout ? 15000 : 8000;
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Upgrade-Insecure-Requests': '1',
        };
        try {
            console.log(`[Recipe] Fetching HTML from: ${url}`);
            const { data: html } = await axios_1.default.get(url, {
                timeout,
                headers,
            });
            console.log(`[Recipe] HTML fetched successfully, length: ${html.length}`);
            return html;
        }
        catch (firstError) {
            // Retry once with a simpler request (some sites block complex headers)
            if (firstError?.response?.status === 403 || firstError?.code === 'ECONNABORTED') {
                console.log(`[Recipe] Retrying fetch for "${url}" with simpler headers...`);
                const { data: html } = await axios_1.default.get(url, {
                    timeout: 12000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                    },
                });
                return html;
            }
            throw firstError;
        }
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
            // Extract image from multiple sources
            let image;
            if (recipeJsonLd?.image) {
                image = Array.isArray(recipeJsonLd.image)
                    ? recipeJsonLd.image[0]?.url || recipeJsonLd.image[0]
                    : recipeJsonLd.image?.url || recipeJsonLd.image;
            }
            // Fallback to meta tags if no JSON-LD image
            if (!image) {
                image = $('meta[property="og:image"]').attr('content')?.trim() ||
                    $('meta[name="twitter:image"]').attr('content')?.trim() ||
                    $('meta[property="og:image:secure_url"]').attr('content')?.trim() ||
                    $('article img').first().attr('src') ||
                    $('.recipe-image img').first().attr('src') ||
                    $('img[alt*="recipe" i]').first().attr('src');
                // Make relative URLs absolute
                if (image && !image.startsWith('http')) {
                    try {
                        const baseUrl = new URL(url);
                        image = image.startsWith('/')
                            ? `${baseUrl.protocol}//${baseUrl.host}${image}`
                            : `${baseUrl.protocol}//${baseUrl.host}/${image}`;
                    }
                    catch {
                        // keep original if URL parsing fails
                    }
                }
            }
            if (!recipeJsonLd && !image) {
                return null;
            }
            // If we have an image but no JSON-LD, return basic result
            if (!recipeJsonLd && image) {
                return {
                    sourceUrl: url,
                    title: fallbackTitle || $('h1').first().text().trim() || $('title').text().trim(),
                    image,
                    totalTime: undefined,
                    servings: undefined,
                    ingredientsPreview: [],
                    sourceName: fallbackSourceName || new URL(url).hostname.replace('www.', ''),
                    difficulty: undefined,
                    tags: []
                };
            }
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
    /**
     * Split a long instruction string into individual step texts.
     * Handles various Hebrew recipe patterns.
     */
    splitInstructionText(text) {
        if (!text || text.length < 30)
            return text ? [text] : [];
        // Try splitting by numbered patterns first: "1.", "2.", etc.
        const numberedParts = text.split(/(?=\d+\.\s)/).map(s => s.trim()).filter(s => s.length > 5);
        if (numberedParts.length >= 2)
            return numberedParts;
        // Try splitting by dash/bullet at start: "– ", "- "
        const dashParts = text.split(/(?=[\u2013\u2014–-]\s)/).map(s => s.replace(/^[\u2013\u2014–-]\s*/, '').trim()).filter(s => s.length > 5);
        if (dashParts.length >= 2)
            return dashParts;
        // Split by period/dot followed by space and a Hebrew letter or "מ" patterns
        // Hebrew sentence boundary: ". " followed by a Hebrew char
        const sentenceParts = text.split(/\.\s+(?=[\u0590-\u05FF])/).map(s => s.trim().replace(/\.$/, '').trim()).filter(s => s.length > 10);
        if (sentenceParts.length >= 2)
            return sentenceParts;
        // For very long texts (over 200 chars), try to split by newline or semicolon
        if (text.length > 200) {
            const newLineParts = text.split(/\n+|\r+|;/).map(s => s.trim()).filter(s => s.length > 20);
            if (newLineParts.length >= 2)
                return newLineParts;
        }
        // Last resort — just return the whole text as one step
        return [text.trim()];
    }
    /**
     * Extract text lines from HTML content that uses <br> or <p> patterns.
     * Handles <p>line1<br>line2<br>line3</p> and series of <p> elements.
     */
    extractLinesFromHtmlBlock($, container, stopPattern) {
        const lines = [];
        container.each((_, el) => {
            const $el = $(el);
            const html = $el.html() || '';
            // If it contains <br> tags, split by them
            if (/<br\s*\/?>/i.test(html)) {
                const parts = html.split(/<br\s*\/?>/i).map(part => {
                    return cheerio.load(`<div>${part}</div>`)('div').text().trim();
                }).filter(Boolean);
                lines.push(...parts);
            }
            else {
                const text = $el.text().trim();
                if (text)
                    lines.push(text);
            }
        });
        return lines.filter(l => l.length > 1 && l.length < 300);
    }
    /**
     * HTML heuristic extraction — scrape ingredients & steps from common Hebrew recipe page patterns.
     * Returns null if extraction confidence is too low.
     */
    extractFromHtml($, url) {
        const ingredientHeadings = /מצרכים|מרכיבים|חומרים|רשימת\s*מצרכים/;
        const stepsHeadings = /אופן\s*הכנה|הוראות\s*הכנה|שלבי\s*הכנה|שלבי\s*ההכנה|הכנה|דרך\s*ההכנה/;
        let ingredientLines = [];
        let stepTexts = [];
        let title = '';
        let image = '';
        // Title
        title = $('h1').first().text().trim()
            || $('meta[property="og:title"]').attr('content')?.trim()
            || $('title').text().trim()
            || '';
        // Image
        image = $('meta[property="og:image"]').attr('content')?.trim()
            || $('meta[name="twitter:image"]').attr('content')?.trim()
            || '';
        // ===== Strategy 1: Standard headings (h1-h6) followed by list/p elements =====
        $('h1, h2, h3, h4, h5, h6').each((_, headingEl) => {
            const headingText = $(headingEl).text().trim();
            this.collectSectionAfterElement($, $(headingEl), headingText, ingredientHeadings, stepsHeadings, ingredientLines, stepTexts);
        });
        // ===== Strategy 2: Bold/strong elements as headings (common in blogs) =====
        // Pattern: <p><strong>מצרכים</strong>:</p> followed by <p> items
        if (ingredientLines.length === 0 || stepTexts.length === 0) {
            $('strong, b').each((_, el) => {
                const boldText = $(el).text().trim();
                // The bold element's parent is usually a <p> — use that as the "heading"
                const parentEl = $(el).closest('p, div, li, span');
                if (parentEl.length === 0)
                    return;
                if (ingredientHeadings.test(boldText) && ingredientLines.length === 0) {
                    // Collect <p> siblings after the parent element
                    let sibling = parentEl.next();
                    for (let i = 0; i < 30 && sibling.length > 0; i++) {
                        const tag = sibling.prop('tagName')?.toLowerCase() || '';
                        const sibText = sibling.text().trim();
                        // Stop at next section heading
                        if (stepsHeadings.test(sibText) || (sibling.find('strong, b').length > 0 && stepsHeadings.test(sibling.find('strong, b').first().text().trim())))
                            break;
                        if (/^h[1-6]$/.test(tag))
                            break;
                        if (tag === 'ul' || tag === 'ol') {
                            sibling.find('li').each((_, li) => {
                                const text = $(li).text().trim();
                                if (text && text.length > 1 && text.length < 200)
                                    ingredientLines.push(text);
                            });
                            break;
                        }
                        else if (tag === 'p') {
                            // Handle <p> with <br> separators inside
                            const innerHtml = sibling.html() || '';
                            if (/<br\s*\/?>/i.test(innerHtml)) {
                                const parts = innerHtml.split(/<br\s*\/?>/i).map(part => cheerio.load(`<div>${part}</div>`)('div').text().trim()).filter(Boolean);
                                for (const p of parts) {
                                    if (p.length > 1 && p.length < 200)
                                        ingredientLines.push(p);
                                }
                            }
                            else if (sibText && sibText.length > 1 && sibText.length < 200) {
                                ingredientLines.push(sibText);
                            }
                        }
                        sibling = sibling.next();
                    }
                }
                if (stepsHeadings.test(boldText) && stepTexts.length === 0) {
                    // Check if instructions are in the same <p> as the heading (after <br>)
                    const parentHtml = parentEl.html() || '';
                    if (/<br\s*\/?>/i.test(parentHtml)) {
                        const parts = parentHtml.split(/<br\s*\/?>/i).map(part => cheerio.load(`<div>${part}</div>`)('div').text().trim()).filter(Boolean);
                        // Skip the first part (the heading itself)
                        const stepsFromSameP = parts.slice(1).filter(p => p.length > 10);
                        if (stepsFromSameP.length >= 1) {
                            stepTexts.push(...stepsFromSameP.map(s => s.replace(/^[\u2013\u2014–-]\s*/, '').trim()));
                        }
                    }
                    // Also collect <p> siblings
                    let sibling = parentEl.next();
                    for (let i = 0; i < 30 && sibling.length > 0; i++) {
                        const tag = sibling.prop('tagName')?.toLowerCase() || '';
                        const sibText = sibling.text().trim();
                        if (/^h[1-6]$/.test(tag))
                            break;
                        if (tag === 'ol' || tag === 'ul') {
                            sibling.find('li').each((_, li) => {
                                const text = $(li).text().trim();
                                if (text && text.length > 5)
                                    stepTexts.push(text);
                            });
                            break;
                        }
                        else if (tag === 'p') {
                            const innerHtml = sibling.html() || '';
                            if (/<br\s*\/?>/i.test(innerHtml)) {
                                const parts = innerHtml.split(/<br\s*\/?>/i).map(part => cheerio.load(`<div>${part}</div>`)('div').text().trim()).filter(Boolean);
                                for (const p of parts) {
                                    if (p.length > 10)
                                        stepTexts.push(p.replace(/^[\u2013\u2014–-]\s*/, '').trim());
                                }
                            }
                            else if (sibText && sibText.length > 10) {
                                stepTexts.push(sibText.replace(/^[\u2013\u2014–-]\s*/, '').trim());
                            }
                        }
                        sibling = sibling.next();
                    }
                }
            });
        }
        // ===== Strategy 3: CSS class selectors =====
        if (ingredientLines.length === 0) {
            const selectors = [
                '.recipe-ingredients li', '.ingredients li', '[class*="ingredient"] li',
                '.recipe_ingredients li', '[itemprop="recipeIngredient"]',
                '.entry-content .ingredients li',
                '.baking_components .item_rside p',
                '[class*="ingredient"] p',
            ];
            for (const sel of selectors) {
                const items = $(sel);
                if (items.length >= 2) {
                    items.each((_, el) => {
                        const text = $(el).text().trim();
                        // Skip heading-like items
                        if (ingredientHeadings.test(text) && text.length < 30)
                            return;
                        if (text && text.length > 1 && text.length < 200)
                            ingredientLines.push(text);
                    });
                    if (ingredientLines.length >= 2)
                        break;
                    ingredientLines = [];
                }
            }
        }
        if (stepTexts.length === 0) {
            const selectors = [
                '.recipe-instructions li', '.instructions li', '[class*="instruction"] li',
                '.recipe_instructions li', '[class*="direction"] li', '.directions li',
                '.recipe-steps li', '.steps li', '[itemprop="recipeInstructions"] li',
                '.entry-content .instructions li',
                '.baking_components .item_lside p',
                '[class*="instruction"] p', '[class*="preparation"] p',
            ];
            for (const sel of selectors) {
                const items = $(sel);
                if (items.length >= 1) {
                    items.each((_, el) => {
                        const text = $(el).text().trim();
                        if (stepsHeadings.test(text) && text.length < 30)
                            return;
                        if (text && text.length > 5)
                            stepTexts.push(text);
                    });
                    if (stepTexts.length >= 1)
                        break;
                    stepTexts = [];
                }
            }
        }
        // ===== Strategy 4: Scan ALL <p> tags for inline <br>-separated recipe content =====
        // This handles pages where ingredients/steps are in a single <p> with <br> separators
        if (ingredientLines.length === 0) {
            $('p').each((_, el) => {
                if (ingredientLines.length > 0)
                    return;
                const html = $(el).html() || '';
                const text = $(el).text().trim();
                // Look for a <p> that starts with or contains an ingredient heading
                if (ingredientHeadings.test(text) && /<br\s*\/?>/i.test(html)) {
                    const parts = html.split(/<br\s*\/?>/i).map(part => cheerio.load(`<div>${part}</div>`)('div').text().trim()).filter(Boolean);
                    // Skip heading part
                    for (const p of parts) {
                        if (ingredientHeadings.test(p) && p.length < 30)
                            continue;
                        if (p.length > 1 && p.length < 200)
                            ingredientLines.push(p);
                    }
                }
            });
        }
        // Need at least some ingredients or steps to be viable
        if (ingredientLines.length < 2 && stepTexts.length < 1) {
            return null;
        }
        // If we have only one step and it's extremely long, try to split it more aggressively
        if (stepTexts.length === 1 && stepTexts[0].length > 400) {
            const aggressiveSplit = stepTexts[0]
                .split(/[.!?]\s+/) // Split by sentence endings
                .map(s => s.trim())
                .filter(s => s.length > 15 && s.length < 300);
            if (aggressiveSplit.length >= 2) {
                stepTexts = aggressiveSplit;
            }
        }
        // Clean up step texts — remove leading dashes/bullets
        stepTexts = stepTexts.map(s => s.replace(/^[\u2013\u2014–-]\s*/, '').trim()).filter(s => s.length > 5);
        console.log(`[Recipe] HTML heuristic: "${url}" — ${ingredientLines.length} ingredients, ${stepTexts.length} steps`);
        let ingredientCounter = 1;
        const ingredients = ingredientLines.map(line => (0, recipeTransforms_1.parseIngredientLine)(line, ingredientCounter++));
        const steps = stepTexts.map((text, idx) => {
            const ingredientIds = ingredients
                .filter(ing => ingredientMentionedInStep(ing.name, text))
                .map(ing => ing.id);
            return { stepNumber: idx + 1, text, ingredientIds };
        });
        return {
            title,
            ingredients,
            steps,
            totalTime: '',
            servings: undefined,
            difficulty: '',
            image,
            sourceName: new URL(url).hostname.replace('www.', ''),
            tags: [],
        };
    }
    /**
     * Helper to collect content after a heading element (Strategy 1 shared logic)
     */
    collectSectionAfterElement($, headingEl, headingText, ingredientHeadings, stepsHeadings, ingredientLines, stepTexts) {
        if (ingredientHeadings.test(headingText) && ingredientLines.length === 0) {
            let sibling = headingEl.next();
            for (let i = 0; i < 20 && sibling.length > 0; i++) {
                const tag = sibling.prop('tagName')?.toLowerCase() || '';
                if (/^h[1-6]$/.test(tag))
                    break;
                if (stepsHeadings.test(sibling.text().trim()))
                    break;
                if (tag === 'ul' || tag === 'ol') {
                    sibling.find('li').each((_, li) => {
                        const text = $(li).text().trim();
                        if (text && text.length > 1 && text.length < 200)
                            ingredientLines.push(text);
                    });
                    break;
                }
                else if (tag === 'p') {
                    const text = sibling.text().trim();
                    if (text && text.length > 1 && text.length < 200)
                        ingredientLines.push(text);
                }
                else if (tag === 'div' || tag === 'section') {
                    const innerList = sibling.find('li');
                    if (innerList.length > 0) {
                        innerList.each((_, li) => {
                            const text = $(li).text().trim();
                            if (text && text.length > 1 && text.length < 200)
                                ingredientLines.push(text);
                        });
                        break;
                    }
                    const innerP = sibling.find('p');
                    if (innerP.length > 0) {
                        innerP.each((_, p) => {
                            const text = $(p).text().trim();
                            if (text && text.length > 1 && text.length < 200)
                                ingredientLines.push(text);
                        });
                        break;
                    }
                }
                sibling = sibling.next();
            }
        }
        if (stepsHeadings.test(headingText) && stepTexts.length === 0) {
            let sibling = headingEl.next();
            for (let i = 0; i < 30 && sibling.length > 0; i++) {
                const tag = sibling.prop('tagName')?.toLowerCase() || '';
                if (/^h[1-6]$/.test(tag) && !stepsHeadings.test(sibling.text().trim()))
                    break;
                if (tag === 'ol' || tag === 'ul') {
                    sibling.find('li').each((_, li) => {
                        const text = $(li).text().trim();
                        if (text && text.length > 5)
                            stepTexts.push(text);
                    });
                    break;
                }
                else if (tag === 'p') {
                    const text = sibling.text().trim();
                    if (text && text.length > 10)
                        stepTexts.push(text);
                }
                else if (tag === 'div' || tag === 'section') {
                    const innerList = sibling.find('li');
                    if (innerList.length > 0) {
                        innerList.each((_, li) => {
                            const text = $(li).text().trim();
                            if (text && text.length > 5)
                                stepTexts.push(text);
                        });
                        break;
                    }
                    const innerP = sibling.find('p');
                    if (innerP.length > 0) {
                        innerP.each((_, p) => {
                            const text = $(p).text().trim();
                            if (text && text.length > 10)
                                stepTexts.push(text);
                        });
                        break;
                    }
                }
                sibling = sibling.next();
            }
        }
    }
    /**
     * Extract recipe using Gemini AI. Returns null if Gemini is unavailable.
     */
    async extractWithGemini(cleanText, url, metadata) {
        const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
        const { env } = require('../config/env');
        if (!env.geminiApiKey) {
            console.log('[Recipe] Gemini API key not configured, skipping AI extraction');
            return null;
        }
        const genAI = new GoogleGenerativeAI(env.geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });
        const schema = {
            type: SchemaType.OBJECT,
            properties: {
                title: { type: SchemaType.STRING, description: "The recipe title exactly as written on the page" },
                ingredients: {
                    type: SchemaType.ARRAY,
                    description: "List of ingredients, each as the original text line from the recipe",
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            name: { type: SchemaType.STRING, description: "The ingredient name" },
                            quantity: { type: SchemaType.STRING, description: "The amount (number)" },
                            unit: { type: SchemaType.STRING, description: "The unit of measurement" },
                            originalSpec: { type: SchemaType.STRING, description: "The full original ingredient line as it appears in the recipe" },
                            section: { type: SchemaType.STRING, description: "Sub-recipe section name if applicable (e.g. 'לציפוי', 'לעוגה')" }
                        },
                        required: ["name", "originalSpec"]
                    }
                },
                steps: {
                    type: SchemaType.ARRAY,
                    description: "Preparation steps, each as the original text from the recipe",
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            stepNumber: { type: SchemaType.INTEGER },
                            text: { type: SchemaType.STRING, description: "The step instruction text exactly as written" },
                            section: { type: SchemaType.STRING, description: "Sub-recipe section name if applicable" }
                        },
                        required: ["stepNumber", "text"]
                    }
                }
            },
            required: ["title", "ingredients", "steps"]
        };
        const prompt = `חלץ את המתכון מהטקסט הבא. חשוב מאוד:
- חלץ רק את המתכון עצמו (מצרכים + הוראות הכנה), לא תגובות, פרסומות או טקסט אחר
- שמור על הטקסט המקורי כמו שהוא מופיע — אל תשנה כמויות, שמות מצרכים או ניסוחים
- כל שורת מצרך צריכה להיות כפי שהיא מופיעה במתכון המקורי (בשדה originalSpec)
- פרק את שורת המצרך לשדות name, quantity, unit
- אם יש חלקים שונים למתכון (למשל "לעוגה", "לציפוי") — ציין את שם החלק בשדה section
- פצל הוראות הכנה לשלבים לוגיים — מקסימום 10 שלבים לכל חלק (section)
- אחד שלבים קצרים עוקבים שעוסקים באותה פעולה לשלב אחד (לדוגמה: "מוסיפים X ומערבבים" ו-"מוסיפים Y" → שלב אחד)
- כל שלב צריך לתאר פעולה מובחנת ומשמעותית

הטקסט:
${cleanText.substring(0, 30000)}`;
        console.log(`[Recipe] Extracting with Gemini 3 Flash: ${url}`);
        let result;
        try {
            result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: schema,
                    temperature: 0.1,
                }
            });
        }
        catch (genError) {
            console.log(`[Recipe] Gemini generateContent error: ${genError?.message}`);
            console.log(`[Recipe] Gemini error details:`, JSON.stringify(genError, null, 2));
            throw genError;
        }
        const responseText = result.response.text();
        if (!responseText)
            return null;
        const parsed = JSON.parse(responseText);
        if (!parsed.ingredients?.length && !parsed.steps?.length)
            return null;
        let ingredientCounter = 1;
        const ingredients = (parsed.ingredients || []).map((ing) => ({
            id: ingredientCounter++,
            name: ing.name || '',
            quantity: ing.quantity || '',
            unit: ing.unit || '',
            originalSpec: ing.originalSpec || ing.name || '',
            section: ing.section || undefined
        }));
        const steps = (parsed.steps || []).map((step, idx) => {
            const ingredientIds = ingredients
                .filter((ing) => ingredientMentionedInStep(ing.name, step.text || ''))
                .map((ing) => ing.id);
            return {
                stepNumber: step.stepNumber || (idx + 1),
                text: step.text || '',
                section: step.section || undefined,
                ingredientIds
            };
        });
        return {
            title: parsed.title || metadata.title,
            ingredients,
            steps,
            totalTime: metadata.totalTime,
            servings: metadata.servings,
            difficulty: metadata.difficulty,
            image: metadata.image,
            sourceName: new URL(url).hostname.replace('www.', ''),
            tags: metadata.keywords
        };
    }
    /**
     * Extract recipe using Serper AI extraction (fallback when Gemini fails).
     */
    async extractWithSerper(html, url, metadata) {
        if (!env_1.env.serperApiKey) {
            console.log('[Recipe] Serper API key not configured, skipping Serper extraction');
            return null;
        }
        console.log(`[Recipe] Extracting with Serper: ${url}`);
        try {
            // Use Serper to search and extract recipe data
            const response = await axios_1.default.post('https://google.serper.dev/search', {
                q: `recipe site:${new URL(url).hostname} ${metadata.title}`,
                gl: 'il',
                hl: 'he'
            }, {
                headers: {
                    'X-API-KEY': env_1.env.serperApiKey,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            // Try to find the specific URL in results
            const data = response.data;
            const results = data?.organic || [];
            const matchingResult = results.find((r) => r.link === url);
            if (!matchingResult) {
                console.log('[Recipe] URL not found in Serper results');
                return null;
            }
            // Try to extract from the snippet or use basic extraction
            const snippet = matchingResult.snippet || '';
            // Create a basic parsed recipe from metadata
            const recipe = {
                sourceUrl: url,
                title: metadata.title,
                image: metadata.image,
                totalTime: metadata.totalTime,
                servings: metadata.servings,
                difficulty: metadata.difficulty,
                ingredients: [],
                steps: [],
                originalLanguage: 'en',
                tags: metadata.keywords
            };
            // Try to parse ingredients from HTML if available
            const $ = cheerio.load(html);
            const ingredients = [];
            let ingredientCounter = 1;
            // Look for common ingredient selectors
            $('[class*="ingredient"], [itemprop="recipeIngredient"], .recipe-ingredients li, .ingredients li').each((_, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 2 && text.length < 200) {
                    const parsed = (0, recipeTransforms_1.parseIngredientLine)(text, ingredientCounter++);
                    if (parsed.name) {
                        ingredients.push(parsed);
                    }
                }
            });
            // Look for common step selectors
            const steps = [];
            let stepNum = 1;
            $('[class*="instruction"], [itemprop="recipeInstructions"] li, .recipe-steps li, .directions li, [class*="step"]').each((_, el) => {
                const text = $(el).text().trim();
                if (text && text.length > 10 && text.length < 500) {
                    steps.push({
                        stepNumber: stepNum++,
                        text: text,
                        ingredientIds: []
                    });
                }
            });
            if (ingredients.length >= 2 || steps.length >= 1) {
                recipe.ingredients = ingredients;
                recipe.steps = steps;
                console.log(`[Recipe] Serper extracted: ${ingredients.length} ingredients, ${steps.length} steps`);
                return recipe;
            }
            console.log('[Recipe] Serper extraction insufficient');
            return null;
        }
        catch (error) {
            console.log(`[Recipe] Serper extraction error: ${error?.message}`);
            return null;
        }
    }
    /**
     * Build recipe from JSON-LD structured data (code-based, no AI).
     */
    buildRecipeFromJsonLd($, recipeJsonLd, url) {
        if (!recipeJsonLd?.recipeIngredient || !recipeJsonLd?.recipeInstructions)
            return null;
        console.log(`[Recipe] Building from JSON-LD for "${url}"`);
        // Flatten & normalize ingredients
        let rawIngredients = [];
        const flattenIngredients = (val) => {
            if (Array.isArray(val)) {
                val.forEach(flattenIngredients);
            }
            else if (typeof val === 'string') {
                val.split(/\n/).map((l) => l.trim()).filter(Boolean).forEach((l) => rawIngredients.push(l));
            }
            else if (val?.name || val?.text) {
                rawIngredients.push(val.name || val.text);
            }
        };
        flattenIngredients(recipeJsonLd.recipeIngredient);
        // If JSON-LD gave concatenated string, try HTML fallback
        if (rawIngredients.length <= 2 && rawIngredients.some((s) => s.length > 100)) {
            const htmlIngredients = [];
            $('[class*="ingredient"] p, [class*="ngredient"] p').each((_, el) => {
                const h = $(el).html() || '';
                h.split(/<br\s*\/?>/i).map(l => cheerio.load(l).text().trim()).filter(Boolean).forEach(l => htmlIngredients.push(l));
            });
            if (htmlIngredients.length >= 3)
                rawIngredients = htmlIngredients;
        }
        if (rawIngredients.length === 0)
            return null;
        let ingredientCounter = 1;
        const ingredients = rawIngredients.map((line) => (0, recipeTransforms_1.parseIngredientLine)(line, ingredientCounter++));
        // Process instructions
        const rawSteps = recipeJsonLd.recipeInstructions;
        const steps = [];
        let stepNum = 1;
        const addStep = (text) => {
            const trimmed = text.replace(/^[\u2013\u2014\u2015–-]\s*/, '').trim();
            if (trimmed.length > 5) {
                steps.push({ stepNumber: stepNum++, text: trimmed, ingredientIds: [] });
            }
        };
        const processStep = (item) => {
            if (typeof item === 'string') {
                if (item.length > 150) {
                    this.splitInstructionText(item).forEach(addStep);
                }
                else {
                    addStep(item);
                }
            }
            else if (item?.['@type'] === 'HowToStep') {
                const text = item.text || item.description || '';
                if (text.length > 200 && steps.length === 0) {
                    this.splitInstructionText(text).forEach(addStep);
                }
                else {
                    addStep(text);
                }
            }
            else if (item?.['@type'] === 'HowToSection') {
                (item.itemListElement || []).forEach(processStep);
            }
            else if (item?.text || item?.description) {
                addStep(item.text || item.description);
            }
        };
        (Array.isArray(rawSteps) ? rawSteps : [rawSteps]).forEach(processStep);
        // Link ingredients to steps
        for (const step of steps) {
            step.ingredientIds = ingredients
                .filter(ing => {
                const cleanName = ing.name.replace(/^(ה|ב|ל|מ|כ)/, '');
                return step.text.includes(ing.name) || (cleanName.length > 2 && step.text.includes(cleanName));
            })
                .map(ing => ing.id);
        }
        const imageFallback = Array.isArray(recipeJsonLd.image)
            ? (recipeJsonLd.image[0]?.url || recipeJsonLd.image[0])
            : (recipeJsonLd.image?.url || recipeJsonLd.image);
        return {
            title: recipeJsonLd.name || $('title').text().trim(),
            ingredients,
            steps,
            totalTime: recipeJsonLd.totalTime || recipeJsonLd.cookTime || '',
            servings: Number.parseInt(recipeJsonLd.recipeYield || '', 10) || undefined,
            difficulty: recipeJsonLd.recipeCategory || '',
            image: imageFallback || '',
            sourceName: new URL(url).hostname.replace('www.', ''),
            tags: Array.isArray(recipeJsonLd.keywords) ? recipeJsonLd.keywords :
                typeof recipeJsonLd.keywords === 'string' ? recipeJsonLd.keywords.split(',').map((k) => k.trim()) : []
        };
    }
    /**
     * Cache a parsed recipe in the DB.
     */
    async cacheRecipe(url, recipe) {
        try {
            await prisma.recipe.upsert({
                where: { sourceUrl: url },
                update: { parsedJson: JSON.stringify(recipe), parseStatus: 'parsed', parsedAt: new Date() },
                create: { sourceUrl: url, parsedJson: JSON.stringify(recipe), parseStatus: 'parsed', parsedAt: new Date() }
            });
        }
        catch (e) { /* ignore DB errors */ }
    }
    async parseUrl(url) {
        try {
            // Mock recipes
            const mockRecipe = mockRecipes_1.mockRecipes.find((recipe) => recipe.sourceUrl === url);
            if (mockRecipe)
                return (0, recipeTransforms_1.mockRecipeToParsedRecipe)(mockRecipe);
            // DB cache
            try {
                const existing = await prisma.recipe.findUnique({ where: { sourceUrl: url } });
                if (existing?.parseStatus === 'parsed' && existing.parsedJson) {
                    console.log(`[Recipe] DB cache hit for "${url}"`);
                    return JSON.parse(existing.parsedJson);
                }
            }
            catch (e) {
                console.error('[Recipe] DB cache check failed:', e);
            }
            // Fetch HTML
            const html = await this.fetchHtml(url, true);
            const { $, recipeJsonLd } = this.extractRecipeJsonLd(html);
            // Extract metadata from JSON-LD (for image, title, time, etc.)
            const imageFallback = recipeJsonLd
                ? (Array.isArray(recipeJsonLd.image) ? (recipeJsonLd.image[0]?.url || recipeJsonLd.image[0]) : (recipeJsonLd.image?.url || recipeJsonLd.image)) || ''
                : ($('meta[property="og:image"]').attr('content') || '');
            const titleFallback = recipeJsonLd?.name || $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || $('title').text().trim();
            const keywords = recipeJsonLd
                ? (Array.isArray(recipeJsonLd.keywords) ? recipeJsonLd.keywords : typeof recipeJsonLd.keywords === 'string' ? recipeJsonLd.keywords.split(',').map((k) => k.trim()) : [])
                : [];
            const metadata = {
                title: titleFallback,
                image: imageFallback,
                totalTime: recipeJsonLd?.totalTime || recipeJsonLd?.cookTime || '',
                servings: Number.parseInt(recipeJsonLd?.recipeYield || '', 10) || undefined,
                difficulty: recipeJsonLd?.recipeCategory || '',
                keywords
            };
            // === Strategy 1: Gemini AI extraction (primary — best quality) ===
            console.log('[Recipe] Starting Strategy 1: Gemini extraction');
            let geminiFailed = false;
            try {
                // Clean page text for AI
                console.log('[Recipe] Loading HTML into cheerio...');
                const $clean = cheerio.load(html);
                $clean('script, style, noscript, iframe, img, svg, video, audio, source, track, canvas, map, object, embed, footer, nav, aside, header, [class*="comment"], [class*="sidebar"], [id*="comment"], [id*="sidebar"]').remove();
                const cleanText = $clean('body').text().replace(/\s+/g, ' ').trim();
                console.log(`[Recipe] Clean text length: ${cleanText.length}`);
                if (cleanText.length > 100) {
                    const geminiRecipe = await this.extractWithGemini(cleanText, url, metadata);
                    if (geminiRecipe && geminiRecipe.ingredients.length >= 2 && geminiRecipe.steps.length >= 1) {
                        console.log(`[Recipe] Gemini extraction success: ${geminiRecipe.ingredients.length} ingredients, ${geminiRecipe.steps.length} steps`);
                        await this.cacheRecipe(url, geminiRecipe);
                        return geminiRecipe;
                    }
                    else {
                        console.log('[Recipe] Gemini returned insufficient data, will try fallback');
                        geminiFailed = true;
                    }
                }
                else {
                    console.log('[Recipe] Clean text too short, skipping Gemini');
                    geminiFailed = true;
                }
            }
            catch (geminiError) {
                console.log(`[Recipe] Gemini extraction failed: ${geminiError?.message}`);
                geminiFailed = true;
            }
            // === Strategy 1.5: Serper extraction (when Gemini fails) ===
            if (geminiFailed && env_1.env.serperApiKey) {
                console.log('[Recipe] Trying Strategy 1.5: Serper extraction');
                try {
                    const serperRecipe = await this.extractWithSerper(html, url, metadata);
                    if (serperRecipe && serperRecipe.ingredients.length >= 2 && serperRecipe.steps.length >= 1) {
                        console.log(`[Recipe] Serper extraction success: ${serperRecipe.ingredients.length} ingredients, ${serperRecipe.steps.length} steps`);
                        await this.cacheRecipe(url, serperRecipe);
                        return serperRecipe;
                    }
                }
                catch (serperError) {
                    console.log(`[Recipe] Serper extraction failed: ${serperError?.message}`);
                }
            }
            // === Strategy 2: JSON-LD structured data (free, no AI) ===
            if (recipeJsonLd) {
                const jsonLdRecipe = this.buildRecipeFromJsonLd($, recipeJsonLd, url);
                if (jsonLdRecipe && jsonLdRecipe.ingredients.length >= 2 && jsonLdRecipe.steps.length >= 1) {
                    console.log(`[Recipe] JSON-LD extraction: ${jsonLdRecipe.ingredients.length} ingredients, ${jsonLdRecipe.steps.length} steps`);
                    await this.cacheRecipe(url, jsonLdRecipe);
                    return jsonLdRecipe;
                }
            }
            // === Strategy 3: HTML heuristic scraping (free, no AI) ===
            const htmlRecipe = this.extractFromHtml($, url);
            if (htmlRecipe) {
                // Merge metadata
                htmlRecipe.totalTime = htmlRecipe.totalTime || metadata.totalTime;
                htmlRecipe.servings = htmlRecipe.servings || metadata.servings;
                htmlRecipe.difficulty = htmlRecipe.difficulty || metadata.difficulty;
                if (!htmlRecipe.image)
                    htmlRecipe.image = metadata.image;
                if (!htmlRecipe.title)
                    htmlRecipe.title = metadata.title;
                if (htmlRecipe.ingredients.length >= 2 || htmlRecipe.steps.length >= 1) {
                    console.log(`[Recipe] HTML heuristic: ${htmlRecipe.ingredients.length} ingredients, ${htmlRecipe.steps.length} steps`);
                    await this.cacheRecipe(url, htmlRecipe);
                    return htmlRecipe;
                }
            }
            throw new Error('לא הצלחנו לחלץ מתכון מהדף הזה. נסו כתובת אחרת.');
        }
        catch (error) {
            const msg = error?.message || 'Unknown error';
            console.error(`[Recipe] Failed to parse URL: ${url}`, error);
            if (msg.toLowerCase().includes('api key')) {
                throw new Error('שגיאה בהרשאות ה-API. וודא ש-GEMINI_API_KEY מוגדר כראוי.');
            }
            throw new Error(msg.startsWith('לא הצלחנו') ? msg : `נכשלנו לחלץ את המתכון מהכתובת הזו. שגיאה: ${msg}`);
        }
    }
}
exports.RecipeParserService = RecipeParserService;
