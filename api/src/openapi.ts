import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './schemas/index.js';
// Route modules register their paths with the registry on import, so pull
// them in here to make the generated document independent of app wiring.
import './routes/projects.js';
import './routes/builds.js';
import './routes/releases.js';
import './routes/analytics.js';

/**
 * The OpenAPI document is generated from the same Zod schemas that validate
 * requests, so the docs can't drift from the implementation.
 */
export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Firmware Release Dashboard API',
      version: '0.1.0',
      description:
        'REST API for tracking CI firmware builds, promoting them through release stages, and serving dashboard analytics computed with MongoDB aggregation pipelines.',
    },
    servers: [{ url: '/', description: 'Current host' }],
    tags: [
      { name: 'Projects', description: 'Firmware product lines' },
      { name: 'Builds', description: 'CI build records written by pipelines' },
      { name: 'Releases', description: 'Promotion events through alpha / beta / rc / release' },
      { name: 'Analytics', description: 'Aggregated metrics for the dashboard' },
    ],
  });
}
