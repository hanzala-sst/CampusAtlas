import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    courseCode: {
      type: String,
      required: [true, 'Course code is required (e.g., CS101)'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'Course code cannot exceed 20 characters'],
    },
    courseName: {
      type: String,
      required: [true, 'Course name is required'],
      trim: true,
      maxlength: [150, 'Course name cannot exceed 150 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [100, 'Subject cannot exceed 100 characters'],
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be between 1 and 10'],
      max: [10, 'Semester must be between 1 and 10'],
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required (e.g., 2024-2025)'],
      trim: true,
      maxlength: [20, 'Academic year cannot exceed 20 characters'],
    },
    resourceType: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: ['lecture-notes', 'pyq', 'lab-manual', 'assignment', 'reference'],
        message: '{VALUE} is not a valid resource type',
      },
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader ID is required'],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true,
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      max: [8 * 1024 * 1024, 'File size exceeds maximum 8 MiB limit'],
    },
    mimeType: {
      type: String,
      required: true,
      default: 'application/pdf',
    },
    fileData: {
      type: Buffer,
      required: [true, 'File data buffer is required'],
      select: false, // Never return binary data in list or standard detail queries
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    ingestionStatus: {
      type: String,
      enum: ['queued', 'processing', 'ready', 'failed'],
      default: 'queued',
      index: true,
    },
    ingestionError: {
      type: String,
      default: null,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'flagged', 'archived'],
      default: 'unverified',
      index: true,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verificationNote: {
      type: String,
      default: null,
    },
    voteScore: {
      type: Number,
      default: 0,
      index: true,
    },
    upvoteCount: {
      type: Number,
      default: 0,
    },
    downvoteCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound and text indexes for rapid search and filtering
resourceSchema.index({ courseCode: 1, semester: 1, resourceType: 1 });
resourceSchema.index({ verificationStatus: 1, createdAt: -1 });
resourceSchema.index(
  {
    title: 'text',
    courseCode: 'text',
    courseName: 'text',
    subject: 'text',
  },
  {
    weights: {
      title: 10,
      courseCode: 8,
      courseName: 5,
      subject: 3,
    },
    name: 'ResourceTextIndex',
  }
);

export const Resource = mongoose.model('Resource', resourceSchema);
