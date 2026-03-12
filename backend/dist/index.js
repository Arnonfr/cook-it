"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const client_1 = require("@prisma/client");
const env_1 = require("./config/env");
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
const port = env_1.env.port;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});
const recipe_1 = __importDefault(require("./routes/recipe"));
app.use('/api', recipe_1.default);
app.listen(port, () => {
    console.log(`Cookit Backend running on port ${port}`);
});
