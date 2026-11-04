import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config.js';
import { logger } from './logger.js';

async function main() {
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  logger.info({ uri: env.MONGO_URI.replace(/\/\/.*@/, '//***@') }, 'Connected to MongoDB');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT} (docs at /api/docs)`);
  });

  // Graceful shutdown so in-flight requests finish and the DB pool closes cleanly.
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
