import app from './app.js';
import { config, validateConfig } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

async function startServer() {
  console.log('----------------------------------------------------');
  console.log('  CampusAtlas — Peer-Powered Academic Knowledge Hub');
  console.log('----------------------------------------------------');

  // Validate configuration
  const validation = validateConfig();
  if (validation.warnings.length > 0) {
    validation.warnings.forEach(w => console.warn(`[Config Notice] ${w}`));
  }
  if (!validation.valid) {
    validation.errors.forEach(e => console.error(`[Config Error] ${e}`));
    if (config.isProduction) {
      console.error('[Fatal] Halting server startup due to critical configuration errors.');
      process.exit(1);
    }
  }

  // Attempt database connection (non-blocking for baseline health check)
  await connectDB();

  // Start Express server
  const server = app.listen(config.PORT, () => {
    console.log(`[Server] CampusAtlas backend running on http://localhost:${config.PORT}`);
    console.log(`[Server] Environment: ${config.NODE_ENV}`);
    console.log(`[Server] Health check: http://localhost:${config.PORT}/api/health`);
    console.log(`[Server] CORS client origin: ${config.CLIENT_URL}`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      console.log('[Server] Process exited cleanly.');
      process.exit(0);
    });

    // Force shutdown after 10s if dangling connections persist
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  return server;
}

startServer().catch((err) => {
  console.error('[Server Fatal] Failed to launch server:', err);
  process.exit(1);
});
