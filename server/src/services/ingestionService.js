import { Resource } from '../models/Resource.js';
import { Chunk } from '../models/Chunk.js';
import { extractPagesFromPdf, chunkPages } from './pdfService.js';
import { embedChunks } from './embeddingService.js';
import { config } from '../config/env.js';

// In-process lock to prevent duplicate concurrent processing of the same resource
const activeIngestions = new Set();

export function isResourceProcessing(resourceId) {
  return activeIngestions.has(resourceId.toString());
}

export function queueIngestion(resourceId) {
  // Trigger processing asynchronously in background without blocking caller
  setImmediate(async () => {
    try {
      await processIngestion(resourceId);
    } catch (err) {
      console.error(`[Ingestion Worker] Unhandled failure on resource ${resourceId}:`, err.message);
    }
  });
}

export async function processIngestion(resourceId) {
  const resourceIdStr = resourceId.toString();

  if (activeIngestions.has(resourceIdStr)) {
    console.warn(`[Ingestion] Resource ${resourceIdStr} is already being processed. Skipping duplicate trigger.`);
    return false;
  }

  activeIngestions.add(resourceIdStr);

  try {
    const resource = await Resource.findById(resourceId).select('+fileData');
    if (!resource) {
      throw new Error('Resource not found.');
    }

    // Validate that fileData is a Buffer/Uint8Array with nonzero length before extraction
    const hasValidFileData =
      resource.fileData &&
      (Buffer.isBuffer(resource.fileData) || resource.fileData instanceof Uint8Array) &&
      resource.fileData.length > 0;

    if (!hasValidFileData) {
      throw new Error('Resource PDF binary data is missing or empty.');
    }

    // Update status to processing atomically (avoids triggering schema validation on unselected fields)
    await Resource.findByIdAndUpdate(resourceId, {
      ingestionStatus: 'processing',
      ingestionError: null,
    });

    console.log(`[Ingestion] Started processing document "${resource.title}" (${resourceIdStr})...`);

    // Verify Gemini API key is configured before attempting embedding
    if (!config.GEMINI_API_KEY) {
      throw new Error(
        'Server Gemini API key is not configured. Document extraction and embeddings cannot be generated.'
      );
    }

    // Step 1: Extract pages
    const { totalPages, pages } = await extractPagesFromPdf(resource.fileData);

    // Step 2: Chunk pages with 1-based page numbers and boundaries
    const chunks = chunkPages(pages, resource._id);
    console.log(`[Ingestion] Extracted ${totalPages} pages and created ${chunks.length} bounded chunks.`);

    // Step 3: Generate real Gemini embeddings in sequential batches
    const embeddedChunks = await embedChunks(chunks);
    console.log(`[Ingestion] Generated ${embeddedChunks.length} embeddings (${config.GEMINI_EMBEDDING_DIMENSIONS} dim).`);

    // Step 4: Atomic chunk replacement (idempotent: clean prior chunks first)
    await Chunk.deleteMany({ resourceId: resource._id });
    await Chunk.insertMany(embeddedChunks);

    // Step 5: Mark ready atomically with extracted pageCount
    await Resource.findByIdAndUpdate(resourceId, {
      pageCount: totalPages,
      ingestionStatus: 'ready',
      ingestionError: null,
    });

    console.log(`[Ingestion] Resource "${resource.title}" (${resourceIdStr}) successfully ingested and ready for retrieval.`);
    return true;
  } catch (err) {
    const safeErrorMessage = err.message || 'Unknown ingestion failure occurred.';
    console.error(`[Ingestion Error] Failed on resource ${resourceIdStr}: ${safeErrorMessage}`);

    try {
      await Resource.findByIdAndUpdate(resourceId, {
        ingestionStatus: 'failed',
        ingestionError: safeErrorMessage,
      });
      // Clean up partial chunks if ingestion failed midway
      await Chunk.deleteMany({ resourceId });
    } catch (saveErr) {
      console.error(`[Ingestion Error] Could not update failed status for ${resourceIdStr}:`, saveErr.message);
    }

    return false;
  } finally {
    activeIngestions.delete(resourceIdStr);
  }
}

// Startup recovery worker: recover stale processing or queued resources on reboot
export async function recoverPendingIngestions(limit = 10) {
  try {
    const pending = await Resource.find({
      ingestionStatus: { $in: ['queued', 'processing'] },
    })
      .limit(limit)
      .select('_id title ingestionStatus');

    if (pending.length > 0) {
      console.log(`[Ingestion Recovery] Found ${pending.length} pending/interrupted resources. Queuing recovery...`);
      for (const res of pending) {
        queueIngestion(res._id);
      }
    }
  } catch (err) {
    console.warn('[Ingestion Recovery] Could not recover pending items:', err.message);
  }
}
