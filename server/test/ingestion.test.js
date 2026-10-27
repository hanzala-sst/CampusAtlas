import { test, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Resource } from '../src/models/Resource.js';
import { Chunk } from '../src/models/Chunk.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { extractPagesFromPdf, chunkPages } from '../src/services/pdfService.js';
import {
  normalizeVector,
  cosineSimilarity,
  setGeminiClient,
  embedChunks,
  embedQuery,
} from '../src/services/embeddingService.js';
import { processIngestion } from '../src/services/ingestionService.js';

let server;
let baseUrl;
let testUser;
let authCookie = '';
let testResourceId;

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

// Blank PDF with no text stream
const blankPdf = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
  '3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
);

// Mock Gemini Client returning deterministic 768-dim vectors
function createMockGeminiClient(fail = false) {
  return {
    models: {
      embedContent: async ({ contents }) => {
        if (fail) {
          const err = new Error('Rate limit exceeded');
          err.status = 429;
          throw err;
        }

        const items = Array.isArray(contents) ? contents : [contents];
        return {
          embeddings: items.map((text) => {
            // Deterministic synthetic 768-dim vector based on text
            const values = new Array(768).fill(0);
            const lower = String(text).toLowerCase();
            if (lower.includes('binary') || lower.includes('tree') || lower.includes('search')) {
              values[0] = 0.9;
              values[1] = 0.4;
            } else if (lower.includes('array') || lower.includes('introduction')) {
              values[0] = 0.2;
              values[1] = 0.9;
            } else {
              values[0] = 0.5;
              values[1] = 0.5;
            }
            return { values };
          }),
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

  // Create isolated test user
  await User.deleteMany({ email: 'ingestion_tester@testcampusatlas.edu' });
  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Ingestion Tester',
      email: 'ingestion_tester@testcampusatlas.edu',
      password: 'password123',
    }),
  });
  const data = await registerRes.json();
  testUser = data.user;
  authCookie = registerRes.headers.get('set-cookie').split(';')[0];
});

after(async () => {
  setGeminiClient(null); // Restore real client
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ email: 'ingestion_tester@testcampusatlas.edu' });
    if (testResourceId) {
      await Resource.findByIdAndDelete(testResourceId);
      await Chunk.deleteMany({ resourceId: testResourceId });
    }
    await Resource.deleteMany({ title: /^Test M3/ });
    await Chunk.deleteMany({ text: /Page [12]:/ });
  }
  if (server) server.close();
  await disconnectDB();
});

test('F3 Unit: PDF extraction and deterministic per-page chunking', async () => {
  // 1. Successful extraction of 2-page document
  const { totalPages, pages } = await extractPagesFromPdf(sampleMultiPagePdf);
  assert.strictEqual(totalPages, 2);
  assert.strictEqual(pages.length, 2);
  assert.strictEqual(pages[0].pageNumber, 1);
  assert.strictEqual(pages[1].pageNumber, 2);
  assert.ok(pages[0].text.includes('Page 1'));
  assert.ok(pages[1].text.includes('Page 2'));

  // 2. Deterministic chunking: chunks strictly belong to their respective pages
  const chunks = chunkPages(pages, new mongoose.Types.ObjectId(), {
    chunkSize: 50,
    chunkOverlap: 10,
  });

  assert.ok(chunks.length >= 2);
  chunks.forEach((c, idx) => {
    assert.strictEqual(c.chunkIndex, idx, 'Chunk index must be sequential 0-based');
    assert.ok(c.pageNumber === 1 || c.pageNumber === 2);
    if (c.pageNumber === 1) {
      assert.ok(!c.text.includes('Page 2'), 'Page 1 chunks must never include Page 2 text');
    }
  });

  // 3. Rejection of blank / image-only PDF with no text layer
  await assert.rejects(
    async () => extractPagesFromPdf(blankPdf),
    /PDF contains no extractable text/
  );
});

test('F3 Unit: Embedding vector normalization and cosine similarity', () => {
  // 1. Normalization produces unit-norm vector
  const rawVec = [3, 4, 0, 0];
  const normalized = normalizeVector(rawVec);
  assert.strictEqual(normalized.length, 4);
  assert.strictEqual(normalized[0], 0.6);
  assert.strictEqual(normalized[1], 0.8);

  // 2. Cosine similarity between identical normalized vectors = 1.0
  const simIdentical = cosineSimilarity(normalized, normalized);
  assert.ok(Math.abs(simIdentical - 1.0) < 0.0001);

  // 3. Cosine similarity between orthogonal vectors = 0.0
  const orthogonalVec = [0, 0, 1, 0];
  const simOrthogonal = cosineSimilarity(normalized, orthogonalVec);
  assert.strictEqual(simOrthogonal, 0);

  // 4. Zero vector handling
  const zeroVec = [0, 0, 0, 0];
  assert.strictEqual(cosineSimilarity(normalized, zeroVec), 0);

  // 5. Dimension mismatch handling
  const mismatchVec = [1, 2, 3];
  assert.strictEqual(cosineSimilarity(normalized, mismatchVec), 0);
});

