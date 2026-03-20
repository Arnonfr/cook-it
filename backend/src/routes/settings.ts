import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

const router = Router();

const ENV_LOCAL_PATH = path.resolve(process.cwd(), '.env.local');

function readEnvLocal(): Record<string, string> {
    if (!fs.existsSync(ENV_LOCAL_PATH)) return {};
    const content = fs.readFileSync(ENV_LOCAL_PATH, 'utf-8');
    const result: Record<string, string> = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        result[key] = val;
    }
    return result;
}

function writeEnvLocal(data: Record<string, string>): void {
    const lines = Object.entries(data).map(([k, v]) => `${k}=${v}`);
    fs.writeFileSync(ENV_LOCAL_PATH, lines.join('\n') + '\n', 'utf-8');
}

function maskKey(key: string): string {
    if (!key || key.length < 8) return key ? '***' : '';
    return key.slice(0, 4) + '...' + key.slice(-4);
}

function isValidGeminiKey(k: string) {
    return k.startsWith('AIza') && k.length > 20;
}

function isValidSerperKey(k: string) {
    return k.length >= 32;
}

// GET /api/settings — returns masked key status
router.get('/', (_req, res) => {
    const gemini = env.geminiApiKey;
    const serper = env.serperApiKey;
    res.json({
        geminiApiKey: {
            set: !!gemini,
            valid: isValidGeminiKey(gemini),
            masked: maskKey(gemini),
        },
        serperApiKey: {
            set: !!serper,
            valid: isValidSerperKey(serper),
            masked: maskKey(serper),
        },
    });
});

// POST /api/settings — update keys (writes to .env.local, applies to process.env immediately)
router.post('/', (req, res) => {
    const { geminiApiKey, serperApiKey } = req.body as Record<string, string>;

    const current = readEnvLocal();

    if (geminiApiKey !== undefined) {
        current['GEMINI_API_KEY'] = geminiApiKey;
        process.env['GEMINI_API_KEY'] = geminiApiKey;
        env.geminiApiKey = geminiApiKey;
    }
    if (serperApiKey !== undefined) {
        current['SERPER_API_KEY'] = serperApiKey;
        process.env['SERPER_API_KEY'] = serperApiKey;
        env.serperApiKey = serperApiKey;
    }

    writeEnvLocal(current);

    res.json({ ok: true, message: 'מפתחות עודכנו. חלק מהשירותים ידרשו אתחול מחדש.' });
});

export default router;
