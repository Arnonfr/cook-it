import { Router } from 'express';
import { GoogleSearchService } from '../services/GoogleSearchService';
import { RecipeParserService } from '../services/RecipeParserService';
import { IngredientImageService } from '../services/IngredientImageService';
import { TranslationService } from '../services/TranslationService';
import { PrismaClient } from '@prisma/client';
import { mockRecipes } from '../data/mockRecipes';
import { mockRecipeToSearchResult } from '../utils/recipeTransforms';

const router = Router();
const searchService = new GoogleSearchService();
const parserService = new RecipeParserService();
const imageService = new IngredientImageService();
const translationService = new TranslationService();
const prisma = new PrismaClient();

// GET /api/ingredients/images?names=apple,sugar
router.get('/ingredients/images', async (req, res) => {
    try {
        const namesStr = req.query.names as string;
        if (!namesStr) {
            return res.status(400).json({ error: 'names query parameter is required' });
        }
        const names = namesStr.split(',').map(n => n.trim()).filter(Boolean);
        const images = await imageService.getImagesForIngredients(names);
        res.json({ images });
    } catch (error) {
        console.error('Failed to fetch ingredient images:', error);
        res.status(500).json({ error: 'Failed to fetch ingredient images' });
    }
});

// GET /api/steps/images?texts=step1,step2
router.get('/steps/images', async (req, res) => {
    try {
        const textsStr = req.query.texts as string;
        if (!textsStr) {
            return res.status(400).json({ error: 'texts query parameter is required' });
        }
        const steps = textsStr.split('|||').map(n => n.trim()).filter(Boolean);
        const images = await imageService.getImagesForSteps(steps);
        res.json({ images });
    } catch (error) {
        console.error('Failed to fetch step images:', error);
        res.status(500).json({ error: 'Failed to fetch step images' });
    }
});

