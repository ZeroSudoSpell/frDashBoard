import { Router } from 'express';
import { z } from 'zod';
import { Project } from '../models/Project.js';
import { HttpError } from '../middleware/errors.js';
import { typedBody, validate } from '../middleware/validate.js';
import { CreateProjectSchema, ErrorSchema, ProjectSchema, registry } from '../schemas/index.js';

export const projectsRouter = Router();

registry.registerPath({
  method: 'get',
  path: '/api/projects',
  tags: ['Projects'],
  summary: 'List all firmware projects',
  responses: { 200: { description: 'Projects', content: { 'application/json': { schema: z.array(ProjectSchema) } } } },
});
projectsRouter.get('/', async (_req, res, next) => {
  try {
    res.json(await Project.find().sort({ name: 1 }).lean());
  } catch (e) {
    next(e);
  }
});

registry.registerPath({
  method: 'get',
  path: '/api/projects/{name}',
  tags: ['Projects'],
  summary: 'Get one project by name',
  request: { params: z.object({ name: z.string() }) },
  responses: {
    200: { description: 'Project', content: { 'application/json': { schema: ProjectSchema } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
projectsRouter.get('/:name', async (req, res, next) => {
  try {
    const project = await Project.findOne({ name: req.params.name }).lean();
    if (!project) throw new HttpError(404, `Project ${req.params.name} not found`);
    res.json(project);
  } catch (e) {
    next(e);
  }
});

registry.registerPath({
  method: 'post',
  path: '/api/projects',
  tags: ['Projects'],
  summary: 'Create a project',
  request: { body: { content: { 'application/json': { schema: CreateProjectSchema } } } },
  responses: {
    201: { description: 'Created', content: { 'application/json': { schema: ProjectSchema } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorSchema } } },
    409: { description: 'Duplicate name or part number', content: { 'application/json': { schema: ErrorSchema } } },
  },
});
projectsRouter.post('/', validate({ body: CreateProjectSchema }), async (req, res, next) => {
  try {
    const created = await Project.create(typedBody<typeof CreateProjectSchema>(req));
    res.status(201).json(created.toObject());
  } catch (e) {
    next(e);
  }
});