test('F3 Ingestion Service: Mocked sequential embedding & state transition', async () => {
  // Setup Mock Client to avoid quota/network in automated test
  setGeminiClient(createMockGeminiClient(false));

  // Create Resource in DB
  const resource = await Resource.create({
    title: 'Test M3 Ingestion Resource',
    courseCode: 'CS301',
    courseName: 'Algorithms',
    subject: 'Computer Science',
    semester: 5,
    academicYear: '2024-2025',
    resourceType: 'lecture-notes',
    uploadedBy: testUser._id,
    fileName: 'multipage.pdf',
    fileSize: sampleMultiPagePdf.length,
    fileData: sampleMultiPagePdf,
    ingestionStatus: 'queued',
  });
  testResourceId = resource._id;

  // Run ingestion
  const success = await processIngestion(resource._id);
  assert.strictEqual(success, true);

  // Verify Resource state transitioned to ready
  const readyResource = await Resource.findById(resource._id);
  assert.strictEqual(readyResource.ingestionStatus, 'ready');
  assert.strictEqual(readyResource.pageCount, 2);
  assert.strictEqual(readyResource.ingestionError, null);

  // Verify Chunks were persisted with 768-dim embeddings
  const chunks = await Chunk.find({ resourceId: resource._id }).select('+embedding');
  assert.ok(chunks.length >= 2);
  assert.strictEqual(chunks[0].embedding.length, 768);
  assert.strictEqual(chunks[0].embeddingModel, 'gemini-embedding-001');

  // Verify Idempotent Retry: re-running ingestion does not duplicate chunks
  const retrySuccess = await processIngestion(resource._id);
  assert.strictEqual(retrySuccess, true);
  const chunksAfterRetry = await Chunk.countDocuments({ resourceId: resource._id });
  assert.strictEqual(chunksAfterRetry, chunks.length, 'Chunk count must not duplicate on retry');
});

test('F3 API: Semantic search with course filters and keyword fallback', async () => {
  // Set Mock Client for search
  setGeminiClient(createMockGeminiClient(false));

  // 1. Semantic search for "Binary Search Trees" should return Page 2 chunk
  const searchRes = await fetch(`${baseUrl}/api/search?q=Binary+Search+Trees&courseCode=CS301`);
  assert.strictEqual(searchRes.status, 200);
  const searchData = await searchRes.json();

  assert.strictEqual(searchData.success, true);
  assert.strictEqual(searchData.mode, 'semantic');
  assert.ok(searchData.results.length >= 1);
  assert.strictEqual(searchData.results[0].pageNumber, 2);
  assert.strictEqual(searchData.results[0].resource.courseCode, 'CS301');
  assert.ok(searchData.results[0].score > 0);

  // 2. Filter rejection: Searching with a non-matching courseCode returns 0 results
  const emptyFilterRes = await fetch(`${baseUrl}/api/search?q=Binary+Trees&courseCode=PHY101`);
  assert.strictEqual(emptyFilterRes.status, 200);
  const emptyData = await emptyFilterRes.json();
  assert.strictEqual(emptyData.results.length, 0);

  // 3. Keyword fallback: When embedding fails, falls back cleanly and reports mode: keyword_fallback
  setGeminiClient(createMockGeminiClient(true)); // Client configured to throw error

  const fallbackRes = await fetch(`${baseUrl}/api/search?q=Introduction&courseCode=CS301`);
  assert.strictEqual(fallbackRes.status, 200);
  const fallbackData = await fallbackRes.json();

  assert.strictEqual(fallbackData.success, true);
  assert.strictEqual(fallbackData.mode, 'keyword_fallback');
  assert.ok(fallbackData.fallbackNotice.includes('unavailable'));
  assert.ok(fallbackData.results.length >= 1);
  assert.strictEqual(fallbackData.results[0].pageNumber, 1);
});

test('F3 Cleanup: Deleting resource cleans up associated chunks', async () => {
  // Delete the test resource
  const delRes = await fetch(`${baseUrl}/api/resources/${testResourceId}`, {
    method: 'DELETE',
    headers: { Cookie: authCookie },
  });
  assert.strictEqual(delRes.status, 200);

  // Verify all chunks for this resource were completely deleted
  const remainingChunks = await Chunk.countDocuments({ resourceId: testResourceId });
  assert.strictEqual(remainingChunks, 0, 'All chunks must be deleted when resource is deleted');
});
