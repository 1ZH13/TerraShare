import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { config } from "./config";
import type { ToolContext } from "./context";
import { registerTool } from "./tools/define-tool";
import { searchLandsTool } from "./tools/search-lands";

/**
 * Crea el servidor MCP de TerraShare y registra las tools disponibles (#234).
 *
 * Para añadir una tool (HU-64..HU-92): impórtala aquí y añádela al array `TOOLS`.
 * Ver `src/tools/_template.ts` y el README para el patrón.
 */
const TOOLS = [
  searchLandsTool,
  // HU-64..HU-92: añadir aquí cada nueva tool.
];

export function createServer(ctx: ToolContext): McpServer {
  const server = new McpServer(
    { name: config.serverName, version: config.serverVersion },
    {
      instructions:
        "Servidor MCP de TerraShare: expone el dominio de terrenos/alquileres. " +
        "Usa search_lands para buscar publicaciones activas.",
    },
  );

  for (const tool of TOOLS) {
    registerTool(server, ctx, tool);
  }

  return server;
}
