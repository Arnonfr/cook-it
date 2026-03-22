"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const client_1 = require("@prisma/client");
const env_1 = require("./config/env");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const port = env_1.env.port;
// Trust proxy (required for Render and express-rate-limit)
app.set('trust proxy', 1);
// Security headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Allow mixed content for development
}));
// CORS - allow all origins (including Capacitor apps)
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps) or any origin
        if (!origin || origin === 'null' || origin.startsWith('https://localhost') || origin.startsWith('capacitor://') || origin.startsWith('http://localhost')) {
            callback(null, true);
        }
        else {
            callback(null, true); // Allow all origins for now
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use((0, cors_1.default)(corsOptions));
// Rate limiting - protect API keys from abuse
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);
// Stricter rate limiting for expensive operations (Gemini API)
const parseLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // limit each IP to 20 recipe parses per hour
    message: { error: 'Recipe parse limit reached, please try again later' },
});
app.use('/api/parse', parseLimiter);
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});
// Request logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
const recipe_1 = __importDefault(require("./routes/recipe"));
const settings_1 = __importDefault(require("./routes/settings"));
console.log('[Routes] Loading recipe routes...');
app.use('/api', recipe_1.default);
console.log('[Routes] Loading settings routes...');
app.use('/api/settings', settings_1.default);
console.log('[Routes] All routes loaded successfully');
const server = app.listen(port, () => {
    console.log(`Cookit Backend running on port ${port}`);
});
server.on('error', (err) => {
    console.error('Server failed to start:', err);
});
