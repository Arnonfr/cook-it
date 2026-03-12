import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env';
import type { ParsedRecipe, ParsedRecipeIngredient, ParsedRecipeStep } from '../utils/recipeTransforms';

const HEBREW_REGEX = /[\u0590-\u05FF]/;

const LANGUAGE_NAMES: Record<string, string> = {
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

export const getLanguageDisplayName = (code: string): string =>
    LANGUAGE_NAMES[code] || code;

export class TranslationService {
    private genAI: GoogleGenerativeAI | null;

    constructor() {
        this.genAI = env.geminiApiKey
            ? new GoogleGenerativeAI(env.geminiApiKey)
            : null;
    }

    isHebrew(text: string): boolean {
        return HEBREW_REGEX.test(text);
    }

    /**
     * Batch-translate non-Hebrew recipe titles to Hebrew and detect their language.
     * Skips already-Hebrew titles to save API calls.
     */
    async translateTitlesBatch(
        titles: string[]
    ): Promise<Array<{ hebrewTitle: string; originalLanguage: string }>> {
        const results = titles.map((t) => ({
            hebrewTitle: t,
            originalLanguage: this.isHebrew(t) ? 'he' : 'unknown',
        }));

        if (!this.genAI) return results;

        const nonHebrewIndices = results
            .map((r, i) => (r.originalLanguage !== 'he' ? i : -1))
            .filter((i) => i >= 0);

        if (nonHebrewIndices.length === 0) return results;

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
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
        } catch (error) {
            console.error('[Translation] Batch title translation failed:', error);
        }

        return results;
    }

    /**
     * Translate a full parsed recipe to Hebrew.
     * Returns the translated recipe while preserving the structure.
     */
    async translateFullRecipe(
        recipe: ParsedRecipe
    ): Promise<{ title: string; ingredients: ParsedRecipeIngredient[]; steps: ParsedRecipeStep[]; lang: string } | null> {
        if (!this.genAI) return null;

        try {
            const model = this.genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

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
        } catch (error) {
            console.error('[Translation] Full recipe translation failed:', error);
            return null;
        }
    }
}
