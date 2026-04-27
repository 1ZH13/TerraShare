import mongoose from "mongoose";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/terrashare";

export async function connectMongoose() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;
  
  if (mongoose.connection.readyState === 0) {
    console.log("[mongoose] Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("[mongoose] Connected to MongoDB");
  }
  
  return mongoose.connection;
}

export async function disconnectMongoose() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log("[mongoose] Disconnected from MongoDB");
  }
}

export default mongoose;