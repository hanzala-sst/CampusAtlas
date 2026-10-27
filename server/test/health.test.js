import { test } from 'node:test';
import assert from 'node:assert';
import app from '../src/app.js';
import { validateConfig, config } from '../src/config/env.js';

test('Config validation returns structured report', () => {
  const result = validateConfig();
  assert.ok(typeof result.valid === 'boolean');
  assert.ok(Array.isArray(result.warnings));
  assert.ok(Array.isArray(result.errors));
});

test('App responds to /api/health with expected JSON shape', async () => {
  // Test route handler directly via synthetic request
  const server = app.listen(0);
  const port = server.address().port;
  
  try {
    const res = await fetch(`http://localhost:${port}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.status === 'healthy' || data.status === 'degraded');
    assert.strictEqual(typeof data.timestamp, 'string');
    assert.strictEqual(typeof data.services, 'object');
    assert.strictEqual(data.services.api.status, 'online');
    assert.strictEqual(typeof data.services.database.status, 'string');
    assert.strictEqual(typeof data.services.ai.configured, 'boolean');
  } finally {
    server.close();
  }
});

test('App 404 handler returns structured JSON', async () => {
  const server = app.listen(0);
  const port = server.address().port;
  
  try {
    const res = await fetch(`http://localhost:${port}/api/non-existent-route`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.error.code, 'NOT_FOUND');
  } finally {
    server.close();
  }
});
