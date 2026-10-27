import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import resourceRoutes from './routes/resources.js';
import moderatorRoutes from './routes/moderator.js';
import userRoutes from './routes/users.js';
import searchRoutes from './routes/search.js';
import askRoutes from './routes/ask.js';
import { requireDatabase } from './middleware/requireDatabase.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// Explicit CORS configuration for development credentials & configured client
app.use(
  cors({
    origin: config.isProduction ? config.CLIENT_URL : [config.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body Parsing & Cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', requireDatabase, authRoutes);
app.use('/api/resources', requireDatabase, resourceRoutes);
app.use('/api/moderator', requireDatabase, moderatorRoutes);
app.use('/api/users', requireDatabase, userRoutes);
app.use('/api/search', requireDatabase, searchRoutes);
app.use('/api/ask', requireDatabase, askRoutes);

// Root API Welcome / Baseline
app.get('/api', (req, res) => {
  res.json({
    name: 'CampusAtlas API',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'operational',
  });
});

// Production Static Client Serving
const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  
  // Non-API routes fall through to Vite SPA client index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Undefined API Routes 404 Handler
app.use('/api/*', notFoundHandler);

// Centralized Error Handler
app.use(errorHandler);

export default app;
