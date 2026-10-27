import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory first, fallback to root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Parse admin emails into normalized array
const rawAdminEmails = process.env.ADMIN_EMAILS || '';
const ADMIN_EMAILS = rawAdminEmails
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

// Validate and construct config object
export const config = {
  NODE_ENV,
  isProduction,
  PORT: parseInt(process.env.PORT, 10) || 5000,
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/campusatlas',
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : 'dev_campusatlas_jwt_secret_change_in_prod'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_GENERATION_MODEL: process.env.GEMINI_GENERATION_MODEL || 'gemini-2.5-flash',
  GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  GEMINI_EMBEDDING_DIMENSIONS: parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS, 10) || 768,
  ADMIN_EMAILS,
};

// Config validation helper
export function validateConfig() {
  const warnings = [];
  const errors = [];

  if (!process.env.MONGODB_URI) {
    warnings.push('MONGODB_URI is not explicitly set; defaulting to local mongodb://localhost:27017/campusatlas');
  }

  if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
    errors.push('JWT_SECRET must be set to a secure string with at least 32 characters in production');
  }

  if (!config.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not configured; AI document RAG and embeddings will be degraded/unavailable');
  }

  if (config.ADMIN_EMAILS.length === 0) {
    warnings.push('ADMIN_EMAILS is empty; no default moderator accounts will be automatically granted on registration');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
