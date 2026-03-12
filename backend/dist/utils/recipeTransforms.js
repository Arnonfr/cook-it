"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockRecipeToParsedRecipe = exports.mockRecipeToSearchResult = exports.parseIngredientLine = void 0;
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
    const ingredients = recipe.ingredients.map((line, index) => (0, exports.parseIngredientLine)(line, index + 1));
    const steps = recipe.steps.map((text, index) => {
        const ingredientIds = ingredients
            .filter((ingredient) => {
            const cleanName = ingredient.name.replace(/^(ה|ב|ל|מ|כ)/, '');
            return text.includes(ingredient.name) || text.includes(cleanName);
        })
            .map((ingredient) => ingredient.id);
        return {
            stepNumber: index + 1,
            text,
            ingredientIds
        };
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
