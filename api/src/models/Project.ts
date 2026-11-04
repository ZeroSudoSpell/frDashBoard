import { Schema, model, type InferSchemaType } from 'mongoose';

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    codename: { type: String, required: true, trim: true },
    partNumber: { type: String, required: true, unique: true, trim: true },
    boards: { type: [String], required: true, default: [] },
    branches: { type: [String], required: true, default: ['main'] },
    description: { type: String, default: '' },
  },
  { timestamps: true },
);

ProjectSchema.index({ codename: 1 });

export type ProjectDoc = InferSchemaType<typeof ProjectSchema>;
export const Project = model('Project', ProjectSchema);
