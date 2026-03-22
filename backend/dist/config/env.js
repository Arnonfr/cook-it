"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local'), override: true });
const parsePort = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
// Mutable at runtime — settings endpoint can update keys without full restart
exports.env = {
    port: parsePort(process.env.PORT, 3001),
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
    googleApiKey: process.env.GOOGLE_API_KEY?.trim() || 'MOCK_FOR_NOW',
    googleCx: process.env.GOOGLE_CX?.trim() || 'MOCK_FOR_NOW',
    // API Keys - will be moved to environment variables in production
    serperApiKey: process.env.SERPER_API_KEY?.trim() || '12628dcd31fcfb626d282692bf4cfa2eeea87b77',
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || 'AIzaSyDjxlB1jsetqGFHQSFXLW_7s_L6fffPQF8',
};
