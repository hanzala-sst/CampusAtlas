import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Resource } from '../src/models/Resource.js';
import { Chunk } from '../src/models/Chunk.js';
import { User } from '../src/models/User.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { processIngestion } from '../src/services/ingestionService.js';
import { setGeminiClient } from '../src/services/embeddingService.js';

let server;
let baseUrl;
let testUser;
let authCookie = '';

// Sample 2-page valid PDF buffer
const sampleMultiPagePdf = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n' +
  '4 0 obj\n<< /Length 53 >>\nstream\n' +
  'BT /F1 12 Tf 100 700 Td (Page 1: Introduction to Data Structures and Arrays) Tj ET\n' +
  'endstream\nendobj\n' +
  '5 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 6 0 R >>\nendobj\n' +
  '6 0 obj\n<< /Length 55 >>\nstream\n' +
  'BT /F1 12 Tf 100 700 Td (Page 2: Binary Search Trees, Graphs, and Hash Tables) Tj ET\n' +
  'endstream\nendobj\n' +
  'trailer\n<< /Root 1 0 R >>\n%%EOF'
);

function createMockGeminiClient() {
  return {
    models: {
      embedContent: async ({ contents }) => {
        const items = Array.isArray(contents) ? contents : [contents];
        return {
          embeddings: items.map(() => ({
            values: new Array(768).fill(0.1),
          })),
        };
      },
    },
  };
}

before(async () => {
  await connectDB();
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ email: 'filedata_tester@testfiledata.edu' });
    const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'FileData Tester',
        email: 'filedata_tester@testfiledata.edu',
        password: 'password123',
      }),
    });
    const data = await registerRes.json();
    testUser = data.user;
    const cookie = registerRes.headers.get('set-cookie');
    if (cookie) authCookie = cookie.split(';')[0];
  }
});

