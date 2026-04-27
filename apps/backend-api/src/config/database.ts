import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

const DEFAULT_URI = "mongodb://127.0.0.1:27017";
const DEFAULT_DB = "terrashare";

export async function connectDatabase(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  const dbName = process.env.MONGODB_URI?.split("/").pop() || DEFAULT_DB;

  try {
    client = new MongoClient(uri);
    await client.connect();
    db = client.db(dbName);
    console.log(`[database] Connected to MongoDB: ${dbName}`);
    
    await createIndexes(db);
    return db;
  } catch (error) {
    console.error("[database] Connection failed:", error);
    throw error;
  }
}

async function createIndexes(db: Db) {
  console.log("[database] Creating indexes...");
  
  await db.collection("lands").createIndex({ id: 1 }, { unique: true });
  await db.collection("lands").createIndex({ ownerId: 1 });
  await db.collection("lands").createIndex({ status: 1 });
  
  await db.collection("users").createIndex({ clerkUserId: 1 }, { unique: true });
  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  
  await db.collection("rentalRequests").createIndex({ id: 1 }, { unique: true });
  await db.collection("rentalRequests").createIndex({ landId: 1 });
  await db.collection("rentalRequests").createIndex({ tenantId: 1 });
  await db.collection("rentalRequests").createIndex({ status: 1 });
  
  await db.collection("contracts").createIndex({ id: 1 }, { unique: true });
  await db.collection("contracts").createIndex({ ownerId: 1 });
  await db.collection("contracts").createIndex({ tenantId: 1 });
  
  await db.collection("payments").createIndex({ id: 1 }, { unique: true });
  await db.collection("payments").createIndex({ rentalRequestId: 1 });
  
  await db.collection("chats").createIndex({ id: 1 }, { unique: true });
  await db.collection("chats").createIndex({ landId: 1 });
  
  await db.collection("chatMessages").createIndex({ id: 1 }, { unique: true });
  await db.collection("chatMessages").createIndex({ chatId: 1, createdAt: 1 });
  
  await db.collection("auditEvents").createIndex({ id: 1 }, { unique: true });
  await db.collection("auditEvents").createIndex({ entity: 1, entityId: 1 });
  
  await db.collection("leads").createIndex({ id: 1 }, { unique: true });
  await db.collection("leads").createIndex({ email: 1 });
  
  console.log("[database] Indexes created");
}

export function getDatabase(): Db | null {
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log("[database] Connection closed");
  }
}