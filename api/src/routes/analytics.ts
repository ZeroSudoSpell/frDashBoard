import { Router } from 'express';
import { z } from 'zod';
import { typedQuery, validate } from '../middleware/validate.js';
import { nodeLoad, releaseHistogram, summary } from '../services/analytics.js';
import { HistogramBucketSchema, HistogramQuery, NodeLoadSchema, SummarySchema, registry } from '../schemas/index.js';

export const analyticsRouter = Router();

registry.registerPath({
  method: 'get',
  path: '/api/analytics/summary',
  tags: ['Analytics'],
  summary: 'Headline numbers for the last 30 days',
  responses: { 200: { description: 'Summary', content: { 'application/json': { schema: SummarySchema } } } },
});
analyticsRouter.get('/summary', async (_req, res, next) => {
  try {
    res.json(await summary());
  } catch (e) {
    next(e);
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/analytics/release-histogram',
  tags: ['Analytics'],
  summary: 'Releases per day/week/month, split by stage',
  request: { query: HistogramQuery },
  responses: {
    200: { description: 'Buckets', content: { 'application/json': { schema: z.array(HistogramBucketSchema) } } },
  },
});
analyticsRouter.get('/release-histogram', validate({ query: HistogramQuery }), async (req, res, next) => {
  try {
    const q = typedQuery<typeof HistogramQuery>(req);
    res.json(await releaseHistogram(q.range, q.project));
  } catch (e) {
    next(e);
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/analytics/node-load',
  tags: ['Analytics'],
  summary: 'Build load per CI node over the last 30 days',
  responses: { 200: { description: 'Nodes', content: { 'application/json': { schema: z.array(NodeLoadSchema) } } } },
});
analyticsRouter.get('/node-load', async (_req, res, next) => {
  try {
    res.json(await nodeLoad());
  } catch (e) {
    next(e);
  }
});
