import { Router } from 'express';
import { z } from 'zod';
import { typedBody, typedQuery, validate } from '../middleware/validate.js';
import { createBuild, getBuild, listBuilds, updateBuildStatus } from '../services/builds.js';
import {
  BuildSchema,
  CreateBuildSchema,
  ErrorSchema,
  ListBuildsQuery,
  ObjectIdSchema,
  PaginatedBuilds,
  UpdateBuildStatusSchema,
  registry,
} from '../schemas/index.js';

export const buildsRouter = Router();
const IdParams = z.object({ id: ObjectIdSchema });

registry.registerPath({
  method: 'get',
  path: '/api/builds',
  tags: ['Builds'],
  summary: 'List builds with filtering, search, sorting and pagination',
  request: { query: ListBuildsQuery },
  responses: { 200: { description: 'Page of builds', content: { 'application/json': { schema: PaginatedBuilds } } } },
});
buildsRouter.get('/', validate({ query: ListBuildsQuery }), async (req, res, next) => {
  try {
    res.json(await listBuilds(typedQuery<typeof ListBuildsQuery>(req)));
  } catch (e) {
    next(e);
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/builds/{id}',
  tags: ['Builds'],
  summary: 'Get a build by id',
  request: { params: IdParams },
  responses: {
    200: { description: 'Build', content: { 'application/json': { schema: BuildSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
buildsRouter.get('/:id', validate({ params: IdParams }), async (req, res, next) => {
  try {
    res.json(await getBuild(req.params.id!));
  } catch (e) {
    next(e);
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/builds',
  tags: ['Builds'],
  summary: 'Record a new CI build (what a pipeline calls when a job starts)',
  request: { body: { content: { 'application/json': { schema: CreateBuildSchema } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: BuildSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Duplicate build number', content: { 'application/json': { schema: ErrorSchema } } },
    422: { description: 'Unknown project or board', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
buildsRouter.post('/', validate({ body: CreateBuildSchema }), async (req, res, next) => {
  try {
    res.status(201).json(await createBuild(typedBody<typeof CreateBuildSchema>(req)));
  } catch (e) {
    next(e);
  }
});

registry.registerPath({
  method: 'patch',
  path: '/api/builds/{id}/status',
  tags: ['Builds'],
  summary: 'Update build status (what a pipeline calls when a job finishes)',
  request: { params: IdParams, body: { content: { 'application/json': { schema: UpdateBuildStatusSchema } } } },
  responses: {
    200: { description: 'Updated', content: { 'application/json': { schema: BuildSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Illegal transition', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
buildsRouter.patch(
  '/:id/status',
  validate({ params: IdParams, body: UpdateBuildStatusSchema }),
  async (req, res, next) => {
    try {
      res.json(await updateBuildStatus(req.params.id!, typedBody<typeof UpdateBuildStatusSchema>(req)));
    } catch (e) {
      next(e);
    }
  },
);
