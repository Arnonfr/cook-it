import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { env } from './config/env';

const app = express();
const prisma = new PrismaClient();
const port = env.port;

app.use(cors());
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

app.use('/api', recipeRoutes);
app.use('/api/settings', settingsRoutes);

const server = app.listen(port, () => {
    console.log(`Cookit Backend running on port ${port}`);
});

server.on('error', (err) => {
    console.error('Server failed to start:', err);
});
