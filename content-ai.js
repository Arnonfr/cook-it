async function extractAndSendRecipe() {
    try {
        const pageText = document.body.innerText.trim();
        if (!pageText) {
            throw new Error('לא נמצא תוכן בדף');
        }

        const recipeData = {
            text: pageText,
            title: document.title.trim(),
            url: window.location.href,
            isAI: true
        };

        const response = await fetch('https://recipe01.onrender.com/recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.data && 
            Array.isArray(data.data.ingredients) && 
            Array.isArray(data.data.instructions)) {
            
            const finalData = {
                ...data.data,
                isAI: true
            };
            
            await chrome.storage.local.set({ 'recipeData': JSON.stringify(finalData) });
            window.open(chrome.runtime.getURL('display.html'), '_blank');
        } else {
            throw new Error('Invalid server response format');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('שגיאה בחילוץ המתכון. אנא נסו שוב.');
    }
}

window.extractAndSendRecipe = extractAndSendRecipe;