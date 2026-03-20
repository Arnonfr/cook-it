# אסטרטגיות לצמצום עלויות - Cookit

## 1. אופטימיזציית API Calls

### Serper.dev
```typescript
// לפני - בזבוזני
const hebrewSearch = await serper.search("פסטה מתכון");
const englishSearch = await serper.search("pasta recipe");

// אחרי - ממורז ויעיל
const results = await Promise.all([
    serper.search("פסטה מתכון", { num: 10 }), // מספיק 10, לא 30
    serper.search("pasta recipe", { num: 5 })  // פחות באנגלית
]);
```

### Gemini - בחירת מודל נכונה
```typescript
// החלף את המודלים היקרים בזולים יותר
const MODELS = {
    extraction: 'gemini-2.5-flash-lite',  // במקום 3.1-flash
    translation: 'gemini-2.5-flash-lite', // במקום 3.1-flash-lite
};

// חיסכון: ~60% בעלויות AI
```

## 2. מערכת קאש מתקדמת

### Redis Cache (למערכת גדולה)
```typescript
// קאש רב-שכבתי
const CACHE_TTL = {
    search: 60 * 60 * 24,     // 24 שעות
    images: 60 * 60 * 24 * 7, // שבוע
    parse: 60 * 60 * 24 * 30, // חודש
};

// Cache warming - טעינה מראש של חיפושים פופולריים
const POPULAR_SEARCHES = ['פסטה', 'עוגת שוקולד', 'סלט', 'מרק'];
```

### SQLite Cache (למערכת קטנה)
```typescript
// שמירה לוקאלית לחסכון בקריאות API
await db.searchCache.create({
    query: normalizedQuery,
    results: JSON.stringify(results),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
});
```

## 3. Fallback חכם

### מעבר אוטומטי בין מקורות
```typescript
async function searchWithFallback(query: string) {
    // 1. קאש ראשון
    const cached = await getFromCache(query);
    if (cached) return cached;
    
    // 2. Serper (אם יש credits)
    if (serperCredits > 0) {
        return await serper.search(query);
    }
    
    // 3. DuckDuckGo (חינם!)
    return await duckDuckGo.search(query);
}
```

### DuckDuckGo - חינם לגמרי
```typescript
// חילוץ מ-DuckDuckGo ללא עלות
const ddgrResults = await fetch(
    'https://html.duckduckgo.com/html/?q=pasta+recipe'
);
// חיסכון: 100% על חיפושים בסיסיים
```

## 4. תמונות - אופטימיזציה

### Lazy Loading
```typescript
// טעינת תמונות רק כשצריך
const loadIngredientImages = async (ingredients: string[]) => {
    // טען רק את ה-4 מרכיבים הראשונים שמופיעים במסך
    const visible = ingredients.slice(0, 4);
    return await fetchImages(visible);
};
```

### Unsplash API (חינם!)
```typescript
// תמונות חינם מ-Unsplash במקום Serper
const getFreeImage = async (query: string) => {
    const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=1`
    );
    return res.results[0]?.urls.small;
};
// חיסכון: 100% על תמונות מרכיבים
```

## 5. תרגום - אופטימיזציה

### תרגום רק כשצריך
```typescript
const translateIfNeeded = async (recipe: Recipe) => {
    // בדוק אם כבר בעברית
    if (isHebrew(recipe.title)) return recipe;
    
    // בדוק אם יש תרגום בקאש
    const cached = await getTranslationCache(recipe.sourceUrl);
    if (cached) return cached;
    
    // תרגם רק אם חייבים
    return await translateRecipe(recipe);
};
```

### תרגום batch
```typescript
// תרגום 10 כותרות בבת אחת במקום 10 קריאות נפרדות
const translateTitles = async (titles: string[]) => {
    const prompt = `Translate these titles: ${JSON.stringify(titles)}`;
    return await gemini.generate(prompt); // 1 call ל-10 titles
};
// חיסכון: 90% על תרגום כותרות
```

## 6. מערכת Rate Limiting

### הגבלת משתמשים
```typescript
const RATE_LIMITS = {
    free: { searches: 10, per: 'hour' },
    premium: { searches: 100, per: 'hour' },
};

// מניעת שימוש מופרז
if (user.searchesThisHour > RATE_LIMITS[user.tier].searches) {
    return { error: 'הגעת למגבלת החיפושים' };
}
```

## 7. טכניקות נוספות

### Pre-fetching חכם
```typescript
// טען מראש את החיפושים הנפוצים בשעות שקטות
const prefetchPopular = async () => {
    const popular = await getTrendingSearches();
    for (const query of popular) {
        await searchWithCache(query); // יתווסף לקאש
    }
};
// הרץ ב-cron job כל 6 שעות
```

### דחיסת נתונים
```typescript
// שלח נתונים דחוסים מהשרת
const compressed = await gzip(JSON.stringify(results));
// חיסכון: ~70% ב-bandwidth
```

### Client-side caching
```typescript
// IndexedDB בדפדפן
const cacheInBrowser = async (key: string, data: any) => {
    const db = await openDB('CookitCache', 1);
    await db.put('searches', data, key);
};
// פחות קריאות לשרת = פחות עלויות
```

## סיכום חיסכון

| אסטרטגיה | חיסכון משוער |
|----------|-------------|
| שימוש ב-Flash-Lite | 60% |
| קאש מתקדם | 40% |
| DuckDuckGo fallback | 30% |
| Unsplash תמונות | 100% על תמונות |
| Batch translation | 90% על תרגום |
| Rate limiting | 20% |
| **סה"כ פוטנציאלי** | **~70%** |

## יישום מיידי

### שלב 1: שינויים מהירים (היום)
1. החלף ל-Gemini 2.5 Flash-Lite
2. הגבל חיפושים ל-10 תוצאות
3. הוסף קאש SQLite

### שלב 2: שיפורים (השבוע)
1. הוסף DuckDuckGo fallback
2. מעבר ל-Unsplash לתמונות
3. Batch translation

### שלב 3: אופטימיזציה מתקדמת (החודש)
1. Redis cache
2. Prefetching
3. Client-side caching