after(async () => {
  if (mongoose.connection.readyState === 1 && testUser) {
    await User.deleteMany({ email: 'filedata_tester@testfiledata.edu' });
    await Resource.deleteMany({ uploadedBy: testUser._id });
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDB();
});

test('Regression Unit: Resource schema enforces select: false and required validation for fileData', () => {
  const fileDataPath = Resource.schema.path('fileData');
  assert.strictEqual(fileDataPath.options.select, false, 'fileData must have select: false in schema');
  assert.strictEqual(fileDataPath.isRequired, true, 'fileData must remain required in schema (not weakened)');

  // Document created without fileData must fail Mongoose validation
  const invalidDoc = new Resource({
    title: 'No FileData Doc',
    courseCode: 'CS101',
    courseName: 'Intro',
    subject: 'CS',
    semester: 1,
    academicYear: '2024-2025',
    resourceType: 'lecture-notes',
    fileName: 'test.pdf',
    fileSize: 100,
    uploadedBy: new mongoose.Types.ObjectId(),
  });
  const err = invalidDoc.validateSync();
  assert.ok(err, 'Expected validation error when fileData is omitted on create');
  assert.ok(
    err.errors.fileData.message.includes('File data buffer is required'),
    'Validation error must explain missing fileData'
  );
});

test('Regression End-to-End: fileData loading, atomic status updates, retry route, and projection safety', async (t) => {
  if (mongoose.connection.readyState !== 1) {
    t.skip('Configured MongoDB is unreachable (degraded mode)');
    return;
  }

  setGeminiClient(createMockGeminiClient());

  // 1. Create a valid Resource with PDF binary bytes
  const resource = await Resource.create({
    title: 'FileData Safe Ingestion Test',
    courseCode: 'CS102',
    courseName: 'Data Structures',
    subject: 'Computer Science',
    semester: 2,
    academicYear: '2024-2025',
    resourceType: 'lecture-notes',
    uploadedBy: testUser._id,
    fileName: 'multipage.pdf',
    fileSize: sampleMultiPagePdf.length,
    fileData: sampleMultiPagePdf,
    ingestionStatus: 'queued',
  });

  try {
    // 2. Fetch with default projection: fileData must be undefined
    const fetchedDefault = await Resource.findById(resource._id);
    assert.strictEqual(fetchedDefault.fileData, undefined, 'Default projection must NOT expose fileData');

    // 3. Fetch with explicit .select('+fileData'): fileData must be present and valid
    const fetchedWithBytes = await Resource.findById(resource._id).select('+fileData');
    assert.ok(fetchedWithBytes.fileData, 'fileData must be present when explicitly selected');
    assert.ok(
      Buffer.isBuffer(fetchedWithBytes.fileData) || fetchedWithBytes.fileData instanceof Uint8Array,
      'fileData must be a Buffer or Uint8Array'
    );
    assert.strictEqual(fetchedWithBytes.fileData.length, sampleMultiPagePdf.length);

    // 4. Run ingestion worker: status updates must NOT trigger fileData validation error
    const ingestionSuccess = await processIngestion(resource._id);
    assert.strictEqual(ingestionSuccess, true, 'processIngestion must succeed without validation errors');

    // Verify ready state and pageCount
    const readyDoc = await Resource.findById(resource._id);
    assert.strictEqual(readyDoc.ingestionStatus, 'ready');
    assert.strictEqual(readyDoc.pageCount, 2);
    assert.strictEqual(readyDoc.ingestionError, null);
    assert.strictEqual(readyDoc.fileData, undefined, 'Ready resource must still exclude fileData by default');

    // Verify chunks were created
    const chunks = await Chunk.find({ resourceId: resource._id });
    assert.ok(chunks.length >= 2);

    // 5. Normal API list and detail endpoints must NEVER expose fileData in JSON
    const listRes = await fetch(`${baseUrl}/api/resources?search=FileData+Safe`);
    assert.strictEqual(listRes.status, 200);
    const listData = await listRes.json();
    assert.strictEqual(listData.success, true);
    assert.ok(listData.resources.length >= 1);
    assert.strictEqual(listData.resources[0].fileData, undefined, 'API list response must not expose fileData');

    const detailRes = await fetch(`${baseUrl}/api/resources/${resource._id}`);
    assert.strictEqual(detailRes.status, 200);
    const detailData = await detailRes.json();
    assert.strictEqual(detailData.success, true);
    assert.strictEqual(detailData.resource.fileData, undefined, 'API detail response must not expose fileData');

    // 6. Test Retry Route: /api/resources/:id/retry must succeed atomically without Mongoose validation errors
    const retryRes = await fetch(`${baseUrl}/api/resources/${resource._id}/retry`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    assert.strictEqual(retryRes.status, 200, 'Retry endpoint must return 200 OK');
    const retryData = await retryRes.json();
    assert.strictEqual(retryData.success, true);
    assert.strictEqual(retryData.resource.ingestionStatus, 'queued');

    // Verify re-running processIngestion is idempotent and does not duplicate chunks
    const retryIngestionSuccess = await processIngestion(resource._id);
    assert.strictEqual(retryIngestionSuccess, true);
    const finalChunkCount = await Chunk.countDocuments({ resourceId: resource._id });
    assert.strictEqual(finalChunkCount, chunks.length, 'Retrying must not duplicate chunks');

    // 7. Preview and Download routes still stream binary fileData correctly
    const previewRes = await fetch(`${baseUrl}/api/resources/${resource._id}/preview`);
    assert.strictEqual(previewRes.status, 200);
    assert.strictEqual(previewRes.headers.get('content-type'), 'application/pdf');
    const previewBytes = await previewRes.arrayBuffer();
    assert.strictEqual(previewBytes.byteLength, sampleMultiPagePdf.length);
  } finally {
    await Resource.findByIdAndDelete(resource._id);
    await Chunk.deleteMany({ resourceId: resource._id });
  }
});
