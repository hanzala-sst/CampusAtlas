import { test } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, getDatabaseStatus, disconnectDB } from '../src/config/db.js';
import { config } from '../src/config/env.js';

test('DB Configuration: connectDB uses only configured MONGODB_URI and never falls back to localhost', async () => {
  // Save original connect method
  const originalConnect = mongoose.connect;
  const connectCalls = [];

  try {
    // Disconnect if currently connected
    await disconnectDB();

    // Mock mongoose.connect to simulate failure on configured URI
    mongoose.connect = async (uri, options) => {
      connectCalls.push({ uri, options });
      const err = new Error('Could not connect to any servers in your MongoDB Atlas cluster.');
      err.name = 'MongooseServerSelectionError';
      throw err;
    };

    const result = await connectDB();

    // 1. connectDB must return null on failure
    assert.strictEqual(result, null, 'connectDB must return null when connection fails');

    // 2. mongoose.connect must be called exactly once
    assert.strictEqual(connectCalls.length, 1, 'mongoose.connect must only be attempted once with the configured URI');

    // 3. The single call must target the configured MONGODB_URI
    assert.strictEqual(connectCalls[0].uri, config.MONGODB_URI, 'Must attempt connection only to config.MONGODB_URI');

    // 4. Verify it NEVER attempted to connect to 127.0.0.1 or localhost
    const calledLocalhost = connectCalls.some(
      (call) => call.uri.includes('127.0.0.1') || call.uri.includes('localhost')
    );
    // Unless the user's explicitly configured URI itself contains localhost
    if (!config.MONGODB_URI.includes('127.0.0.1') && !config.MONGODB_URI.includes('localhost')) {
      assert.strictEqual(calledLocalhost, false, 'Must never silently attempt fallback to localhost or 127.0.0.1');
    }

    // 5. Database status must reflect error honestly
    const status = getDatabaseStatus();
    assert.strictEqual(status.status, 'error');
    assert.ok(status.lastError.includes('MongoDB Atlas cluster'));
  } finally {
    // Restore original connect
    mongoose.connect = originalConnect;
  }
});

test('DB Degraded Mode: DB-dependent endpoints return structured 503 while /api/health reports degraded', async () => {
  // Ensure connection is in disconnected state (readyState 0)
  await disconnectDB();

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. /api/health reports degraded status
    const healthRes = await fetch(`${baseUrl}/api/health`);
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'degraded', 'Health status must be degraded when database is disconnected');
    assert.ok(healthData.services.database.status !== 'connected');

    // 2. DB-dependent route GET /api/resources returns structured 503 DATABASE_UNAVAILABLE
    const resourcesRes = await fetch(`${baseUrl}/api/resources`);
    assert.strictEqual(resourcesRes.status, 503);
    const resourcesData = await resourcesRes.json();
    assert.strictEqual(resourcesData.success, false);
    assert.strictEqual(resourcesData.error.code, 'DATABASE_UNAVAILABLE');
    assert.ok(resourcesData.error.message.includes('unavailable'));

    // 3. DB-dependent route POST /api/auth/login returns structured 503
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
    });
    assert.strictEqual(loginRes.status, 503);
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.success, false);
    assert.strictEqual(loginData.error.code, 'DATABASE_UNAVAILABLE');

    // 4. DB-dependent route POST /api/ask returns structured 503
    const askRes = await fetch(`${baseUrl}/api/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'What is this document about?' }),
    });
    assert.strictEqual(askRes.status, 503);
    const askData = await askRes.json();
    assert.strictEqual(askData.success, false);
    assert.strictEqual(askData.error.code, 'DATABASE_UNAVAILABLE');
  } finally {
    server.close();
  }
});
