import { Router } from 'express';
import { retrieveRelevantChunks } from '../services/retrievalService.js';

const router = Router();

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

    const retrieval = await retrieveRelevantChunks({
      query: cleanQuery,
      courseCode,
      semester,
      resourceType,
      resourceId,
      limit: limitNum,
    });

    if (retrieval.retrievalMode === 'semantic') {
      return res.json({
        success: true,
        mode: 'semantic',
        query: cleanQuery,
        embeddingModel: retrieval.embeddingModel,
        embeddingDimensions: retrieval.embeddingDimensions,
        boundedScanLimit: retrieval.boundedScanLimit,
        totalMatches: retrieval.totalMatches,
        results: retrieval.candidateChunks.map((c) => ({
          chunkId: c.chunkId,
          resourceId: c.resourceId,
          resource: c.resource,
          pageNumber: c.pageNumber,
          chunkIndex: c.chunkIndex,
          score: c.score,
          excerpt: c.excerpt,
          fullText: c.fullText,
        })),
      });
    }

    // Keyword fallback response
    return res.json({
      success: true,
      mode: 'keyword_fallback',
      fallbackNotice:
        retrieval.fallbackNotice ||
        'Semantic vector similarity is currently unavailable. Showing deterministic keyword matches instead.',
      query: cleanQuery,
      totalMatches: retrieval.totalMatches,
      boundedScanLimit: retrieval.boundedScanLimit,
      results: retrieval.candidateChunks.map((c) => ({
        chunkId: c.chunkId,
        resourceId: c.resourceId,
        resource: c.resource,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
        score: c.score,
        excerpt: c.excerpt,
        fullText: c.fullText,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
