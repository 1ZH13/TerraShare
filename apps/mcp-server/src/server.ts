import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { config } from "./config";
import type { ToolContext } from "./context";
import { registerTool } from "./tools/define-tool";
import { createLandTool } from "./tools/create-land";
import { createRentalRequestTool } from "./tools/create-rental-request";
import { createContractTool } from "./tools/create-contract";
import { createPaymentSessionTool } from "./tools/create-payment-session";
import { refundPaymentTool } from "./tools/refund-payment";
import { moderateLandTool } from "./tools/moderate-land";
import { manageUserStatusTool } from "./tools/manage-user-status";
import { getAnalyticsOverviewTool } from "./tools/get-analytics-overview";
import { sendMessageTool } from "./tools/send-message";
import { searchLandsTool } from "./tools/search-lands";

/**
 * Crea el servidor MCP de TerraShare y registra las tools disponibles (#234).
 *
 * Para añadir una tool (HU-64..HU-92): impórtala aquí y añádela al array `TOOLS`.
 * Ver `src/tools/_template.ts` y el README para el patrón.
 */
const TOOLS = [
  searchLandsTool,
  createLandTool,
  createRentalRequestTool,
  createContractTool,
  createPaymentSessionTool,
  refundPaymentTool,
  moderateLandTool,
  manageUserStatusTool,
  getAnalyticsOverviewTool,
  sendMessageTool,
  // HU-64..HU-92: añadir aquí cada nueva tool.
];

export function createServer(ctx: ToolContext): McpServer {
  const server = new McpServer(
    { name: config.serverName, version: config.serverVersion },
    {
      instructions:
        "Servidor MCP de TerraShare: expone el dominio de terrenos/alquileres. " +
        "Usa search_lands para buscar publicaciones activas; hay tools adicionales " +
        "para publicar terrenos, solicitar alquileres, generar contratos, pagos, " +
        "reembolsos y moderación (según el rol del usuario).",
    },
  );

  for (const tool of TOOLS) {
    registerTool(server, ctx, tool);
  }

  return server;
}
