"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranslationService = exports.getLanguageDisplayName = void 0;
const generative_ai_1 = require("@google/generative-ai");
const env_1 = require("../config/env");
const HEBREW_REGEX = /[\u0590-\u05FF]/;
const LANGUAGE_NAMES = {
    en: 'אנגלית',
    fr: 'צרפתית',
    de: 'גרמנית',
    es: 'ספרדית',
    it: 'איטלקית',
    pt: 'פורטוגזית',
    ar: 'ערבית',
    ru: 'רוסית',
    tr: 'טורקית',
    ja: 'יפנית',
    zh: 'סינית',
    ko: 'קוריאנית',
    nl: 'הולנדית',
    pl: 'פולנית',
    sv: 'שוודית',
    th: 'תאילנדית',
};
const getLanguageDisplayName = (code) => LANGUAGE_NAMES[code] || code;
exports.getLanguageDisplayName = getLanguageDisplayName;
class TranslationService {
    // Returns a fresh client using the current key (supports runtime key updates via settings endpoint)
    getGenAI() {
        return env_1.env.geminiApiKey ? new generative_ai_1.GoogleGenerativeAI(env_1.env.geminiApiKey) : null;
    }
    isHebrew(text) {
        return HEBREW_REGEX.test(text);
    }
    /**
     * Batch-translate non-Hebrew recipe titles to Hebrew and detect their language.
     * Skips already-Hebrew titles to save API calls.
     */
    async translateTitlesBatch(titles) {
        const results = titles.map((t) => ({
            hebrewTitle: t,
            originalLanguage: this.isHebrew(t) ? 'he' : 'unknown',
        }));
        const genAI = this.getGenAI();
        if (!genAI)
            return results;
        const nonHebrewIndices = results
            .map((r, i) => (r.originalLanguage !== 'he' ? i : -1))
            .filter((i) => i >= 0);
        if (nonHebrewIndices.length === 0)
            return results;
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
            const titlesToTranslate = nonHebrewIndices.map((i) => titles[i]);
            const prompt = `Translate these recipe titles to Hebrew and detect their original language.
Input: ${JSON.stringify(titlesToTranslate)}

Respond ONLY with a JSON array: [{"hebrew":"...","lang":"en"}]
Use ISO 639-1 codes. Keep proper nouns.`;
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                },
            });
            const parsed = JSON.parse(result.response.text());
            nonHebrewIndices.forEach((origIdx, batchIdx) => {
                if (parsed[batchIdx]) {
                    results[origIdx] = {
                        hebrewTitle: parsed[batchIdx].hebrew || titles[origIdx],
                        originalLanguage: parsed[batchIdx].lang || 'unknown',
                    };
                }
            });
        }
        catch (error) {
            console.error('[Translation] Batch title translation failed:', error);
        }
        return results;
    }
    /**
     * Translate a full parsed recipe to Hebrew.
     * Returns the translated recipe while preserving the structure.
     */
    async translateFullRecipe(recipe) {
        const genAI = this.getGenAI();
        if (!genAI)
            return null;
        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
            const compact = {
                title: recipe.title,
                ingredients: recipe.ingredients.map((i) => ({
                    id: i.id,
                    name: i.name,
                    quantity: i.quantity,
                    unit: i.unit,
                    originalSpec: i.originalSpec,
                    section: i.section,
                })),
                steps: recipe.steps.map((s) => ({
                    stepNumber: s.stepNumber,
                    text: s.text,
                    ingredientIds: s.ingredientIds,
                    section: s.section,
                })),
            };
            const prompt = `Translate this recipe to Hebrew. Keep the exact same JSON structure.
Translate: title, ingredient names, ingredient originalSpec, step texts, section names.
Keep numbers, quantities, units, IDs, and arrays unchanged.
Also detect the original language.

${JSON.stringify(compact)}

Respond ONLY with JSON: {"lang":"en","title":"...","ingredients":[...],"steps":[...]}`;
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.1,
                },
            });
            return JSON.parse(result.response.text());
        }
        catch (error) {
            console.error('[Translation] Full recipe translation failed:', error);
            return null;
        }
    }
}
exports.TranslationService = TranslationService;
