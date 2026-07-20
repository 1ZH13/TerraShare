import type { McpServer, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z, type ZodRawShape } from "zod";

import type { ToolContext } from "../context";
import { consumeToken, issueToken } from "./confirmation-store";

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

/**
 * Configuración de seguridad de una tool sensible (#328). Se aplica en el
 * andamiaje `registerTool`, de forma que las capas comunes no se reimplementan
 * por tool:
 *  - **A (confirm):** exige `confirm: true` en la llamada.
 *  - **B (preview 2 pasos):** si se define `preview`, la 1ª llamada devuelve un
 *    resumen + `confirmationToken` sin ejecutar; la acción solo procede en una 2ª
 *    llamada con ese token. Cuando hay `preview`, `confirm` es redundante y se ignora.
 *  - **F (interruptor):** si `enabled()` devuelve `false`, la tool queda desactivada.
 */
export interface SensitiveConfig {
  /** Capa A: exige `confirm: true`. Ignorado si se define `preview`. */
  confirm?: boolean;
  /** Capa B: genera un resumen legible de la acción a confirmar. Activa el flujo de 2 pasos. */
  preview?: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown> | unknown;
  /** Capa F: si devuelve `false`, la tool está desactivada por configuración. */
  enabled?: () => boolean;
}

export interface ToolDefinition<Shape extends ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  /** Acceso requerido: `public` (por defecto), `user` (autenticado) o `admin`. */
  requires?: ToolAccess;
  /** Configuración de seguridad para acciones sensibles (confirmación / preview / interruptor). */
  sensitive?: SensitiveConfig;
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

/** Parámetros que el andamiaje añade al `inputSchema` de una tool sensible. */
const SENSITIVE_FIELDS = {
  confirm: z
    .boolean()
    .optional()
    .describe("Confirmación explícita de la acción sensible (debe ser true)."),
  confirmationToken: z
    .string()
    .optional()
    .describe("Token devuelto por la vista previa; requerido para ejecutar la acción."),
};

/**
 * Aplica las capas de seguridad declaradas en `def.sensitive` (#328) y, si todo
 * pasa, ejecuta el handler. Devuelve un `ToolResult`: la vista previa (paso 1),
 * un error legible, o el resultado del handler (paso 2 / acción confirmada).
 */
async function runSensitive<Shape extends ZodRawShape>(
  def: ToolDefinition<Shape>,
  s: SensitiveConfig,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<ToolResult> {
  if (s.enabled && !s.enabled()) {
    return fail(`La tool '${def.name}' está desactivada por configuración.`);
  }

  // Separa los parámetros del andamiaje de los argumentos propios de la tool.
  const { confirm, confirmationToken, ...toolArgs } = args as {
    confirm?: unknown;
    confirmationToken?: unknown;
    [k: string]: unknown;
  };

  if (s.preview) {
    const token = typeof confirmationToken === "string" ? confirmationToken.trim() : "";
    if (!token) {
      // Paso 1: devuelve la vista previa + token, SIN ejecutar la acción.
      const preview = await s.preview(toolArgs, ctx);
      const issued = issueToken(def.name, toolArgs);
      return ok({
        requiresConfirmation: true,
        action: def.name,
        preview,
        confirmationToken: issued.token,
        expiresInSeconds: issued.ttlSeconds,
        hint: "Vuelve a llamar a esta tool con los mismos argumentos más 'confirmationToken' para ejecutar la acción.",
      });
    }
    // Paso 2: valida el token (un solo uso, no expirado, mismos args) y ejecuta.
    const check = consumeToken(token, def.name, toolArgs);
    if (!check.ok) return fail(check.message);
    return ok(await def.handler(toolArgs, ctx));
  }

  // Solo capa A (confirmación) sin vista previa.
  if (s.confirm && confirm !== true) {
    return fail("Esta acción sensible requiere confirmación explícita (confirm: true).");
  }
  return ok(await def.handler(toolArgs, ctx));
}

/** Registra una tool en el servidor MCP aplicando el andamiaje común. */
export function registerTool<Shape extends ZodRawShape>(
  server: McpServer,
  ctx: ToolContext,
  def: ToolDefinition<Shape>,
): void {
  const requires = def.requires ?? "public";

  // Las tools sensibles anuncian además `confirm` y `confirmationToken`. El cast
  // acompaña al del callback: el SDK valida los args contra este shape en runtime.
  const inputSchema = (
    def.sensitive ? { ...def.inputSchema, ...SENSITIVE_FIELDS } : def.inputSchema
  ) as unknown as Shape;

  // El SDK ya valida los args contra `inputSchema` antes de llamar al callback;
  // aquí los tratamos como `Record<string, unknown>` (las tools los consumen con
  // su propio tipado). El cast salva la varianza del genérico del SDK.
  const callback = (async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const denied = checkAccess(requires, ctx);
      if (denied) return fail(denied);

      if (def.sensitive) {
        return await runSensitive(def, def.sensitive, args ?? {}, ctx);
      }

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
    { title: def.title, description: def.description, inputSchema },
    callback,
  );
}
