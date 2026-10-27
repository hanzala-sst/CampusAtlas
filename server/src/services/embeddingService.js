import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env.js';

let customClient = null;

export function setGeminiClient(client) {
  customClient = client;
}

export function getGeminiClient() {
  if (customClient) return customClient;
  if (!config.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }
  return new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
}

// Vector mathematics & normalization helpers
export function normalizeVector(vector) {
  if (!Array.isArray(vector) || vector.length === 0) return [];
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    const val = Number(vector[i]);
    if (!Number.isFinite(val)) return [];
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vector.map(() => 0);
  return vector.map((v) => Number(v) / norm);
}

export function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) return 0;
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = Number(vecA[i]);
    const b = Number(vecB[i]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  return Number.isFinite(similarity) ? similarity : 0;
}

// Sleep helper for exponential backoff
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to determine if an API error is transient and retryable
function isRetryableError(error) {
  if (!error) return false;
  const status = error.status || error.statusCode;
  const msg = (error.message || '').toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('network') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout')
  );
}

// Embed document chunks in sequential batches with retry logic
export async function embedChunks(chunks, options = {}) {
  if (!chunks || chunks.length === 0) return [];

  const ai = getGeminiClient();
  const model = options.model || config.GEMINI_EMBEDDING_MODEL;
  const targetDim = options.dimensions || config.GEMINI_EMBEDDING_DIMENSIONS;
  const batchSize = options.batchSize || 10;
  const maxRetries = options.maxRetries || 3;

  const embeddedChunks = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);

    let attempts = 0;
    let embeddings = null;

    while (attempts <= maxRetries) {
      try {
        const response = await ai.models.embedContent({
          model,
          contents: texts.length === 1 ? texts[0] : texts,
          config: {
            outputDimensionality: targetDim,
            taskType: 'RETRIEVAL_DOCUMENT',
          },
        });

        // Normalize response whether returned as an array or single object
        const rawEmbeddings = response.embeddings || (response.embedding ? [response.embedding] : []);

        if (!Array.isArray(rawEmbeddings) || rawEmbeddings.length !== texts.length) {
          throw new Error(
            `Embedding response count mismatch: expected ${texts.length}, received ${rawEmbeddings?.length}`
          );
        }

        embeddings = rawEmbeddings;
        break; // Success
      } catch (err) {
        attempts++;
        if (attempts > maxRetries || !isRetryableError(err)) {
          throw new Error(`Embedding batch failed after ${attempts} attempts: ${err.message}`);
        }
        const backoffMs = Math.min(4000, 1000 * Math.pow(2, attempts - 1));
        await sleep(backoffMs);
      }
    }

    // Validate and attach normalized vectors
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const rawVector = embeddings[j]?.values;

      if (!Array.isArray(rawVector) || rawVector.length !== targetDim) {
        throw new Error(
          `Embedding vector dimension mismatch: expected ${targetDim}, got ${rawVector?.length}`
        );
      }

      const normalized = normalizeVector(rawVector);
      if (normalized.length !== targetDim) {
        throw new Error('Vector normalization failed: non-finite values detected.');
      }

      embeddedChunks.push({
        ...chunk,
        embedding: normalized,
        embeddingModel: model,
        embeddingDimensions: targetDim,
      });
    }
  }

  return embeddedChunks;
}

// Embed a query string for semantic similarity retrieval
export async function embedQuery(queryText, options = {}) {
  if (!queryText || typeof queryText !== 'string' || queryText.trim().length === 0) {
    throw new Error('Query text is required for embedding.');
  }

  const ai = getGeminiClient();
  const model = options.model || config.GEMINI_EMBEDDING_MODEL;
  const targetDim = options.dimensions || config.GEMINI_EMBEDDING_DIMENSIONS;

  let attempts = 0;
  const maxRetries = 2;

  while (attempts <= maxRetries) {
    try {
      const response = await ai.models.embedContent({
        model,
        contents: queryText.trim(),
        config: {
          outputDimensionality: targetDim,
          taskType: 'RETRIEVAL_QUERY',
        },
      });

      const rawVector = response.embeddings?.[0]?.values || response.embedding?.values;
      if (!Array.isArray(rawVector) || rawVector.length !== targetDim) {
        throw new Error(
          `Query vector dimension mismatch: expected ${targetDim}, got ${rawVector?.length}`
        );
      }

      return normalizeVector(rawVector);
    } catch (err) {
      attempts++;
      if (attempts > maxRetries || !isRetryableError(err)) {
        throw new Error(`Query embedding failed: ${err.message}`);
      }
      await sleep(1000 * attempts);
    }
  }
}
