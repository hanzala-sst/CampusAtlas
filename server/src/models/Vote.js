import mongoose from 'mongoose';

const voteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    value: {
      type: Number,
      required: true,
      enum: [-1, 1],
    },
  },
  {
    timestamps: true,
  }
);

// Strict unique compound index: one vote record per user per resource
voteSchema.index({ userId: 1, resourceId: 1 }, { unique: true });

export const Vote = mongoose.model('Vote', voteSchema);
