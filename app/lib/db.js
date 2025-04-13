import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017';
const dbName = 'comicsDB';

if (!global.mongoClient) {
  global.mongoClient = new MongoClient(uri);
}

export async function getDatabase() {
  if (!global.mongoClient.topology || !global.mongoClient.topology.isConnected()) {
    await global.mongoClient.connect();
  }
  return global.mongoClient.db(dbName);
} 