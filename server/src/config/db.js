import mongoose from 'mongoose';
import { config } from './env.js';

let dbStatus = {
  status: 'disconnected',
  host: null,
  database: null,
  lastError: null,
};

export function getDatabaseStatus() {
  const readyStates = {
    0: dbStatus.status === 'error' ? 'error' : 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  
  return {
    status: readyStates[mongoose.connection.readyState] || dbStatus.status || 'unknown',
    host: mongoose.connection.host || null,
    database: mongoose.connection.name || null,
    lastError: dbStatus.lastError,
  };
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  dbStatus.status = 'connecting';
  console.log(`[Database] Attempting connection to MongoDB (${config.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')})...`);

  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5s timeout to avoid blocking boot indefinitely
    });

    dbStatus = {
      status: 'connected',
      host: conn.connection.host,
      database: conn.connection.name,
      lastError: null,
    };

    console.log(`[Database] Connected to MongoDB host: ${conn.connection.host} (${conn.connection.name})`);
    return conn;
  } catch (error) {
    dbStatus = {
      status: 'error',
      host: null,
      database: null,
      lastError: error.message,
    };

    console.warn(`[Database Warning] Could not connect to MongoDB: ${error.message}`);
    console.warn(`[Database Warning] CampusAtlas will continue in degraded mode. Reconnection attempts will occur on demand.`);
    return null;
  }
}

mongoose.connection.on('connected', () => {
  dbStatus.status = 'connected';
  dbStatus.host = mongoose.connection.host;
  dbStatus.database = mongoose.connection.name;
});

mongoose.connection.on('error', (err) => {
  dbStatus.status = 'error';
  dbStatus.lastError = err.message;
  console.error(`[Database Error] Mongoose runtime error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  dbStatus.status = 'disconnected';
  console.warn('[Database] Mongoose disconnected from MongoDB');
});

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    dbStatus.status = 'disconnected';
    console.log('[Database] Disconnected cleanly');
  }
}
