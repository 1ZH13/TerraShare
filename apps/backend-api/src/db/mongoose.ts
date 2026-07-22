import mongoose from "mongoose";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/terrashare";

/**
 * Los avisos de conexión van a **stderr**, no a stdout (#385).
 *
 * Esta función la comparten el backend HTTP y el servidor MCP. El MCP habla por
 * stdio, donde stdout es exclusivamente el canal del protocolo JSON-RPC: una
 * línea que no sea JSON ahí rompe a los clientes estrictos. stderr es el canal
 * de diagnóstico en ambos procesos, así que sirve para los dos.
 *
 * No se pierde visibilidad: stderr se sigue viendo en la terminal y lo recogen
 * igual Docker y el recolector de logs.
 */
const logConnection = (message: string): void => {
  console.error(message);
};

export async function connectMongoose() {
  const uri = process.env.MONGODB_URI || DEFAULT_URI;

  if (mongoose.connection.readyState === 0) {
    logConnection("[mongoose] Connecting to MongoDB...");
    await mongoose.connect(uri);
    logConnection("[mongoose] Connected to MongoDB");
  }

  return mongoose.connection;
}

export async function disconnectMongoose() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logConnection("[mongoose] Disconnected from MongoDB");
  }
}

export default mongoose;