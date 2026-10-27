import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: true,
      index: true,
    },
    pageNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    embedding: {
      type: [Number],
      required: true,
      select: false, // Never return vector arrays in standard API responses
    },
    embeddingModel: {
      type: String,
      required: true,
      default: 'gemini-embedding-001',
    },
    embeddingDimensions: {
      type: Number,
      required: true,
      default: 768,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for chunk retrieval and ordering
chunkSchema.index({ resourceId: 1, chunkIndex: 1 });
chunkSchema.index({ resourceId: 1, pageNumber: 1 });
chunkSchema.index({ text: 'text' });

export const Chunk = mongoose.model('Chunk', chunkSchema);
