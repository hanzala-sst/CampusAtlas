import mongoose from 'mongoose';

/**
 * Middleware ensuring database connectivity for DB-dependent operations.
 * When the configured database is disconnected or unreachable,
 * immediately returns a structured 503 rather than hanging or buffering.
 */
export function requireDatabase(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database service is currently unavailable. CampusAtlas is operating in degraded mode.',
        code: 'DATABASE_UNAVAILABLE',
      },
    });
  }
  next();
}
