import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { connectMongoose } from "@backend/db/mongoose";
import { config } from "./config";
import { assertStartupAuth } from "./auth";
import { createServer } from "./server";

/**
 * Entrypoint del servidor MCP de TerraShare (#234). Transporte stdio para uso
 * local con clientes MCP (Claude Desktop/Code, etc.). Conecta a la misma
 * MongoDB del backend y expone las tools registradas.
 *
 * Importante: en stdio, stdout es el canal del protocolo — el logging va a
 * stderr para no corromper los mensajes JSON-RPC.
 */
async function main(): Promise<void> {
  assertStartupAuth();

  await connectMongoose();
  console.error(`[mcp-server] Conectado a MongoDB (${config.mongoUri.replace(/\/\/[^@]*@/, "//***@")})`);

  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[mcp-server] ${config.serverName} v${config.serverVersion} listo (stdio)`);
}

main().catch((err) => {
  console.error("[mcp-server] Error fatal:", err);
  process.exit(1);
});
