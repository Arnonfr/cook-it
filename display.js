function sanitizeText(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.textContent;
}

function sanitizeUrl(url) {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.toString();
    } catch (e) {
        console.error('Invalid URL:', e);
        return '#';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get('recipeData', (result) => {
        try {
            if (result.recipeData) {
                const recipe = JSON.parse(result.recipeData);
                
                if (!recipe || !recipe.title || !Array.isArray(recipe.ingredients) || 
                    !Array.isArray(recipe.instructions)) {
                    throw new Error('Invalid recipe data format');
                }
                
                document.querySelector('.page-title').textContent = sanitizeText(recipe.title);
                document.querySelector('.extraction-type').textContent = 
                    recipe.isAI ? 'מתכון מעובד\nבאמצעות Gemini' : 'מתכון ממוקד';
                
                const sourceUrl = document.getElementById('source-url');
                sourceUrl.href = sanitizeUrl(recipe.url);
                
                const ingredientsList = document.getElementById('ingredients-list');
                recipe.ingredients.forEach(ingredient => {
                    const li = document.createElement('li');
                    li.textContent = sanitizeText(ingredient);
                    ingredientsList.appendChild(li);
                });
                
                const instructionsList = document.getElementById('instructions-list');
                recipe.instructions.forEach(instruction => {
                    const li = document.createElement('li');
                    li.textContent = sanitizeText(instruction);
                    instructionsList.appendChild(li);
                });
            }
        } catch (error) {
            console.error('Error rendering recipe:', error);
            document.body.innerHTML = '<h1>שגיאה בטעינת המתכון</h1>';
        }
    });

    let currentSize = 18;
    const minSize = 12;
    const maxSize = 32;
    const content = document.querySelector('.recipe-content');

    document.getElementById('increaseText').addEventListener('click', () => {
        if (currentSize < maxSize) {
            currentSize += 2;
            content.style.fontSize = `${currentSize}px`;
        }
    });

    document.getElementById('decreaseText').addEventListener('click', () => {
        if (currentSize > minSize) {
            currentSize -= 2;
            content.style.fontSize = `${currentSize}px`;
        }
    });
});