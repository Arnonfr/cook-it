const INGREDIENTS = [
    { id: 'tomato', name: 'עגבניה', image: 'assets/tomato.webp', category: 'vegetable' },
    { id: 'cucumber', name: 'מלפפון', image: 'assets/cucumber.webp', category: 'vegetable' },
    { id: 'onion', name: 'בצל', image: 'assets/onion.webp', category: 'vegetable' },
    { id: 'garlic', name: 'שום', image: 'assets/garlic.webp', category: 'vegetable' },
    { id: 'eggplant', name: 'חציל', image: 'assets/eggplant.webp', category: 'vegetable' },
    { id: 'chicken', name: 'עוף', image: 'assets/chicken.webp', category: 'meat' },
    { id: 'salmon', name: 'סלמון', image: 'assets/salmon.webp', category: 'fish' }
];

const RECIPES = [
    {
        id: 'israeli-salad',
        name: 'סלט ישראלי קצוץ',
        ingredients: ['tomato', 'cucumber', 'onion'],
        description: 'סלט רענן וצבעוני עם עגבניות, מלפפונים ובצל.',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80'
    },
    {
        id: 'roasted-chicken',
        name: 'עוף צלוי עם שום',
        ingredients: ['chicken', 'garlic'],
        description: 'עוף עסיסי בתנור עם המון שום ועשבי תיבול.',
        image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&q=80'
    },
    {
        id: 'moussaka',
        name: 'מוסקה חצילים',
        ingredients: ['eggplant', 'onion', 'garlic'],
        description: 'שכבות של חצילים קלויים עם רוטב עשיר.',
        image: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=800&q=80'
    },
    {
        id: 'garlic-salmon',
        name: 'סלמון בעשבי תיבול ושום',
        ingredients: ['salmon', 'garlic'],
        description: 'נתח סלמון עסיסי צרוב עם שום וחמאה.',
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80'
    }
];

let selectedIngredients = new Set();

// DOM Elements
const pantryGrid = document.getElementById('pantry-grid');
const kitchenGrid = document.getElementById('selected-ingredients');
const recipesGrid = document.getElementById('recipes-grid');
const recommendationsSection = document.getElementById('recommendations');
const searchInput = document.getElementById('ingredient-search');
const clearBtn = document.getElementById('clear-kitchen');
const themeToggle = document.getElementById('theme-toggle');
const emptyPlaceholder = document.getElementById('kitchen-empty-placeholder');

// Initialization
function init() {
    renderPantry();
    setupEventListeners();
    applyTheme();
}

function renderPantry(filter = '') {
    pantryGrid.innerHTML = '';
    INGREDIENTS
        .filter(ing => ing.name.includes(filter) || ing.id.includes(filter))
        .forEach(ing => {
            const card = createIngredientCard(ing, false);
            pantryGrid.appendChild(card);
        });
}

function createIngredientCard(ing, isSelected) {
    const card = document.createElement('div');
    card.className = `card ingredient-card fade-in ${isSelected ? 'selected' : ''}`;
    card.innerHTML = `
        <img src="${ing.image}" alt="${ing.name}" onerror="this.src='https://via.placeholder.com/200?text=${ing.id}'">
        <h3>${ing.name}</h3>
        <p style="font-size: 0.8rem;">${ing.category === 'vegetable' ? 'ירק' : (ing.category === 'meat' ? 'בשר' : 'דג')}</p>
    `;
    
    card.onclick = () => toggleIngredient(ing.id);
    return card;
}

function toggleIngredient(id) {
    if (selectedIngredients.has(id)) {
        selectedIngredients.delete(id);
    } else {
        selectedIngredients.add(id);
    }
    updateUI();
}

function updateUI() {
    // Update Kitchen
    kitchenGrid.innerHTML = '';
    if (selectedIngredients.size === 0) {
        kitchenGrid.appendChild(emptyPlaceholder);
        recommendationsSection.style.display = 'none';
    } else {
        selectedIngredients.forEach(id => {
            const ing = INGREDIENTS.find(i => i.id === id);
            const card = createIngredientCard(ing, true);
            kitchenGrid.appendChild(card);
        });
        updateRecommendations();
    }
}

function updateRecommendations() {
    const matchingRecipes = RECIPES.filter(recipe => 
        recipe.ingredients.some(needed => selectedIngredients.has(needed))
    );

    if (matchingRecipes.length > 0) {
        recommendationsSection.style.display = 'block';
        recipesGrid.innerHTML = '';
        matchingRecipes.forEach(recipe => {
            const matchCount = recipe.ingredients.filter(ing => selectedIngredients.has(ing)).length;
            const matchPercent = Math.round((matchCount / recipe.ingredients.length) * 100);
            
            const card = document.createElement('div');
            card.className = 'card fade-in';
            card.style.overflow = 'hidden';
            card.innerHTML = `
                <div style="height: 180px; background: url('${recipe.image}') center/cover;"></div>
                <div style="padding: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <h3 style="margin: 0;">${recipe.name}</h3>
                        <span style="background: var(--primary); color: white; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem;">${matchPercent}% התאמה</span>
                    </div>
                    <p style="font-size: 0.9rem; margin-bottom: 1rem;">${recipe.description}</p>
                    <button class="btn btn-primary" style="width: 100%; font-size: 0.9rem;">צפה במתכון</button>
                </div>
            `;
            recipesGrid.appendChild(card);
        });
        recommendationsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        recommendationsSection.style.display = 'none';
    }
}

function setupEventListeners() {
    searchInput.oninput = (e) => renderPantry(e.target.value);
    
    clearBtn.onclick = () => {
        selectedIngredients.clear();
        updateUI();
    };

    themeToggle.onclick = () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    };
}

function applyTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}

// Start
init();
