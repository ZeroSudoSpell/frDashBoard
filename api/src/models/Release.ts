import { Schema, model, type InferSchemaType } from 'mongoose';
import { STAGES } from '../domain.js';

/**
 * A promotion event: a specific build version moved to a release stage
 * (alpha / beta / rc / release). One version can have several releases
 * as it is promoted forward.
 */
const ReleaseSchema = new Schema(
  {
    project: { type: String, required: true, index: true },
    version: { type: String, required: true },
    board: { type: String, required: true },
    stage: { type: String, enum: STAGES, required: true, index: true },
    buildId: { type: Schema.Types.ObjectId, ref: 'Build', required: true },
    publishedBy: { type: String, required: true },
    publishedAt: { type: Date, required: true, index: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);

// A version can only be published to a given stage once per board.
ReleaseSchema.index({ project: 1, board: 1, version: 1, stage: 1 }, { unique: true });

export type ReleaseDoc = InferSchemaType<typeof ReleaseSchema>;
export const Release = model('Release', ReleaseSchema);
