import { Router } from 'express';
import mongoose from 'mongoose';
import { Resource } from '../models/Resource.js';
import { requireAuth } from '../middleware/auth.js';
import { calculateUserReputation } from '../services/reputationService.js';

const router = Router();

// GET /api/users/me/contributions — Get user's uploads and reputation breakdown
router.get('/me/contributions', requireAuth, async (req, res, next) => {
  try {
    const [uploads, reputation] = await Promise.all([
      Resource.find({ uploadedBy: req.user._id })
        .sort({ createdAt: -1 })
        .lean(),
      calculateUserReputation(req.user._id),
    ]);

    res.json({
      success: true,
      contributions: uploads,
      reputation,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id/reputation — Public reputation breakdown for any user
router.get('/:id/reputation', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid user ID', code: 'INVALID_ID' },
      });
    }

    const reputation = await calculateUserReputation(req.params.id);
    res.json({
      success: true,
      reputation,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
