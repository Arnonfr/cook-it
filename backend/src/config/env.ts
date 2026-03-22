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
    databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
    googleApiKey: process.env.GOOGLE_API_KEY?.trim() || 'MOCK_FOR_NOW',
    googleCx: process.env.GOOGLE_CX?.trim() || 'MOCK_FOR_NOW',
    // API Keys - will be moved to environment variables in production
    serperApiKey: process.env.SERPER_API_KEY?.trim() || '12628dcd31fcfb626d282692bf4cfa2eeea87b77',
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || 'AIzaSyDjxlB1jsetqGFHQSFXLW_7s_L6fffPQF8',
};
