function validateRecipe(recipe) {
    if (!recipe || typeof recipe !== 'object') return false;
    if (!recipe.title || typeof recipe.title !== 'string') return false;
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) return false;
    if (!Array.isArray(recipe.instructions) || recipe.instructions.length === 0) return false;
    if (!recipe.url || !recipe.url.startsWith('http')) return false;
    
    return recipe.ingredients.every(i => typeof i === 'string' && i.trim().length > 0) &&
           recipe.instructions.every(i => typeof i === 'string' && i.trim().length > 0);
}

function sanitizeText(text) {
    return text.trim()
        .replace(/[<>]/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
}

function extractFoodyRecipe() {
    console.log('Extracting from Foody');
    let recipeTitle = '';
    let ingredientsList = [];
    let instructionsList = [];

    const titleElement = document.querySelector('h1');
    if (titleElement) recipeTitle = sanitizeText(titleElement.textContent);

    const ingredients = document.querySelector('#recipe-ingredients');
    if (ingredients) {
        const tempIngredientsSet = new Set();
        ingredients.querySelectorAll('li').forEach(item => {
            const text = sanitizeText(item.textContent);
            if (text && !tempIngredientsSet.has(text)) {
                tempIngredientsSet.add(text);
                ingredientsList.push(text);
            }
        });
    }

    const instructions = document.querySelector('.recipe-content');
    if (instructions) {
        const tempInstructionsSet = new Set();
        instructions.querySelectorAll('p, li').forEach(item => {
            const text = sanitizeText(item.textContent);
            if (text && !text.includes('קרדיט') && 
                !text.includes('צילום:') && 
                !text.includes('חוזר') &&
                !text.includes('מתפרסם') &&
                !tempInstructionsSet.has(text)) {
                tempInstructionsSet.add(text);
                instructionsList.push(text);
            }
        });
    }

    return {
        title: recipeTitle,
        ingredients: ingredientsList,
        instructions: instructionsList,
        url: window.location.href,
        isAI: false
    };
}

function extractLocally() {
    try {
        console.log('Starting local extraction');
        const isFoody = window.location.hostname.includes('foody.co.il');
        let recipe;
        
        if (isFoody) {
            recipe = extractFoodyRecipe();
        } else {
            throw new Error('אתר לא נתמך כרגע');
        }

        if (!validateRecipe(recipe)) {
            throw new Error('לא הצלחנו לחלץ את המתכון כראוי');
        }

        chrome.storage.local.set({ 'recipeData': JSON.stringify(recipe) }, () => {
            window.open(chrome.runtime.getURL('display.html'), '_blank');
        });

    } catch (error) {
        console.error('Error in local extraction:', error);
        alert(error.message || 'לא הצלחנו לחלץ את המתכון כראוי. אנא נסו שוב.');
    }
}