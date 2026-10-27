import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: [true, 'Comment cannot be empty'],
      trim: true,
      minlength: [1, 'Comment cannot be empty'],
      maxlength: [1500, 'Comment cannot exceed 1500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ resourceId: 1, createdAt: -1 });

export const Comment = mongoose.model('Comment', commentSchema);
