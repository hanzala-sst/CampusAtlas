import mongoose from 'mongoose';
import { Resource } from '../models/Resource.js';
import { Chunk } from '../models/Chunk.js';
import { embedQuery, cosineSimilarity } from './embeddingService.js';
import { config } from '../config/env.js';

// Helper to escape regex special characters for keyword search
export function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export const BOUNDED_SCAN_CHUNK_LIMIT = 1000;

/**
 * Shared retrieval function for both Search and Ask the Doc RAG
 * Retrieves relevant persisted chunks for eligible resources.
 */
export async function retrieveRelevantChunks({
  query,
  courseCode,
  semester,
  resourceType,
  resourceId,
  limit = 8,
}) {
  const cleanQuery = query.trim();
  const limitNum = Math.min(30, Math.max(1, parseInt(limit, 10) || 8));

  // Build resource eligibility filter
  const resourceFilter = {
    ingestionStatus: 'ready',
    verificationStatus: { $ne: 'archived' },
  };

  if (courseCode) {
    resourceFilter.courseCode = courseCode.trim().toUpperCase();
  }

  if (semester !== undefined && semester !== null && semester !== '') {
    const semNum = parseInt(semester, 10);
    if (!isNaN(semNum)) resourceFilter.semester = semNum;
  }

  if (resourceType) {
    resourceFilter.resourceType = resourceType;
  }

  if (resourceId) {
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return {
        retrievalMode: config.GEMINI_API_KEY ? 'semantic' : 'keyword_fallback',
        query: cleanQuery,
        totalMatches: 0,
        candidateChunks: [],
        resourcesMap: new Map(),
      };
    }
    resourceFilter._id = resourceId;
  }

  // Find eligible resources and project safe metadata only (never fileData)
  const eligibleResources = await Resource.find(resourceFilter)
    .select(
      '_id title courseCode courseName subject semester academicYear resourceType verificationStatus pageCount voteScore upvoteCount'
    )
    .lean();

  if (eligibleResources.length === 0) {
    return {
      retrievalMode: config.GEMINI_API_KEY ? 'semantic' : 'keyword_fallback',
      query: cleanQuery,
      totalMatches: 0,
      candidateChunks: [],
      resourcesMap: new Map(),
    };
  }

  const resourcesMap = new Map(
    eligibleResources.map((r) => [r._id.toString(), r])
  );
  const eligibleResourceIds = Array.from(resourcesMap.keys());

  // Attempt Semantic Retrieval via Gemini embeddings
  let semanticSucceeded = false;
  let scoredChunks = [];

  if (config.GEMINI_API_KEY) {
    try {
      const queryVector = await embedQuery(cleanQuery);

      if (
        Array.isArray(queryVector) &&
        queryVector.length === config.GEMINI_EMBEDDING_DIMENSIONS
      ) {
        const candidateChunks = await Chunk.find({
          resourceId: { $in: eligibleResourceIds },
        })
          .select('+embedding text pageNumber chunkIndex resourceId')
          .limit(BOUNDED_SCAN_CHUNK_LIMIT)
          .lean();

        for (const chunk of candidateChunks) {
          const score = cosineSimilarity(queryVector, chunk.embedding);
          if (score > 0.35) {
            scoredChunks.push({
              chunk,
              score,
            });
          }
        }

        // Sort by similarity descending
        scoredChunks.sort((a, b) => b.score - a.score);
        semanticSucceeded = true;
      }
    } catch (embedErr) {
      console.warn(
        '[Retrieval Notice] Semantic embedding retrieval unavailable, falling back to keyword search:',
        embedErr.message
      );
      semanticSucceeded = false;
    }
  }

  // If semantic search succeeded
  if (semanticSucceeded) {
    const topResults = scoredChunks.slice(0, limitNum);
    const candidateChunks = topResults.map((item, idx) => {
      const resource = resourcesMap.get(item.chunk.resourceId.toString()) || null;
      return {
        sourceId: `S${idx + 1}`,
        chunkId: item.chunk._id,
        resourceId: item.chunk.resourceId,
        resource,
        title: resource?.title || 'Untitled Document',
        courseCode: resource?.courseCode || '',
        pageNumber: item.chunk.pageNumber,
        chunkIndex: item.chunk.chunkIndex,
        score: Math.round(item.score * 1000) / 1000,
        excerpt:
          item.chunk.text.length > 280
            ? item.chunk.text.slice(0, 280) + '...'
            : item.chunk.text,
        fullText: item.chunk.text,
      };
    });

    return {
      retrievalMode: 'semantic',
      query: cleanQuery,
      totalMatches: scoredChunks.length,
      candidateChunks,
      resourcesMap,
      boundedScanLimit: BOUNDED_SCAN_CHUNK_LIMIT,
      embeddingModel: config.GEMINI_EMBEDDING_MODEL,
      embeddingDimensions: config.GEMINI_EMBEDDING_DIMENSIONS,
    };
  }

  // Fallback to deterministic keyword matching
  const regexQuery = new RegExp(escapeRegex(cleanQuery), 'i');
  const keywordChunks = await Chunk.find({
    resourceId: { $in: eligibleResourceIds },
    text: regexQuery,
  })
    .select('text pageNumber chunkIndex resourceId')
    .limit(limitNum)
    .lean();

  const candidateChunks = keywordChunks.map((chunk, idx) => {
    const resource = resourcesMap.get(chunk.resourceId.toString()) || null;
    return {
      sourceId: `S${idx + 1}`,
      chunkId: chunk._id,
      resourceId: chunk.resourceId,
      resource,
      title: resource?.title || 'Untitled Document',
      courseCode: resource?.courseCode || '',
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      score: 1.0,
      excerpt:
        chunk.text.length > 280
          ? chunk.text.slice(0, 280) + '...'
          : chunk.text,
      fullText: chunk.text,
    };
  });

  return {
    retrievalMode: 'keyword_fallback',
    query: cleanQuery,
    totalMatches: keywordChunks.length,
    candidateChunks,
    resourcesMap,
    boundedScanLimit: BOUNDED_SCAN_CHUNK_LIMIT,
    fallbackNotice:
      'Semantic vector similarity is currently unavailable. Using keyword matches instead.',
  };
}
