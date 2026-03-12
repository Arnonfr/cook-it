"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const GoogleSearchService_1 = require("../services/GoogleSearchService");
const RecipeParserService_1 = require("../services/RecipeParserService");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const searchService = new GoogleSearchService_1.GoogleSearchService();
const parserService = new RecipeParserService_1.RecipeParserService();
const prisma = new client_1.PrismaClient();
// GET /api/search?q=lasagna
router.get('/search', async (req, res) => {
    try {
        const q = req.query.q;
        if (!q) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }
        const results = await searchService.searchRecipes(q);
        res.json({ results });
    }
    catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});
// GET /api/parse?url=
router.get('/parse', async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ error: 'URL parameter is required' });
        }
        // MVP: In-memory parsing without caching yet for immediate feedback
        const recipe = await parserService.parseUrl(url);
        // Attempt saving to DB (UrlCache, Recipe)
        try {
            await prisma.recipe.upsert({
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
        }
        catch (dbError) {
            console.error('Failed to save parsed recipe to DB:', dbError);
        }
        res.json({
            status: 'parsed',
            recipe
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ status: 'failed', error: 'Parsing failed' });
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
    }
    catch (error) {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to import URL' });
    }
});
exports.default = router;
