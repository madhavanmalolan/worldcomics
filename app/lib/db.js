import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
const dbName = 'comicsDB';

if (!global.mongoClient) {
  global.mongoClient = new MongoClient(DATABASE_URL);
}

export async function getDatabase() {
  if (!global.mongoClient.topology || !global.mongoClient.topology.isConnected()) {
    await global.mongoClient.connect();
  }
  return global.mongoClient.db(dbName);
} 