"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
const ENV_LOCAL_PATH = path_1.default.resolve(process.cwd(), '.env.local');
function readEnvLocal() {
    if (!fs_1.default.existsSync(ENV_LOCAL_PATH))
        return {};
    const content = fs_1.default.readFileSync(ENV_LOCAL_PATH, 'utf-8');
    const result = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#'))
            continue;
        const eq = trimmed.indexOf('=');
        if (eq === -1)
            continue;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        result[key] = val;
    }
    return result;
}
function writeEnvLocal(data) {
    const lines = Object.entries(data).map(([k, v]) => `${k}=${v}`);
    fs_1.default.writeFileSync(ENV_LOCAL_PATH, lines.join('\n') + '\n', 'utf-8');
}
function maskKey(key) {
    if (!key || key.length < 8)
        return key ? '***' : '';
    return key.slice(0, 4) + '...' + key.slice(-4);
}
function isValidGeminiKey(k) {
    return k.startsWith('AIza') && k.length > 20;
}
function isValidSerperKey(k) {
    return k.length >= 32;
}
// GET /api/settings — returns masked key status
router.get('/', (_req, res) => {
    const gemini = env_1.env.geminiApiKey;
    const serper = env_1.env.serperApiKey;
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
    const { geminiApiKey, serperApiKey } = req.body;
    const current = readEnvLocal();
    if (geminiApiKey !== undefined) {
        current['GEMINI_API_KEY'] = geminiApiKey;
        process.env['GEMINI_API_KEY'] = geminiApiKey;
        env_1.env.geminiApiKey = geminiApiKey;
    }
    if (serperApiKey !== undefined) {
        current['SERPER_API_KEY'] = serperApiKey;
        process.env['SERPER_API_KEY'] = serperApiKey;
        env_1.env.serperApiKey = serperApiKey;
    }
    writeEnvLocal(current);
    res.json({ ok: true, message: 'מפתחות עודכנו. חלק מהשירותים ידרשו אתחול מחדש.' });
});
exports.default = router;
