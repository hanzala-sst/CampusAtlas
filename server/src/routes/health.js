import { Router } from 'express';
import { getDatabaseStatus } from '../config/db.js';
import { config, validateConfig } from '../config/env.js';

const router = Router();

router.get('/', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const configValidation = validateConfig();
  const isHealthy = dbStatus.status === 'connected';

  res.status(isHealthy ? 200 : 200).json({
    status: isHealthy ? 'healthy' : 'degraded',
    message: isHealthy ? 'CampusAtlas API operational' : 'CampusAtlas API operational (database degraded)',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.NODE_ENV,
    services: {
      api: {
        status: 'online',
        port: config.PORT,
      },
      database: {
        status: dbStatus.status,
        host: dbStatus.host,
        name: dbStatus.database,
        error: dbStatus.lastError,
      },
      ai: {
        configured: Boolean(config.GEMINI_API_KEY),
        generationModel: config.GEMINI_GENERATION_MODEL,
        embeddingModel: config.GEMINI_EMBEDDING_MODEL,
        embeddingDimensions: config.GEMINI_EMBEDDING_DIMENSIONS,
      },
    },
    configWarnings: configValidation.warnings,
  });
});

export default router;
