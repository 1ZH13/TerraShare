import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";

import { config } from "./config";
import type { ToolContext } from "./context";
import { registerTool, type ToolDefinition } from "./tools/define-tool";
import { createLandTool } from "./tools/create-land";
import { createRentalRequestTool } from "./tools/create-rental-request";
import { createContractTool } from "./tools/create-contract";
import { createPaymentSessionTool } from "./tools/create-payment-session";
import { refundPaymentTool } from "./tools/refund-payment";
import { moderateLandTool } from "./tools/moderate-land";
import { manageUserStatusTool } from "./tools/manage-user-status";
import { getAnalyticsOverviewTool } from "./tools/get-analytics-overview";
import { deleteLandTool } from "./tools/delete-land";
import { signContractTool } from "./tools/sign-contract";
import { completeContractTool } from "./tools/complete-contract";
import { sendMessageTool } from "./tools/send-message";
import { getExternalContactTool } from "./tools/get-external-contact";
import { getOwnerAnalyticsTool } from "./tools/get-owner-analytics";
import { getLandTool } from "./tools/get-land";
import { listMyLandsTool } from "./tools/list-my-lands";
import { setLandStatusTool } from "./tools/set-land-status";
import { listRentalRequestsTool } from "./tools/list-rental-requests";
import { searchLandsTool } from "./tools/search-lands";
import { updateLandTool } from "./tools/update-land";

/**
 * Crea el servidor MCP de TerraShare y registra las tools disponibles (#234).
 *
 * Para añadir una tool (HU-64..HU-92): impórtala aquí y añádela al array `TOOLS`.
 * Ver `src/tools/_template.ts` y el README para el patrón.
 */
const TOOLS: ToolDefinition<ZodRawShape>[] = [
  searchLandsTool,
  createLandTool,
  createRentalRequestTool,
  createContractTool,
  createPaymentSessionTool,
  refundPaymentTool,
  moderateLandTool,
  manageUserStatusTool,
  getAnalyticsOverviewTool,
  updateLandTool,
  deleteLandTool,
  signContractTool,
  completeContractTool,
  sendMessageTool,
  getExternalContactTool,
  getOwnerAnalyticsTool,
  getLandTool,
  listMyLandsTool,
  setLandStatusTool,
  listRentalRequestsTool,
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
