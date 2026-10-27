import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { Resource } from '../models/Resource.js';
import { Vote } from '../models/Vote.js';
import { Comment } from '../models/Comment.js';
import { Report } from '../models/Report.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { calculateUserReputation } from '../services/reputationService.js';

const router = Router();

// Multer memory storage configured with 8 MiB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8 MiB strict limit
  },
  fileFilter: (req, file, cb) => {
    // Basic extension and client MIME check (PDF magic bytes checked after buffer is received)
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents (.pdf) are permitted'), false);
    }
  },
});

// Helper to validate PDF magic bytes signature (%PDF-)
function isValidPdfBuffer(buffer) {
  if (!buffer || buffer.length < 5) return false;
  // Check header %PDF- (hex: 25 50 44 46 2d)
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}

// POST /api/resources — Upload PDF and metadata
router.post('/', requireAuth, upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'PDF file is required.',
          code: 'FILE_REQUIRED',
        },
      });
    }

    // Verify PDF file signature (magic bytes)
    if (!isValidPdfBuffer(file.buffer)) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'The uploaded file is not a valid PDF document.',
          code: 'INVALID_PDF_SIGNATURE',
        },
      });
    }

    const {
      title,
      description,
      courseCode,
      courseName,
      subject,
      semester,
      academicYear,
      resourceType,
    } = req.body || {};

    if (!title || !courseCode || !courseName || !subject || !semester || !academicYear || !resourceType) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Missing required metadata fields (title, courseCode, courseName, subject, semester, academicYear, resourceType).',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const parsedSemester = parseInt(semester, 10);
    if (isNaN(parsedSemester) || parsedSemester < 1 || parsedSemester > 10) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Semester must be a valid number between 1 and 10.',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const resource = await Resource.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      courseCode: courseCode.trim().toUpperCase(),
      courseName: courseName.trim(),
      subject: subject.trim(),
      semester: parsedSemester,
      academicYear: academicYear.trim(),
      resourceType,
      uploadedBy: req.user._id,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: 'application/pdf',
      fileData: file.buffer, // Bounded BSON storage (max 8 MiB)
      ingestionStatus: 'queued', // Explicitly queued until Milestone 3 adds extraction
      verificationStatus: 'unverified',
    });

    // Fetch created resource without fileData
    const cleanResource = await Resource.findById(resource._id).populate(
      'uploadedBy',
      'name email role'
    );

    res.status(201).json({
      success: true,
      message: 'Resource uploaded successfully and queued for indexing.',
      resource: cleanResource,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/resources — List and filter resources with pagination
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      search,
      courseCode,
      resourceType,
      semester,
      verificationStatus,
      sortBy = 'newest',
      page = 1,
      limit = 10,
    } = req.query;

    const query = {};

    // Standard non-moderator queries exclude archived resources
    if (req.user?.role === 'moderator' && verificationStatus) {
      query.verificationStatus = verificationStatus;
    } else {
      query.verificationStatus = { $ne: 'archived' };
      if (verificationStatus && ['unverified', 'verified', 'flagged'].includes(verificationStatus)) {
        query.verificationStatus = verificationStatus;
      }
    }

    if (courseCode) {
      query.courseCode = courseCode.trim().toUpperCase();
    }

    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (semester) {
      const semNum = parseInt(semester, 10);
      if (!isNaN(semNum)) query.semester = semNum;
    }

    if (search && search.trim().length > 0) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { courseCode: { $regex: term, $options: 'i' } },
        { courseName: { $regex: term, $options: 'i' } },
        { subject: { $regex: term, $options: 'i' } },
      ];
    }

    const sortOptions = {};
    if (sortBy === 'top') {
      sortOptions.voteScore = -1;
      sortOptions.createdAt = -1;
    } else if (sortBy === 'title') {
      sortOptions.title = 1;
    } else {
      sortOptions.createdAt = -1;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [resources, total] = await Promise.all([
      Resource.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('uploadedBy', 'name role')
        .lean(),
      Resource.countDocuments(query),
    ]);

    // If user is authenticated, attach user's personal vote for each resource
    let userVotesMap = new Map();
    if (req.user && resources.length > 0) {
      const resourceIds = resources.map((r) => r._id);
      const userVotes = await Vote.find({
        userId: req.user._id,
        resourceId: { $in: resourceIds },
      }).lean();

      userVotes.forEach((v) => {
        userVotesMap.set(v.resourceId.toString(), v.value);
      });
    }

    const decoratedResources = resources.map((r) => ({
      ...r,
      userVote: userVotesMap.get(r._id.toString()) || 0,
    }));

    res.json({
      success: true,
      resources: decoratedResources,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/:id — Single resource detail
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid resource ID', code: 'INVALID_ID' },
      });
    }

    const resource = await Resource.findById(req.params.id)
      .populate('uploadedBy', 'name role createdAt')
      .populate('verifiedBy', 'name role')
      .lean();

    if (!resource) {
      return res.status(404).json({
        success: false,
        error: { message: 'Resource not found', code: 'NOT_FOUND' },
      });
    }

    // Archived resources only visible to moderator or uploader
    if (
      resource.verificationStatus === 'archived' &&
      req.user?.role !== 'moderator' &&
      req.user?._id?.toString() !== resource.uploadedBy?._id?.toString()
    ) {
      return res.status(404).json({
        success: false,
        error: { message: 'Resource is archived and unavailable', code: 'ARCHIVED' },
      });
    }

    let userVote = 0;
    if (req.user) {
      const voteRecord = await Vote.findOne({
        userId: req.user._id,
        resourceId: resource._id,
      }).lean();
      if (voteRecord) userVote = voteRecord.value;
    }

    let uploaderReputation = null;
    if (resource.uploadedBy?._id) {
      uploaderReputation = await calculateUserReputation(resource.uploadedBy._id);
    }

    res.json({
      success: true,
      resource: {
        ...resource,
        userVote,
        uploaderReputation,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/:id/preview — Inline PDF stream
router.get('/:id/preview', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid resource ID', code: 'INVALID_ID' },
      });
    }

    const resource = await Resource.findById(req.params.id).select('+fileData');
    if (!resource || !resource.fileData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document file not found', code: 'FILE_NOT_FOUND' },
      });
    }

    if (
      resource.verificationStatus === 'archived' &&
      req.user?.role !== 'moderator' &&
      req.user?._id?.toString() !== resource.uploadedBy?.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access to archived document is restricted', code: 'FORBIDDEN' },
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(resource.fileName)}"`
    );
    res.setHeader('Content-Length', resource.fileData.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.send(resource.fileData);
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/:id/download — Download PDF file
router.get('/:id/download', optionalAuth, async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid resource ID', code: 'INVALID_ID' },
      });
    }

    const resource = await Resource.findById(req.params.id).select('+fileData');
    if (!resource || !resource.fileData) {
      return res.status(404).json({
        success: false,
        error: { message: 'Document file not found', code: 'FILE_NOT_FOUND' },
      });
    }

    if (
      resource.verificationStatus === 'archived' &&
      req.user?.role !== 'moderator' &&
      req.user?._id?.toString() !== resource.uploadedBy?.toString()
    ) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access to archived document is restricted', code: 'FORBIDDEN' },
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(resource.fileName)}"`
    );
    res.setHeader('Content-Length', resource.fileData.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.send(resource.fileData);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/resources/:id — Edit resource metadata (owner or moderator only)
router.patch('/:id', requireAuth, async (req, res, next) => {
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

    const isOwner = resource.uploadedBy.toString() === req.user._id.toString();
    const isModerator = req.user.role === 'moderator';

    if (!isOwner && !isModerator) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to edit this resource.',
          code: 'FORBIDDEN',
        },
      });
    }

    // Only allow specified metadata updates; never allow role or verification changes here
    const {
      title,
      description,
      courseCode,
      courseName,
      subject,
      semester,
      academicYear,
      resourceType,
    } = req.body || {};

    if (title) resource.title = title.trim();
    if (description !== undefined) resource.description = description.trim();
    if (courseCode) resource.courseCode = courseCode.trim().toUpperCase();
    if (courseName) resource.courseName = courseName.trim();
    if (subject) resource.subject = subject.trim();
    if (semester) {
      const semNum = parseInt(semester, 10);
      if (!isNaN(semNum) && semNum >= 1 && semNum <= 10) resource.semester = semNum;
    }
    if (academicYear) resource.academicYear = academicYear.trim();
    if (
      resourceType &&
      ['lecture-notes', 'pyq', 'lab-manual', 'assignment', 'reference'].includes(
        resourceType
      )
    ) {
      resource.resourceType = resourceType;
    }

    await resource.save();

    const updatedResource = await Resource.findById(resource._id).populate(
      'uploadedBy',
      'name role'
    );

    res.json({
      success: true,
      message: 'Resource metadata updated successfully.',
      resource: updatedResource,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/resources/:id — Delete resource and cascade children (owner or moderator only)
router.delete('/:id', requireAuth, async (req, res, next) => {
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

    const isOwner = resource.uploadedBy.toString() === req.user._id.toString();
    const isModerator = req.user.role === 'moderator';

    if (!isOwner && !isModerator) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to delete this resource.',
          code: 'FORBIDDEN',
        },
      });
    }

    // Delete resource
    await Resource.findByIdAndDelete(resource._id);

    // Cascading cleanups: votes, comments, reports
    await Promise.all([
      Vote.deleteMany({ resourceId: resource._id }),
      Comment.deleteMany({ resourceId: resource._id }),
      Report.deleteMany({ resourceId: resource._id }),
    ]);

    res.json({
      success: true,
      message: 'Resource and associated records deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/resources/:id/vote — Cast, change, or remove upvote/downvote
router.post('/:id/vote', requireAuth, async (req, res, next) => {
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

    const { value } = req.body || {};
    const parsedValue = parseInt(value, 10);

    if (![1, -1, 0].includes(parsedValue)) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Vote value must be 1 (upvote), -1 (downvote), or 0 (remove vote).',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const userId = req.user._id;
    const resourceId = resource._id;

    if (parsedValue === 0) {
      // Remove vote
      await Vote.findOneAndDelete({ userId, resourceId });
    } else {
      // Upsert vote (unique compound index ensures no duplicate vote records)
      await Vote.findOneAndUpdate(
        { userId, resourceId },
        { value: parsedValue },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    // Recalculate vote counts atomically
    const [upvoteCount, downvoteCount] = await Promise.all([
      Vote.countDocuments({ resourceId, value: 1 }),
      Vote.countDocuments({ resourceId, value: -1 }),
    ]);

    const voteScore = upvoteCount - downvoteCount;

    resource.upvoteCount = upvoteCount;
    resource.downvoteCount = downvoteCount;
    resource.voteScore = voteScore;
    await resource.save();

    res.json({
      success: true,
      userVote: parsedValue,
      voteScore,
      upvoteCount,
      downvoteCount,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/resources/:id/comments — List comments for resource
router.get('/:id/comments', async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid resource ID', code: 'INVALID_ID' },
      });
    }

    const comments = await Comment.find({ resourceId: req.params.id })
      .sort({ createdAt: -1 })
      .populate('userId', 'name role')
      .lean();

    res.json({
      success: true,
      comments,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/resources/:id/comments — Add a comment to resource
router.post('/:id/comments', requireAuth, async (req, res, next) => {
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

    const { body } = req.body || {};
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return res.status(422).json({
        success: false,
        error: { message: 'Comment body cannot be empty.', code: 'VALIDATION_ERROR' },
      });
    }

    if (body.trim().length > 1500) {
      return res.status(422).json({
        success: false,
        error: { message: 'Comment exceeds 1500 character limit.', code: 'VALIDATION_ERROR' },
      });
    }

    const comment = await Comment.create({
      resourceId: resource._id,
      userId: req.user._id,
      body: body.trim(),
    });

    // Increment commentCount
    await Resource.findByIdAndUpdate(resource._id, { $inc: { commentCount: 1 } });

    const populatedComment = await Comment.findById(comment._id).populate(
      'userId',
      'name role'
    );

    res.status(201).json({
      success: true,
      comment: populatedComment,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/resources/:id/comments/:commentId — Delete comment (author or moderator)
router.delete('/:id/comments/:commentId', requireAuth, async (req, res, next) => {
  try {
    const { id: resourceId, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid comment ID', code: 'INVALID_ID' },
      });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Comment not found', code: 'NOT_FOUND' },
      });
    }

    const isAuthor = comment.userId.toString() === req.user._id.toString();
    const isModerator = req.user.role === 'moderator';

    if (!isAuthor && !isModerator) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'You do not have permission to delete this comment.',
          code: 'FORBIDDEN',
        },
      });
    }

    await Comment.findByIdAndDelete(comment._id);
    await Resource.findByIdAndUpdate(resourceId, { $inc: { commentCount: -1 } });

    res.json({
      success: true,
      message: 'Comment deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/resources/:id/report — Submit a community report on a resource
router.post('/:id/report', requireAuth, async (req, res, next) => {
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

    const { reason, details } = req.body || {};

    const validReasons = [
      'incorrect_course',
      'copyright_issue',
      'poor_quality',
      'misleading_content',
      'spam_or_abuse',
      'other',
    ];

    if (!reason || !validReasons.includes(reason)) {
      return res.status(422).json({
        success: false,
        error: {
          message: `Invalid reason. Must be one of: [${validReasons.join(', ')}]`,
          code: 'VALIDATION_ERROR',
        },
      });
    }

    // Duplicate open report protection: Prevent same user opening multiple reports on same resource
    const existingOpenReport = await Report.findOne({
      resourceId: resource._id,
      reporterId: req.user._id,
      status: 'open',
    });

    if (existingOpenReport) {
      return res.status(409).json({
        success: false,
        error: {
          message:
            'You already have an open report pending moderator review for this document.',
          code: 'DUPLICATE_OPEN_REPORT',
        },
      });
    }

    const report = await Report.create({
      resourceId: resource._id,
      reporterId: req.user._id,
      reason,
      details: details ? details.trim() : '',
      status: 'open',
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. A moderator will review it shortly.',
      reportId: report._id,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
