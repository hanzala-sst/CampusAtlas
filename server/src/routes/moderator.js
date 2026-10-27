import { Router } from 'express';
import mongoose from 'mongoose';
import { Resource } from '../models/Resource.js';
import { Report } from '../models/Report.js';
import { requireAuth, requireModerator } from '../middleware/auth.js';

const router = Router();

// Apply authentication and moderator authorization to all moderator endpoints
router.use(requireAuth, requireModerator);

// GET /api/moderator/queue — Retrieve active moderation queue and statistics
router.get('/queue', async (req, res, next) => {
  try {
    const [openReports, unverifiedCount, verifiedCount, openReportCount] =
      await Promise.all([
        Report.find({ status: 'open' })
          .sort({ createdAt: -1 })
          .populate('resourceId', 'title courseCode fileName uploadedBy verificationStatus')
          .populate('reporterId', 'name email')
          .lean(),
        Resource.countDocuments({ verificationStatus: 'unverified' }),
        Resource.countDocuments({ verificationStatus: 'verified' }),
        Report.countDocuments({ status: 'open' }),
      ]);

    // Fetch up to 20 unverified or flagged resources pending review
    const pendingResources = await Resource.find({
      verificationStatus: { $in: ['unverified', 'flagged'] },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('uploadedBy', 'name email role')
      .lean();

    res.json({
      success: true,
      stats: {
        openReports: openReportCount,
        unverifiedResources: unverifiedCount,
        verifiedResources: verifiedCount,
      },
      reports: openReports,
      pendingResources,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/moderator/resources/:id/verify — Authorize and mark resource as Verified
router.patch('/resources/:id/verify', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid resource ID', code: 'INVALID_ID' },
      });
    }

    const { note } = req.body || {};
    const resource = await Resource.findById(req.params.id);

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { message: 'Resource not found', code: 'NOT_FOUND' },
      });
    }

    resource.verificationStatus = 'verified';
    resource.verifiedBy = req.user._id;
    resource.verifiedAt = new Date();
    resource.verificationNote = note ? note.trim() : 'Verified by moderator';
    await resource.save();

    const updated = await Resource.findById(resource._id)
      .populate('uploadedBy', 'name role')
      .populate('verifiedBy', 'name role');

    res.json({
      success: true,
      message: 'Resource successfully verified.',
      resource: updated,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/moderator/resources/:id/unverify — Revoke Verified badge
router.patch('/resources/:id/unverify', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid resource ID', code: 'INVALID_ID' },
      });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { message: 'Resource not found', code: 'NOT_FOUND' },
      });
    }

    resource.verificationStatus = 'unverified';
    resource.verifiedBy = null;
    resource.verifiedAt = null;
    resource.verificationNote = null;
    await resource.save();

    const updated = await Resource.findById(resource._id).populate(
      'uploadedBy',
      'name role'
    );

    res.json({
      success: true,
      message: 'Resource verification badge revoked (status: unverified).',
      resource: updated,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/moderator/resources/:id/archive — Archive/quarantine resource from public view
router.patch('/resources/:id/archive', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid resource ID', code: 'INVALID_ID' },
      });
    }

    const resource = await Resource.findById(req.params.id);
    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { message: 'Resource not found', code: 'NOT_FOUND' },
      });
    }

    resource.verificationStatus = 'archived';
    resource.verifiedBy = req.user._id;
    resource.verifiedAt = new Date();
    resource.verificationNote = req.body?.note
      ? req.body.note.trim()
      : 'Archived by moderator';
    await resource.save();

    res.json({
      success: true,
      message: 'Resource archived and removed from public view.',
      resource,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/moderator/reports/:id — Resolve or dismiss a user report
router.patch('/reports/:id', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid report ID', code: 'INVALID_ID' },
      });
    }

    const { status, resolutionNotes } = req.body || {};
    if (!['resolved', 'dismissed'].includes(status)) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Status must be either "resolved" or "dismissed".',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: { message: 'Report not found', code: 'NOT_FOUND' },
      });
    }

    report.status = status;
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    report.resolutionNotes = resolutionNotes ? resolutionNotes.trim() : '';
    await report.save();

    res.json({
      success: true,
      message: `Report marked as ${status}.`,
      report,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
