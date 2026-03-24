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
    // Returns a fresh client using the current key (supports runtime key updates via settings endpoint)
    private getGenAI(): GoogleGenerativeAI | null {
        return env.geminiApiKey ? new GoogleGenerativeAI(env.geminiApiKey) : null;
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

        const genAI = this.getGenAI();
        if (!genAI) return results;

        const nonHebrewIndices = results
            .map((r, i) => (r.originalLanguage !== 'he' ? i : -1))
            .filter((i) => i >= 0);

        if (nonHebrewIndices.length === 0) return results;

        try {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
            const titlesToTranslate = nonHebrewIndices.map((i) => titles[i]);

            const prompt = `Translate these recipe titles to Hebrew (עברית). Output MUST be in Hebrew, not English.
Input titles: ${JSON.stringify(titlesToTranslate)}

Respond ONLY with a JSON array where "hebrew" contains the Hebrew translation:
[{"hebrew":"<HEBREW TITLE>","lang":"<original_lang_code>"}]
Use ISO 639-1 language codes. Translate proper nouns too.`;

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
        const genAI = this.getGenAI();
        if (!genAI) return null;

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

            const prompt = `You MUST translate ALL text fields to Hebrew (עברית). Do NOT keep any English or other language text in the output.

Translate: title, ingredient names, ingredient originalSpec, step texts, section names.
Keep numbers, quantities, units, IDs, and array structure UNCHANGED.
Detect the original language code (e.g. "en", "fr").

Input recipe:
${JSON.stringify(compact)}

Respond ONLY with valid JSON matching this structure exactly:
{"lang":"<original_lang_code>","title":"<HEBREW TITLE>","ingredients":[...],"steps":[...]}`;

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
