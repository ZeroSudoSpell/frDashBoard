import { Schema, model, type InferSchemaType } from 'mongoose';
import { BUILD_STATUSES, STAGES } from '../domain.js';

/**
 * A single CI build of one project/branch/board combination.
 * Modeled after the build records a Jenkins pipeline writes back to Mongo.
 */
const BuildSchema = new Schema(
  {
    project: { type: String, required: true, index: true },
    branch: { type: String, required: true },
    board: { type: String, required: true },
    version: { type: String, required: true },
    stage: { type: String, enum: STAGES, required: true, index: true },
    status: { type: String, enum: BUILD_STATUSES, required: true, index: true },
    node: { type: String, required: true },
    jenkinsBuildNumber: { type: Number, required: true },
    durationSec: { type: Number, default: 0, min: 0 },
    artifacts: { type: [String], default: [] },
    startedAt: { type: Date, required: true, index: true },
    finishedAt: { type: Date },
    triggeredBy: { type: String, default: 'scheduler' },
  },
  { timestamps: true },
);

// The dashboard's hottest query: "builds for this project, newest first".
BuildSchema.index({ project: 1, startedAt: -1 });
// Uniqueness of a build within a pipeline.
BuildSchema.index({ project: 1, branch: 1, board: 1, jenkinsBuildNumber: 1 }, { unique: true });

export type BuildDoc = InferSchemaType<typeof BuildSchema>;
export const Build = model('Build', BuildSchema);
