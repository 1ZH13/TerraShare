import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { config } from "./config";
import { registerSearchLands } from "./tools/search-lands";

/**
 * Crea el servidor MCP de TerraShare y registra las tools disponibles.
 * La fundación (#234) incluye la primera tool (search_lands, #180); las demás
 * (HU-64..HU-92) se registrarán aquí a medida que se implementen.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: config.serverName, version: config.serverVersion },
    {
      instructions:
        "Servidor MCP de TerraShare: expone el dominio de terrenos/alquileres. " +
        "Usa search_lands para buscar publicaciones activas.",
    },
  );

  registerSearchLands(server);

  return server;
}
