import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import mongoose from 'mongoose';
import { env } from './config.js';
import { logger } from './logger.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { projectsRouter } from './routes/projects.js';
import { buildsRouter } from './routes/builds.js';
import { releasesRouter } from './routes/releases.js';
import { analyticsRouter } from './routes/analytics.js';
import { buildOpenApiDocument } from './openapi.js';

/** App factory so tests can spin up an instance without binding a port. */
export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false })); // swagger-ui needs inline scripts
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '1mb' }));
  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req: { url?: string }) => req.url === '/api/health' } }));
  }

  app.get('/api/health', (_req, res) => {
    const dbState = mongoose.connection.readyState; // 1 = connected
    res.status(dbState === 1 ? 200 : 503).json({
      status: dbState === 1 ? 'ok' : 'degraded',
      db: mongoose.STATES[dbState],
      uptimeSec: Math.round(process.uptime()),
    });
  });

  const openapi = buildOpenApiDocument();
  app.get('/api/openapi.json', (_req, res) => res.json(openapi));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Firmware Release Dashboard API' }));

  app.use('/api/projects', projectsRouter);
  app.use('/api/builds', buildsRouter);
  app.use('/api/releases', releasesRouter);
  app.use('/api/analytics', analyticsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
