"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngredientImageService = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const prisma = new client_1.PrismaClient();
class IngredientImageService {
    constructor() {
        this.serperApiKey = env_1.env.serperApiKey || '';
    }
    normalizeName(name) {
        // Remove quantities, numbers, and common units to get a clean ingredient name
        return name.toLowerCase()
            .replace(/[0-9%/\\.,:;]/g, '')
            .replace(/(גרם|קילו|חבילה|כף|כפית|כוס|קורט|מיכל|קופסה|יחידה|יחידות|שקיק|צרור|גבעול|שיני|שין)/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    async getImagesForIngredients(names) {
        const results = {};
        // Map original name to its normalized version
        const normalizedToOriginals = {};
        for (const name of names) {
            const normalized = this.normalizeName(name);
            if (!normalized)
                continue;
            if (!normalizedToOriginals[normalized]) {
                normalizedToOriginals[normalized] = [];
            }
            normalizedToOriginals[normalized].push(name);
        }
        const normalizedNames = Object.keys(normalizedToOriginals);
        if (normalizedNames.length === 0)
            return {};
        // 1. Check DB for existing images
        const cachedImages = await prisma.ingredientImage.findMany({
            where: { name: { in: normalizedNames } }
        });
        const foundNormalized = new Set();
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
                    const searchRes = await axios_1.default.post('https://google.serper.dev/images', { q: `${name} ingredient`, num: 1 }, {
                        headers: { 'X-API-KEY': this.serperApiKey },
                        timeout: 5000
                    });
                    const imageUrl = searchRes.data.images?.[0]?.imageUrl;
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
                    }
                    else {
                        throw new Error('No images found');
                    }
                }
                catch (err) {
                    console.error(`[Images] Failed to fetch image for ${name}:`, err.message);
                    // Fallback to local path just in case
                    const fallbackUrl = `/ingredients/${encodeURIComponent(name)}.png`;
                    const originals = normalizedToOriginals[name] || [];
                    originals.forEach(orig => {
                        results[orig] = fallbackUrl;
                    });
                }
            }
        }
        else {
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
    async triggerLazyGeneration(names) {
        // Just call getImagesForIngredients without awaiting it fully in the route
        // This will populate the cache for future requests
        this.getImagesForIngredients(names).catch(err => {
            console.error('[Images] Lazy generation background task failed:', err);
        });
    }
    async getImagesForSteps(steps) {
        const results = {};
        if (steps.length === 0)
            return {};
        // 1. Check DB for existing images
        const cachedImages = await prisma.stepImage.findMany({
            where: { stepText: { in: steps } }
        });
        const foundSteps = new Set();
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
                    const searchRes = await axios_1.default.post('https://google.serper.dev/images', { q: `${searchQuery} cooking process`, num: 1 }, {
                        headers: { 'X-API-KEY': this.serperApiKey },
                        timeout: 5000
                    });
                    const imageUrl = searchRes.data.images?.[0]?.imageUrl;
                    if (imageUrl) {
                        // Store in DB
                        await prisma.stepImage.upsert({
                            where: { stepText: step },
                            update: { imageUrl },
                            create: { stepText: step, imageUrl }
                        });
                        results[step] = imageUrl;
                    }
                }
                catch (err) {
                    console.error(`[Images] Failed to fetch image for step:`, err.message);
                }
            }
        }
        return results;
    }
    async getInventory() {
        return await prisma.ingredientImage.findMany({
            orderBy: { name: 'asc' }
        });
    }
}
exports.IngredientImageService = IngredientImageService;
