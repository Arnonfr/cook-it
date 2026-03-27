import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { env } from '../config/env';

const prisma = new PrismaClient();

export class IngredientImageService {
    private serperApiKey: string;

    constructor() {
        this.serperApiKey = env.serperApiKey || '';
    }

    private normalizeName(name: string): string {
        // Remove quantities, numbers, and common units to get a clean ingredient name
        return name.toLowerCase()
            .replace(/[0-9%/\\.,:;]/g, '')
            .replace(/(גרם|קילו|חבילה|כף|כפית|כוס|קורט|מיכל|קופסה|יחידה|יחידות|שקיק|צרור|גבעול|שיני|שין)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Detect if a string contains Hebrew characters
     */
    private isHebrew(text: string): boolean {
        return /[\u05D0-\u05EA]/.test(text);
    }

    /**
     * Map common Hebrew ingredient words to English for better image search results.
     * Falls back to a transliteration hint for unknown words.
     */
    private hebrewToEnglish(name: string): string {
        const dict: Record<string, string> = {
            'ביצה': 'egg', 'ביצים': 'eggs',
            'חלב': 'milk', 'חמאה': 'butter', 'שמנת': 'cream',
            'קמח': 'flour', 'סוכר': 'sugar', 'מלח': 'salt', 'פלפל': 'pepper',
            'שמן': 'oil', 'שמן זית': 'olive oil', 'חומץ': 'vinegar',
            'עגבנייה': 'tomato', 'עגבניות': 'tomatoes',
            'בצל': 'onion', 'בצלים': 'onions', 'שום': 'garlic',
            'גזר': 'carrot', 'גזרים': 'carrots', 'תפוח אדמה': 'potato',
            'תפוחי אדמה': 'potatoes', 'פטרייה': 'mushroom', 'פטריות': 'mushrooms',
            'עלי תרד': 'spinach', 'תרד': 'spinach', 'חסה': 'lettuce',
            'מלפפון': 'cucumber', 'פלפל אדום': 'red pepper', 'פלפל ירוק': 'green pepper',
            'לימון': 'lemon', 'תפוח': 'apple', 'תפוחים': 'apples',
            'בננה': 'banana', 'תות': 'strawberry', 'תותים': 'strawberries',
            'אורז': 'rice', 'פסטה': 'pasta', 'לחם': 'bread',
            'עוף': 'chicken', 'בשר': 'meat', 'דג': 'fish', 'דגים': 'fish',
            'סלמון': 'salmon', 'טונה': 'tuna',
            'גבינה': 'cheese', 'יוגורט': 'yogurt',
            'שוקולד': 'chocolate', 'וניל': 'vanilla', 'קינמון': 'cinnamon',
            'אגוז': 'walnut', 'אגוזים': 'walnuts', 'שקד': 'almond', 'שקדים': 'almonds',
            'דבש': 'honey', 'ריבה': 'jam', 'חלבה': 'halva',
            'שמן קוקוס': 'coconut oil', 'קוקוס': 'coconut',
            'כורכום': 'turmeric', 'פפריקה': 'paprika', 'כמון': 'cumin',
            'רוזמרין': 'rosemary', 'בזיליקום': 'basil', 'אורגנו': 'oregano',
            'מים': 'water', 'ציר': 'broth', 'יין': 'wine',
            "שוקולד צ'יפס": 'chocolate chips',
            'אבקת סוכר': 'powdered sugar',
            'סוכר חום כהה': 'dark brown sugar',
            'סוכר חום': 'brown sugar',
            'סוכר לבן': 'white sugar',
            'קמח תופח': 'self rising flour',
            'שמרים': 'yeast',
            'אבקת קקאו': 'cocoa powder',
            'שוקולד מריר': 'dark chocolate',
            'שוקולד חלב': 'milk chocolate',
            'גבינת שמנת': 'cream cheese',
            'שמנת חמוצה': 'sour cream',
            'שמנת מתוקה': 'heavy cream',
            'חמאה מומסת': 'melted butter',
            'שמן קנולה': 'canola oil',
            'שמן חמניות': 'sunflower oil',
            'מיץ לימון': 'lemon juice',
            'קליפת לימון': 'lemon zest',
            'תמצית וניל': 'vanilla extract',
            'אבקת אפייה': 'baking powder',
            'סודה לשתייה': 'baking soda',
            'סודה לשתיה': 'baking soda',
            'חמאה קרה': 'cold butter',
            'חלמון': 'egg yolk',
            'חלבון': 'egg white',
            'אגוז לוז': 'hazelnut',
            'אגוזי מלך': 'walnuts',
            'פיסטוק': 'pistachio',
            'פקאן': 'pecan',
            'קוקוס מגורד': 'shredded coconut',
            'חלב קוקוס': 'coconut milk',
            'תפוז': 'orange',
            'תפוזים': 'oranges',
            'שמן זית כתית': 'extra virgin olive oil',
            'גבינה צהובה': 'yellow cheese',
            'גבינה לבנה': 'white cheese',
            "גבינת קוטג'": 'cottage cheese',
            'ריקוטה': 'ricotta',
            'מוצרלה': 'mozzarella',
            'פרמזן': 'parmesan',
            'שמרי בירה': 'nutritional yeast',
            "ג'לטין": 'gelatin',
            'מיסו': 'miso paste',
            'טחינה': 'tahini',
            'חומוס': 'hummus',
            'עדשים': 'lentils',
            'שעועית': 'beans',
            'חומוס גרגרים': 'chickpeas',
            'קינואה': 'quinoa',
            'כוסמת': 'buckwheat',
        };

        // Try direct match first
        const lower = name.trim().toLowerCase();
        if (dict[lower]) return dict[lower];

        // Try partial match — find the longest key contained in the name
        let best = '';
        for (const [heb, eng] of Object.entries(dict)) {
            if (lower.includes(heb) && heb.length > best.length) {
                best = eng;
            }
        }
        if (best) return best;

        // Fallback: return original (untranslated — Serper handles some Hebrew)
        return name;
    }

    /**
     * Build an English-only image search query optimised for clean stock photography.
     * Hebrew ingredient names are translated to English first.
     */
    private buildImageQuery(name: string): string {
        const englishName = this.isHebrew(name) ? this.hebrewToEnglish(name) : name;
        return `${englishName} white background isolated food photography`;
    }

    /**
     * Score an image URL: prefer clean stock photo domains that reliably host
     * white-background isolated food images.
     */
    private scoreImageUrl(url: string): number {
        if (!url) return 0;
        const lower = url.toLowerCase();
        if (lower.includes('shutterstock.com')) return 10;
        if (lower.includes('istockphoto.com') || lower.includes('istock')) return 9;
        if (lower.includes('dreamstime.com')) return 8;
        if (lower.includes('freepik.com') || lower.includes('freepik')) return 7;
        if (lower.includes('depositphotos.com')) return 7;
        if (lower.includes('gettyimages.com') || lower.includes('getty')) return 6;
        if (lower.includes('adobestock.com') || lower.includes('adobe')) return 6;
        if (lower.includes('alamy.com')) return 5;
        if (lower.includes('.png')) return 3; // PNG is likely transparent/white bg
        return 1;
    }

    async getImagesForIngredients(names: string[]): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        
        // Map original name to its normalized version
        const normalizedToOriginals: Record<string, string[]> = {};

        for (const name of names) {
            const normalized = this.normalizeName(name);
            if (!normalized) continue;
            
            if (!normalizedToOriginals[normalized]) {
                normalizedToOriginals[normalized] = [];
            }
            normalizedToOriginals[normalized].push(name);
        }

        const normalizedNames = Object.keys(normalizedToOriginals);
        if (normalizedNames.length === 0) return {};

        // 1. Check DB for existing images
        const cachedImages = await prisma.ingredientImage.findMany({
            where: { name: { in: normalizedNames } }
        });

        const foundNormalized = new Set<string>();
        cachedImages.forEach((img) => {
            foundNormalized.add(img.name);
            // Map the cached URL to all original names that resolve to this normalized name
            const originals = normalizedToOriginals[img.name] || [];
            originals.forEach(orig => {
                results[orig] = img.imageUrl;
            });
        });

        // 2. Fetch missing images from Serper if possible
        const missingNormalized = normalizedNames.filter(n => !foundNormalized.has(n));
        
        if (missingNormalized.length > 0 && this.serperApiKey) {
            console.log(`[Images] Fetching ${missingNormalized.length} missing ingredient images from Serper...`);
            
            for (const name of missingNormalized) {
                try {
                    const searchRes = await axios.post(
                        'https://google.serper.dev/images',
                        { q: this.buildImageQuery(name), num: 10 },
                        {
                            headers: { 'X-API-KEY': this.serperApiKey },
                            timeout: 5000
                        }
                    );

                    const images: any[] = (searchRes.data as any).images || [];
                    // Score each image and pick the best match (stock photo domain + PNG preferred)
                    const scored = images
                        .filter(img => img.imageUrl)
                        .map(img => ({ url: img.imageUrl as string, score: this.scoreImageUrl(img.imageUrl) }))
                        .sort((a, b) => b.score - a.score);
                    const imageUrl = scored[0]?.url;
                    if (imageUrl) {
                        // Store in DB
                        await prisma.ingredientImage.upsert({
                            where: { name },
                            update: { imageUrl },
                            create: { name, imageUrl }
                        });

                        // Map to original names
                        const originals = normalizedToOriginals[name] || [];
                        originals.forEach(orig => {
                            results[orig] = imageUrl;
                        });
                    } else {
                        throw new Error('No images found');
                    }
                } catch (err) {
                    console.error(`[Images] Failed to fetch image for ${name}:`, (err as Error).message);
                    // Fallback to local path just in case
                    const fallbackUrl = `/ingredients/${encodeURIComponent(name)}.png`;
                    const originals = normalizedToOriginals[name] || [];
                    originals.forEach(orig => {
                        results[orig] = fallbackUrl;
                    });
                }
            }
        } else {
            // Fill remaining missing with fallback
            missingNormalized.forEach(name => {
                const fallbackUrl = `/ingredients/${encodeURIComponent(name)}.png`;
                const originals = normalizedToOriginals[name] || [];
                originals.forEach(orig => {
                    results[orig] = fallbackUrl;
                });
            });
        }

        return results;
    }

    async triggerLazyGeneration(names: string[]): Promise<void> {
        // Just call getImagesForIngredients without awaiting it fully in the route
        // This will populate the cache for future requests
        this.getImagesForIngredients(names).catch(err => {
            console.error('[Images] Lazy generation background task failed:', err);
        });
    }

    async getImagesForSteps(steps: string[]): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        
        if (steps.length === 0) return {};

        // 1. Check DB for existing images
        const cachedImages = await prisma.stepImage.findMany({
            where: { stepText: { in: steps } }
        });

        const foundSteps = new Set<string>();
        cachedImages.forEach((img) => {
            foundSteps.add(img.stepText);
            results[img.stepText] = img.imageUrl;
        });

        // 2. Fetch missing images from Serper if possible
        const missingSteps = steps.filter(s => !foundSteps.has(s));
        
        if (missingSteps.length > 0 && this.serperApiKey) {
            console.log(`[Images] Fetching ${missingSteps.length} missing step images from Serper...`);
            
            for (const step of missingSteps) {
                try {
                    // Create a cleaner search query from the step text
                    // We take the first 100 chars or first sentence
                    const searchQuery = step.split(/[.!]/)[0].substring(0, 100);
                    
                    const searchRes = await axios.post(
                        'https://google.serper.dev/images',
                        { q: `${searchQuery} cooking process`, num: 1 },
                        { 
                            headers: { 'X-API-KEY': this.serperApiKey },
                            timeout: 5000 
                        }
                    );

                    const imageUrl = (searchRes.data as any).images?.[0]?.imageUrl;
                    if (imageUrl) {
                        // Store in DB
                        await prisma.stepImage.upsert({
                            where: { stepText: step },
                            update: { imageUrl },
                            create: { stepText: step, imageUrl }
                        });

                        results[step] = imageUrl;
                    }
                } catch (err) {
                    console.error(`[Images] Failed to fetch image for step:`, (err as Error).message);
                }
            }
        }

        return results;
    }

    async getInventory(): Promise<any[]> {
        return await prisma.ingredientImage.findMany({
            orderBy: { name: 'asc' }
        });
    }
}
