import { Router } from 'express';
import { typedBody, typedQuery, validate } from '../middleware/validate.js';
import { listReleases, promoteBuild } from '../services/releases.js';
import {
  ErrorSchema,
  ListReleasesQuery,
  PaginatedReleases,
  PromoteBuildSchema,
  ReleaseSchema,
  registry,
} from '../schemas/index.js';

export const releasesRouter = Router();

registry.registerPath({
  method: 'get',
  path: '/api/releases',
  tags: ['Releases'],
  summary: 'List release/promotion events',
  request: { query: ListReleasesQuery },
  responses: { 200: { description: 'Page of releases', content: { 'application/json': { schema: PaginatedReleases } } } },
});
releasesRouter.get('/', validate({ query: ListReleasesQuery }), async (req, res, next) => {
  try {
    res.json(await listReleases(typedQuery<typeof ListReleasesQuery>(req)));
  } catch (e) {
    next(e);
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/releases/promote',
  tags: ['Releases'],
  summary: 'Promote a successful build to alpha / beta / rc / release',
  description:
    'Guardrails: build must be successful, promotion must move forward through the lifecycle, and a version cannot be published to the same stage twice.',
  request: { body: { content: { 'application/json': { schema: PromoteBuildSchema } } } },
  responses: {
    201: { description: 'Release created', content: { 'application/json': { schema: ReleaseSchema } } },
    404: { description: 'Build not found', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Guardrail violated', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
releasesRouter.post('/promote', validate({ body: PromoteBuildSchema }), async (req, res, next) => {
  try {
    res.status(201).json(await promoteBuild(typedBody<typeof PromoteBuildSchema>(req)));
  } catch (e) {
    next(e);
  }
});
