import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_ERROR';
  let details = err.details || null;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Resource not found with specified ID (${err.value})`;
    code = 'INVALID_ID';
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map(val => val.message);
  }

  // Handle MongoDB Duplicate Key (E11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. It must be unique.`;
    code = 'DUPLICATE_KEY';
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired';
    code = 'TOKEN_EXPIRED';
  }

  // Log 500 errors in development/production
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      details,
      ...(config.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: {
      message: `Cannot ${req.method} ${req.originalUrl} — endpoint does not exist`,
      code: 'NOT_FOUND',
    },
  });
}
