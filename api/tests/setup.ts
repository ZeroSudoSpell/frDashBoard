import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { resetTransactionSupportCache } from '../src/services/releases.js';
import '../src/models/Project.js';
import '../src/models/Build.js';
import '../src/models/Release.js';

let replSet: MongoMemoryReplSet | undefined;

/**
 * Connects mongoose to a test database.
 *
 * By default this starts an in-memory MongoDB replica set (so transactions
 * work) via mongodb-memory-server. Set MONGO_TEST_URI to point at an existing
 * instance instead, e.g. on machines that cannot download the Mongo binary.
 */
export async function connectTestDb() {
  process.env.NODE_ENV = 'test';
  const external = process.env.MONGO_TEST_URI;
  if (external) {
    await mongoose.connect(external);
  } else {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await mongoose.connect(replSet.getUri('frd_test'));
  }
  // Build unique indexes up front so duplicate-key tests don't race index creation.
  await mongoose.connection.syncIndexes();
  resetTransactionSupportCache();
}

export async function clearTestDb() {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

export async function disconnectTestDb() {
  await mongoose.disconnect();
  await replSet?.stop();
}
