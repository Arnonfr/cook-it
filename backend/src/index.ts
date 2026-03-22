import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';
import { env } from './config/env';

const app = express();
const prisma = new PrismaClient();
const port = env.port;

// Trust proxy (required for Render and express-rate-limit)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // Allow mixed content for development
}));

// CORS - restrict to your app in production
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://cookit-api.onrender.com', /capacitor:\/\//] 
        : true,
    credentials: true,
};
app.use(cors(corsOptions));

// Rate limiting - protect API keys from abuse
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Stricter rate limiting for expensive operations (Gemini API)
const parseLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 recipe parses per hour
    message: { error: 'Recipe parse limit reached, please try again later' },
});
app.use('/api/parse', parseLimiter);

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

import recipeRoutes from './routes/recipe';
import settingsRoutes from './routes/settings';

console.log('[Routes] Loading recipe routes...');
app.use('/api', recipeRoutes);
console.log('[Routes] Loading settings routes...');
app.use('/api/settings', settingsRoutes);
console.log('[Routes] All routes loaded successfully');

const server = app.listen(port, () => {
    console.log(`Cookit Backend running on port ${port}`);
});

server.on('error', (err) => {
    console.error('Server failed to start:', err);
});
