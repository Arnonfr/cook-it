import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const parsePort = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

// Mutable at runtime — settings endpoint can update keys without full restart
export const env = {
    port: parsePort(process.env.PORT, 3001),
    databaseUrl: process.env.DATABASE_URL || '',
    googleApiKey: process.env.GOOGLE_API_KEY?.trim() || 'MOCK_FOR_NOW',
    googleCx: process.env.GOOGLE_CX?.trim() || 'MOCK_FOR_NOW',
    // API Keys - MUST be set via environment variables
    // DO NOT commit actual keys to git - use Render Dashboard or .env.local
    serperApiKey: process.env.SERPER_API_KEY?.trim() || '',
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || '',
};