// GET /api/ingredients/inventory - list what we have
router.get('/ingredients/inventory', async (req, res) => {
    try {
        const inventory = await imageService.getInventory();
        res.json({ 
            count: inventory.length,
            items: inventory 
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// GET /api/recipes/featured - Featured recipes for home screen
router.get('/recipes/featured', async (_req, res) => {
    try {
        const featuredRecipes = mockRecipes.slice(0, 6).map(r => mockRecipeToSearchResult(r));
        res.json({ recipes: featuredRecipes });
    } catch (error) {
        console.error('Failed to fetch featured recipes:', error);
        res.status(500).json({ error: 'Failed to fetch featured recipes' });
    }
});

// GET /api/catalog - returns all built-in recipes (no API calls)
router.get('/catalog', async (_req, res) => {
    try {
        // Combine mock recipes with any DB-saved recipes
        const catalogResults = mockRecipes.map(r => mockRecipeToSearchResult(r));

        let dbRecipes: any[] = [];
        try {
            const recipes = await prisma.recipe.findMany({
                where: { parseStatus: 'parsed' },
                orderBy: { parsedAt: 'desc' },
                take: 50
            });
            dbRecipes = recipes.map(r => {
                const parsed = JSON.parse(r.parsedJson || '{}');
                return {
                    sourceUrl: r.sourceUrl,
                    title: parsed.title || 'ללא שם',
                    image: parsed.image,
                    totalTime: parsed.totalTime,
                    servings: parsed.servings,
                    ingredientsPreview: parsed.ingredients?.slice(0, 4).map((i: any) => i.originalSpec || i.name) || [],
                    sourceName: parsed.sourceName,
                    difficulty: parsed.difficulty,
                    tags: parsed.tags || []
                };
            });
        } catch (dbError) {
            // DB may not be available, that's ok
        }

        // Merge: DB recipes first (real ones), then mock catalog
        const seen = new Set(dbRecipes.map(r => r.sourceUrl));
        const combined = [
            ...dbRecipes,
            ...catalogResults.filter(r => !seen.has(r.sourceUrl))
        ];

        res.json({ recipes: combined });
    } catch (error) {
        console.error('Failed to fetch catalog:', error);
        res.status(500).json({ error: 'Failed to fetch catalog' });
    }
});

// GET /api/search/unified?q=&userId=
// Returns { local, web, webTotal } — parallel local + web search with translation
router.get('/search/unified', async (req, res) => {
    try {
        const q = req.query.q as string;
        const userId = req.query.userId as string;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        // Run local and web search in parallel
        const [localSettled, webSettled] = await Promise.allSettled([
            searchService.searchLocal(q),
            searchService.searchRecipes(q)
        ]);

        const local = localSettled.status === 'fulfilled' ? localSettled.value : [];
        const web = webSettled.status === 'fulfilled' ? webSettled.value : [];

        // Remove from web any results already in local (dedup by sourceUrl)
        const localUrls = new Set(local.map(r => r.sourceUrl));
        const dedupedWeb = web.filter(r => !localUrls.has(r.sourceUrl));

        // Mark isMine for user's saved recipes
        if (userId) {
            try {
                const savedRecipes = await prisma.savedRecipe.findMany({
                    where: { userId },
                    select: { recipe: { select: { sourceUrl: true } } }
                });
                const savedUrls = new Set(savedRecipes.map(s => s.recipe.sourceUrl));
                for (const r of local) r.isMine = savedUrls.has(r.sourceUrl);
                for (const r of dedupedWeb) r.isMine = savedUrls.has(r.sourceUrl);
            } catch {}
        }

        // Title translation removed from search for speed.
        // Titles are translated when the full recipe is extracted.

        res.json({
            local,
            web: dedupedWeb,
            webTotal: dedupedWeb.length
        });
    } catch (error) {
        console.error('[Search] Unified search failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/enrich?url= — Quick summary for search card previews (no AI, DB cache first)
router.get('/enrich', async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).json({ error: 'url required' });

    try {
        // 1. Check DB cache — instant return if already parsed
        const cached = await prisma.recipe.findUnique({ where: { sourceUrl: url } });
        if (cached?.parsedJson && cached.parseStatus === 'parsed') {
            const parsed = JSON.parse(cached.parsedJson);
            let ingredients = parsed.ingredients?.slice(0, 5).map((i: any) => i.originalSpec || i.name) || [];
            // Prefer translated ingredients if available and Hebrew
            if (cached.translatedJson) {
                try {
                    const trans = JSON.parse(cached.translatedJson);
                    if (trans.title && /[\u0590-\u05FF]/.test(trans.title)) {
                        ingredients = trans.ingredients?.slice(0, 5).map((i: any) => i.originalSpec || i.name) || ingredients;
                    }
                } catch {}
            }
            return res.json({
                image: parsed.image,
                ingredientsPreview: ingredients,
                totalTime: parsed.totalTime,
                servings: parsed.servings,
                cached: true
            });
        }

        // 2. Quick fetch + JSON-LD extraction (no AI, 6s timeout)
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        let html = '';
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'he,en;q=0.9',
                }
            });
            clearTimeout(timer);
            if (!response.ok) return res.json({});
            html = await response.text();
        } catch {
            clearTimeout(timer);
            return res.json({});
        }

        // Try JSON-LD
        const ldMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
        if (ldMatch) {
            try {
                let ld = JSON.parse(ldMatch[1]);
                if (Array.isArray(ld)) ld = ld.find((x: any) => x?.['@type'] === 'Recipe' || (Array.isArray(x?.['@type']) && x['@type'].includes('Recipe')));
                if (ld?.['@type'] === 'Recipe' || (Array.isArray(ld?.['@type']) && ld['@type'].includes('Recipe'))) {
                    const imgRaw = ld.image;
                    const image = Array.isArray(imgRaw) ? (typeof imgRaw[0] === 'string' ? imgRaw[0] : imgRaw[0]?.url)
                        : (typeof imgRaw === 'string' ? imgRaw : imgRaw?.url);
                    const totalTime = ld.totalTime || ld.cookTime;
                    const servings = parseInt(String(ld.recipeYield || '')) || undefined;
                    const ingredients: string[] = Array.isArray(ld.recipeIngredient) ? ld.recipeIngredient.slice(0, 5) : [];
                    return res.json({ image, ingredientsPreview: ingredients, totalTime, servings });
                }
            } catch {}
        }

        // og:image fallback
        const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
            ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];
        return res.json({ image: ogImage });

    } catch {
        return res.json({});
    }
});

// GET /api/search?q=lasagna
router.get('/search', async (req, res) => {
    try {
        const q = req.query.q as string;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = await searchService.searchRecipes(q);
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// GET /api/parse?url=&userId=
router.get('/parse', async (req, res) => {
    try {
        const url = req.query.url as string;
        const userId = req.query.userId as string;

        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }

        // Check DB cache first — if recipe was already extracted, return immediately
        try {
            const cached = await prisma.recipe.findUnique({ where: { sourceUrl: url } });
            if (cached?.parsedJson && cached.parseStatus === 'parsed') {
                const parsedRecipe = JSON.parse(cached.parsedJson);
                let finalRecipe = parsedRecipe;

                // Apply stored translation if available and Hebrew
                if (cached.translatedJson) {
                    const translation = JSON.parse(cached.translatedJson);
                    if (translation.title && translationService.isHebrew(translation.title)) {
                        finalRecipe = {
                            ...parsedRecipe,
                            title: translation.title,
                            ingredients: translation.ingredients || parsedRecipe.ingredients,
                            steps: translation.steps || parsedRecipe.steps,
                            originalTitle: parsedRecipe.title,
                            originalLanguage: cached.originalLanguage || 'en',
                            originalRecipe: {
                                title: parsedRecipe.title,
                                ingredients: parsedRecipe.ingredients,
                                steps: parsedRecipe.steps
                            }
                        };
                    }
                }

                // Still link to user if userId provided
                if (userId) {
                    try {
                        let user = await prisma.user.findUnique({ where: { id: userId } });
                        if (!user) {
                            user = await prisma.user.create({ data: { id: userId, email: `user-${userId}@example.com` } });
                        }
                        await prisma.savedRecipe.upsert({
                            where: { userId_recipeId: { userId, recipeId: cached.id } },
                            update: {},
                            create: { userId, recipeId: cached.id }
                        });
                    } catch {}
                }

                console.log(`[Parse] Returning cached recipe for ${url}`);
                return res.json({ recipe: { ...finalRecipe, id: cached.id, sourceUrl: url } });
            }
        } catch (cacheErr) {
            console.error('[Parse] Cache check failed:', cacheErr);
        }

        // MVP: In-memory parsing without caching yet for immediate feedback
        const recipe = await parserService.parseUrl(url);

        // Detect language and translate if needed
        let finalRecipe = recipe;
        const isHebrew = translationService.isHebrew(recipe.title || '');
        let detectedLanguage = isHebrew ? 'he' : undefined;

        // Check DB for cached translation
        try {
            const existing = await prisma.recipe.findUnique({ where: { sourceUrl: url } });
            if (existing?.translatedJson) {
                const cached = JSON.parse(existing.translatedJson);
                if (cached.title && translationService.isHebrew(cached.title)) {
                    finalRecipe = {
                        ...recipe,
                        originalTitle: recipe.title,
                        originalLanguage: existing.originalLanguage || cached.lang || 'en',
                        title: cached.title,
                        ingredients: cached.ingredients || recipe.ingredients,
                        steps: cached.steps || recipe.steps,
                        originalRecipe: {
                            title: recipe.title,
                            ingredients: recipe.ingredients,
                            steps: recipe.steps
                        }
                    };
                    detectedLanguage = existing.originalLanguage || cached.lang;
                }
            }
        } catch {}

        // If not Hebrew and no cached translation, translate now
        if (!isHebrew && !finalRecipe.originalRecipe) {
            try {
                const translated = await translationService.translateFullRecipe(recipe);
                if (translated && translated.title) {
                    finalRecipe = {
                        ...recipe,
                        originalTitle: recipe.title,
                        originalLanguage: translated.lang || 'en',
                        title: translated.title,
                        ingredients: translated.ingredients || recipe.ingredients,
                        steps: translated.steps || recipe.steps,
                        originalRecipe: {
                            title: recipe.title,
                            ingredients: recipe.ingredients,
                            steps: recipe.steps
                        }
                    };
                    detectedLanguage = translated.lang || 'en';
                }
            } catch (translationError) {
                console.error('[Parse] Translation failed:', translationError);
            }
        }

        // Attempt saving to DB (UrlCache, Recipe)
        try {
            const translatedJson = finalRecipe.originalRecipe
                ? JSON.stringify({
                    lang: detectedLanguage,
                    title: finalRecipe.title,
                    ingredients: finalRecipe.ingredients,
                    steps: finalRecipe.steps
                })
                : null;

            const dbRecipe = await prisma.recipe.upsert({
                where: { sourceUrl: url },
                update: {
                    parsedJson: JSON.stringify(recipe),
                    translatedJson,
                    originalLanguage: detectedLanguage || null,
                    parseStatus: 'parsed',
                    parsedAt: new Date()
                },
                create: {
                    sourceUrl: url,
                    parsedJson: JSON.stringify(recipe),
                    translatedJson,
                    originalLanguage: detectedLanguage || null,
                    parseStatus: 'parsed',
                    parsedAt: new Date()
                }
            });

            // If userId is provided, automatically save it to their library
            if (userId) {
                // Ensure user exists
                let user = await prisma.user.findUnique({ where: { id: userId } });
                if (!user) {
                    user = await prisma.user.create({ data: { id: userId, email: `user-${userId}@example.com` } });
                }

                await prisma.savedRecipe.upsert({
                    where: {
                        userId_recipeId: { userId, recipeId: dbRecipe.id }
                    },
                    update: {},
                    create: { userId, recipeId: dbRecipe.id }
                });
                console.log(`[Recipe] Auto-saved recipe ${dbRecipe.id} for user ${userId}`);
            }
            // Trigger lazy image generation for ingredients and steps
            if (recipe.ingredients) {
                const ingredientNames = recipe.ingredients.map((i: any) => i.name || i);
                imageService.triggerLazyGeneration(ingredientNames).catch(err => {
                    console.error('[LazyGen] Ingredient trigger failed in parse route:', err);
                });
            }
            if (recipe.steps) {
                const stepTexts = recipe.steps.map((s: any) => s.text || s);
                // Trigger lazily
                imageService.getImagesForSteps(stepTexts).catch(err => {
                    console.error('[LazyGen] Step trigger failed in parse route:', err);
                });
            }

            res.json({
                status: 'parsed',
                recipe: { ...finalRecipe, sourceUrl: url, id: dbRecipe.id }
            });
        } catch (dbError) {
            console.error('Failed to save parsed recipe to DB:', dbError);
            res.json({
                status: 'parsed',
                recipe: { ...finalRecipe, sourceUrl: url }
            });
        }
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ status: 'failed', error: error.message || 'Parsing failed' });
    }
});

// POST /api/save
router.post('/save', async (req, res) => {
    try {
        const { userId, recipeId } = req.body;
        if (!userId || !recipeId) {
            return res.status(400).json({ error: 'userId and recipeId required' });
        }

        // Ensure dummy user exists for MVP prototyping
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            user = await prisma.user.create({ data: { id: userId, email: `mock${userId}@example.com` } });
        }

        await prisma.savedRecipe.upsert({
            where: {
                userId_recipeId: { userId, recipeId }
            },
            update: {},
            create: { userId, recipeId }
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save recipe' });
    }
});

// POST /api/import
router.post('/import', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Immediately trigger parse
        const recipe = await parserService.parseUrl(url);

        const dbRecipe = await prisma.recipe.upsert({
            where: { sourceUrl: url },
            update: {
                parsedJson: JSON.stringify(recipe),
                parseStatus: 'parsed',
                parsedAt: new Date()
            },
            create: {
                sourceUrl: url,
                parsedJson: JSON.stringify(recipe),
                parseStatus: 'parsed',
                parsedAt: new Date()
            }
        });

        res.json({ success: true, recipeId: dbRecipe.id, recipe });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to import URL' });
    }
});

// GET /api/community
router.get('/community', async (req, res) => {
    try {
        const recipes = await prisma.recipe.findMany({
            where: { parseStatus: 'parsed' },
            orderBy: { parsedAt: 'desc' },
            take: 50
        });

        const parsedRecipes = recipes.map(r => ({
            ...JSON.parse(r.parsedJson || '{}'),
            id: r.id,
            sourceUrl: r.sourceUrl
        }));

        res.json({ recipes: parsedRecipes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch community recipes' });
    }
});

// GET /api/library/:userId
router.get('/library/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        // Clean up orphaned SavedRecipes (from raw SQL deletions that bypass cascade)
        await prisma.$executeRawUnsafe(
            `DELETE FROM "SavedRecipe" WHERE "recipeId" NOT IN (SELECT id FROM "Recipe")`
        );

        const saved = await prisma.savedRecipe.findMany({
            where: { userId },
            include: { recipe: true },
            orderBy: { createdAt: 'desc' }
        });

        const recipes = saved.map(s => ({
            ...JSON.parse(s.recipe.parsedJson || '{}'),
            id: s.recipe.id,
            sourceUrl: s.recipe.sourceUrl
        }));

        res.json({ recipes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch library' });
    }
});

// --- COLLECTIONS ---

// GET /api/collections/:userId - list all collections for a user
router.get('/collections/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const collections = await prisma.collection.findMany({
            where: { userId },
            include: {
                _count: { select: { items: true } },
                items: {
                    take: 1,
                    include: { recipe: true }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const formatted = collections.map(c => {
            let coverImage = c.image;
            if (!coverImage && c.items.length > 0) {
                const recipeData = JSON.parse(c.items[0].recipe.parsedJson || '{}');
                coverImage = recipeData.image;
            }
            return {
                id: c.id,
                name: c.name,
                description: c.description,
                itemCount: c._count.items,
                image: coverImage,
                updatedAt: c.updatedAt
            };
        });

        res.json({ collections: formatted });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch collections' });
    }
});

// POST /api/collections - create a new collection
router.post('/collections', async (req, res) => {
    try {
        const { userId, name, description } = req.body;
        if (!userId || !name) {
            return res.status(400).json({ error: 'userId and name required' });
        }

        const collection = await prisma.collection.upsert({
            where: { userId_name: { userId, name } },
            update: { description },
            create: { userId, name, description }
        });

        res.json({ success: true, collection });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create collection' });
    }
});

// POST /api/collections/add - add recipe to collection
router.post('/collections/add', async (req, res) => {
    try {
        const { userId, collectionName, recipeId, sourceUrl } = req.body;
        if (!userId || !collectionName || (!recipeId && !sourceUrl)) {
            return res.status(400).json({ error: 'userId, collectionName and (recipeId or sourceUrl) required' });
        }

        let finalRecipeId = recipeId;

        // If only sourceUrl provided, find or create the recipe
        if (!finalRecipeId && sourceUrl) {
            const recipe = await prisma.recipe.findUnique({ where: { sourceUrl } });
            if (recipe) {
                finalRecipeId = recipe.id;
            } else {
                // We might need to parse it if it doesn't exist, but for now let's hope it's there
                // Or just create a stub
                const stub = await prisma.recipe.create({
                    data: { sourceUrl, parseStatus: 'pending' }
                });
                finalRecipeId = stub.id;
            }
        }

        // Find or create collection
        const collection = await prisma.collection.upsert({
            where: { userId_name: { userId, name: collectionName } },
            update: {},
            create: { userId, name: collectionName }
        });

        // Add item
        await prisma.collectionItem.upsert({
            where: {
                collectionId_recipeId: {
                    collectionId: collection.id,
                    recipeId: finalRecipeId
                }
            },
            update: {},
            create: {
                collectionId: collection.id,
                recipeId: finalRecipeId
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add recipe to collection' });
    }
});

// GET /api/collections/:userId/:collectionName - get recipes in a specific collection
router.get('/collections/:userId/:collectionName', async (req, res) => {
    try {
        const { userId, collectionName } = req.params;
        const collection = await prisma.collection.findFirst({
            where: { userId, name: collectionName },
            include: {
                items: {
                    include: { recipe: true },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }

        const recipes = collection.items.map(item => ({
            ...JSON.parse(item.recipe.parsedJson || '{}'),
            id: item.recipe.id,
            sourceUrl: item.recipe.sourceUrl
        }));

        res.json({
            collection: {
                id: collection.id,
                name: collection.name,
                description: collection.description,
                image: collection.image
            },
            recipes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch collection details' });
    }
});

export default router;
