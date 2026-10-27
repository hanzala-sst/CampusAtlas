import { Router } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/auth.js';
import { retrieveRelevantChunks } from '../services/retrievalService.js';
import { generateGroundedAnswer } from '../services/generationService.js';
import { config } from '../config/env.js';

const router = Router();

// POST /api/ask — Grounded "Ask the Doc" RAG Q&A
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { question, resourceId, courseCode, semester, resourceType } = req.body;

    // Validate question
    if (!question || typeof question !== 'string' || question.trim().length < 2) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Question must be at least 2 characters long.',
          code: 'INVALID_QUESTION',
        },
      });
    }

    if (question.trim().length > 1200) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Question exceeds the 1200 character limit.',
          code: 'INVALID_QUESTION',
        },
      });
    }

    // Validate resourceId if provided
    if (resourceId && !mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Invalid resource ID format.',
          code: 'INVALID_RESOURCE_ID',
        },
      });
    }

    const cleanQuestion = question.trim();

    // Retrieve eligible persisted chunks using shared retrieval service
    const retrieval = await retrieveRelevantChunks({
      query: cleanQuestion,
      courseCode,
      semester,
      resourceType,
      resourceId,
      limit: 8,
    });

    // If no eligible evidence is found, skip generation and return honest abstention
    if (retrieval.candidateChunks.length === 0) {
      return res.json({
        success: true,
        answer:
          'I could not find any relevant information in the selected document(s) to answer your question.',
        abstained: true,
        abstentionReason: 'NO_EVIDENCE_FOUND',
        retrievalMode: retrieval.retrievalMode,
        sources: [],
      });
    }

    // Check if AI service is configured
    if (!config.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: {
          message:
            'AI generation service is currently unavailable because the API key is not configured on the server.',
          code: 'AI_SERVICE_UNAVAILABLE',
        },
      });
    }

    // Generate grounded answer strictly from retrieved candidate chunks
    let generationResult;
    try {
      generationResult = await generateGroundedAnswer({
        question: cleanQuestion,
        candidateChunks: retrieval.candidateChunks,
      });
    } catch (genErr) {
      console.error('[Ask Route Error] Gemini generation failed:', genErr.message);
      return res.status(503).json({
        success: false,
        error: {
          message:
            'The AI assistant is temporarily unavailable or overloaded. Please try again shortly.',
          code: 'AI_GENERATION_FAILED',
        },
      });
    }

    // Build verified source cards strictly from candidate chunk database records
    const candidateMap = new Map(
      retrieval.candidateChunks.map((c) => [c.sourceId, c])
    );

    const verifiedSources = (generationResult.citedSourceIds || [])
      .map((sourceId) => {
        const chunk = candidateMap.get(sourceId);
        if (!chunk) return null;
        return {
          sourceId: chunk.sourceId,
          resourceId: chunk.resourceId,
          title: chunk.title,
          courseCode: chunk.courseCode,
          pageNumber: chunk.pageNumber,
          excerpt: chunk.excerpt,
          score: chunk.score,
        };
      })
      .filter(Boolean);

    return res.json({
      success: true,
      answer: generationResult.answer,
      abstained: generationResult.abstained,
      abstentionReason: generationResult.abstentionReason,
      retrievalMode: retrieval.retrievalMode,
      fallbackNotice: retrieval.fallbackNotice || null,
      sources: verifiedSources,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
