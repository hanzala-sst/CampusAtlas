import { Router } from 'express';
import mongoose from 'mongoose';
import { Resource } from '../models/Resource.js';
import { Chunk } from '../models/Chunk.js';
import { embedQuery, cosineSimilarity } from '../services/embeddingService.js';
import { config } from '../config/env.js';

const router = Router();

// Helper to escape regex special characters for keyword search
function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// Bounded scan limit for initial in-memory similarity search over bounded demo corpus
const BOUNDED_SCAN_CHUNK_LIMIT = 1000;

// GET /api/search — Semantic retrieval with deterministic keyword fallback
router.get('/', async (req, res, next) => {
  try {
    const {
      q,
      courseCode,
      semester,
      resourceType,
      resourceId,
      limit = 10,
    } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Query parameter "q" must be at least 2 characters long.',
          code: 'INVALID_QUERY',
        },
      });
    }

    if (q.trim().length > 200) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Query parameter "q" exceeds the 200 character limit.',
          code: 'INVALID_QUERY',
        },
      });
    }

    const cleanQuery = q.trim();
    const limitNum = Math.min(30, Math.max(1, parseInt(limit, 10) || 10));

    // Build resource eligibility filter:
    // Only search resources that are ready and not archived
    const resourceFilter = {
      ingestionStatus: 'ready',
      verificationStatus: { $ne: 'archived' },
    };

    if (courseCode) {
      resourceFilter.courseCode = courseCode.trim().toUpperCase();
    }

    if (semester) {
      const semNum = parseInt(semester, 10);
      if (!isNaN(semNum)) resourceFilter.semester = semNum;
    }

    if (resourceType) {
      resourceFilter.resourceType = resourceType;
    }

    if (resourceId && mongoose.Types.ObjectId.isValid(resourceId)) {
      resourceFilter._id = resourceId;
    }

    // Find eligible resources and project safe metadata only (never fileData)
    const eligibleResources = await Resource.find(resourceFilter)
      .select(
        '_id title courseCode courseName subject semester academicYear resourceType verificationStatus pageCount voteScore upvoteCount'
      )
      .lean();

    if (eligibleResources.length === 0) {
      return res.json({
        success: true,
        mode: config.GEMINI_API_KEY ? 'semantic' : 'keyword_fallback',
        query: cleanQuery,
        totalMatches: 0,
        results: [],
        boundedScanLimit: BOUNDED_SCAN_CHUNK_LIMIT,
      });
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

        if (Array.isArray(queryVector) && queryVector.length === config.GEMINI_EMBEDDING_DIMENSIONS) {
          // Fetch chunks for eligible resources with embeddings included
          const candidateChunks = await Chunk.find({
            resourceId: { $in: eligibleResourceIds },
          })
            .select('+embedding text pageNumber chunkIndex resourceId')
            .limit(BOUNDED_SCAN_CHUNK_LIMIT)
            .lean();

          for (const chunk of candidateChunks) {
            const score = cosineSimilarity(queryVector, chunk.embedding);
            if (score > 0.35) { // Relevance threshold
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
        console.warn('[Search Notice] Semantic embedding retrieval unavailable, engaging keyword fallback:', embedErr.message);
        semanticSucceeded = false;
      }
    }

    // If semantic search succeeded, return ranked semantic results
    if (semanticSucceeded) {
      const topResults = scoredChunks.slice(0, limitNum);

      return res.json({
        success: true,
        mode: 'semantic',
        query: cleanQuery,
        embeddingModel: config.GEMINI_EMBEDDING_MODEL,
        embeddingDimensions: config.GEMINI_EMBEDDING_DIMENSIONS,
        boundedScanLimit: BOUNDED_SCAN_CHUNK_LIMIT,
        totalMatches: scoredChunks.length,
        results: topResults.map((item) => ({
          chunkId: item.chunk._id,
          resourceId: item.chunk.resourceId,
          resource: resourcesMap.get(item.chunk.resourceId.toString()) || null,
          pageNumber: item.chunk.pageNumber,
          chunkIndex: item.chunk.chunkIndex,
          score: Math.round(item.score * 1000) / 1000,
          excerpt:
            item.chunk.text.length > 280
              ? item.chunk.text.slice(0, 280) + '...'
              : item.chunk.text,
          fullText: item.chunk.text,
        })),
      });
    }

    // Keyword Fallback Mode (deterministic regex matching across eligible chunk text)
    const regexQuery = new RegExp(escapeRegex(cleanQuery), 'i');
    const keywordChunks = await Chunk.find({
      resourceId: { $in: eligibleResourceIds },
      text: regexQuery,
    })
      .select('text pageNumber chunkIndex resourceId')
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      mode: 'keyword_fallback',
      fallbackNotice:
        'Semantic vector similarity is currently unavailable. Showing deterministic keyword matches instead.',
      query: cleanQuery,
      totalMatches: keywordChunks.length,
      results: keywordChunks.map((chunk) => ({
        chunkId: chunk._id,
        resourceId: chunk.resourceId,
        resource: resourcesMap.get(chunk.resourceId.toString()) || null,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        score: 1.0,
        excerpt:
          chunk.text.length > 280
            ? chunk.text.slice(0, 280) + '...'
            : chunk.text,
        fullText: chunk.text,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
