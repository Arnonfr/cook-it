"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockRecipeToParsedRecipe = exports.mockRecipeToSearchResult = exports.parseIngredientLine = void 0;
function ingredientMentionedInStep(ingName, stepText) {
    if (!ingName || !stepText)
        return false;
    if (stepText.includes(ingName))
        return true;
    const cleanName = ingName.replace(/^(ה|ב|ל|מ|כ)/, '');
    if (cleanName.length > 2 && stepText.includes(cleanName))
        return true;
    const words = ingName.split(/\s+/).filter(w => w.length > 2);
    return words.some(word => {
        if (stepText.includes(word))
            return true;
        const cleanWord = word.replace(/^(ה|ב|ל|מ|כ)/, '');
        return cleanWord.length > 2 && stepText.includes(cleanWord);
    });
}
const parseIngredientLine = (line, id) => {
    const match = line.match(/^([\d./]+)?\s*([^\s\d]+)?\s+(.*)$/u);
    return {
        id,
        quantity: match?.[1] ?? '',
        unit: match?.[2] ?? '',
        name: match?.[3]?.trim() ?? line.trim(),
        originalSpec: line
    };
};
exports.parseIngredientLine = parseIngredientLine;
const mockRecipeToSearchResult = (recipe) => ({
    sourceUrl: recipe.sourceUrl,
    title: recipe.title,
    image: recipe.image,
    totalTime: recipe.totalTime,
    servings: recipe.servings,
    ingredientsPreview: recipe.ingredientsPreview,
    sourceName: recipe.sourceName,
    difficulty: recipe.difficulty,
    tags: recipe.tags
});
exports.mockRecipeToSearchResult = mockRecipeToSearchResult;
const mockRecipeToParsedRecipe = (recipe) => {
    const ingredients = recipe.ingredients.map((item, index) => {
        const line = typeof item === 'string' ? item : item.text;
        const section = typeof item === 'string' ? undefined : item.section;
        return { ...(0, exports.parseIngredientLine)(line, index + 1), section };
    });
    const steps = recipe.steps.map((item, index) => {
        const text = typeof item === 'string' ? item : item.text;
        const section = typeof item === 'string' ? undefined : item.section;
        const ingredientIds = ingredients
            .filter(ing => ingredientMentionedInStep(ing.name, text))
            .map(ing => ing.id);
        return { stepNumber: index + 1, text, ingredientIds, section };
    });
    return {
        title: recipe.title,
        ingredients,
        steps,
        totalTime: recipe.totalTime,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        image: recipe.image,
        sourceName: recipe.sourceName,
        tags: recipe.tags
    };
};
exports.mockRecipeToParsedRecipe = mockRecipeToParsedRecipe;
