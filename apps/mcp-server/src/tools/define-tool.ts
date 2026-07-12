import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";

import type { ToolContext } from "../context";

/**
 * Andamiaje común para definir tools MCP (#234).
 *
 * Estandariza para todas las tools (y para quien las implemente):
 * - Validación de entrada con Zod (la hace el SDK a partir de `inputSchema`).
 * - Puerta de permisos declarativa (`requires`).
 * - Manejo de errores uniforme → resultado MCP con `isError` (nunca crash).
 * - Formato de salida consistente: texto JSON + `structuredContent`.
 * - Logging estructurado a stderr (stdout es el canal del protocolo).
 *
 * Así, añadir una tool (HU-64..HU-92) se reduce a: input Zod + handler que
 * consulta/muta Mongo usando `ctx.actingUser` y los helpers `can*`.
 */

/** Error de negocio en una tool → se devuelve como resultado de error legible. */
export class ToolError extends Error {}

export type ToolAccess = "public" | "user" | "admin";

export interface ToolDefinition<Shape extends ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  /** Acceso requerido: `public` (por defecto), `user` (autenticado) o `admin`. */
  requires?: ToolAccess;
  /** Lógica de la tool. Recibe los args validados y el contexto (usuario que actúa). */
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown> | unknown;
}

type ToolResult = CallToolResult;

function ok(data: unknown): ToolResult {
  const isPlainObject = data !== null && typeof data === "object" && !Array.isArray(data);
  return {
    content: [{ type: "text", text: JSON.stringify(data ?? null, null, 2) }],
    ...(isPlainObject ? { structuredContent: data as Record<string, unknown> } : {}),
  };
}

function fail(message: string): ToolResult {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** Comprueba el acceso declarado contra el usuario que actúa. Devuelve un mensaje si falla. */
function checkAccess(requires: ToolAccess, ctx: ToolContext): string | null {
  if (requires === "public") return null;
  if (!ctx.actingUser) {
    return "Esta tool requiere un usuario autenticado. Configura MCP_ACTING_USER_ID en el servidor.";
  }
  if (ctx.actingUser.status === "blocked") {
    return "El usuario configurado está bloqueado.";
  }
  if (requires === "admin" && ctx.actingUser.role !== "admin") {
    return "Esta tool requiere rol de administrador.";
  }
  return null;
}

/** Registra una tool en el servidor MCP aplicando el andamiaje común. */
export function registerTool<Shape extends ZodRawShape>(
  server: McpServer,
  ctx: ToolContext,
  def: ToolDefinition<Shape>,
): void {
  const requires = def.requires ?? "public";

  // El SDK ya valida los args contra `inputSchema` antes de llamar al callback;
  // aquí los tratamos como `Record<string, unknown>` (las tools los consumen con
  // su propio tipado). El cast salva la varianza del genérico del SDK.
  const callback = (async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const denied = checkAccess(requires, ctx);
      if (denied) return fail(denied);

      const data = await def.handler(args, ctx);
      return ok(data);
    } catch (err) {
      const message = err instanceof ToolError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Error interno de la tool";
      // stderr: stdout es el canal JSON-RPC del protocolo.
      console.error(`[mcp-server] tool '${def.name}' error:`, err);
      return fail(message);
    }
  }) as unknown as ToolCallback<Shape>;

  server.registerTool(
    def.name,
    { title: def.title, description: def.description, inputSchema: def.inputSchema },
    callback,
  );
}
