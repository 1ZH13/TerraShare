import { config } from "./config";

/**
 * Autenticación por API key (#234). En transportes remotos (HTTP/SSE) el cliente
 * presenta la key; el servidor la valida contra `MCP_API_KEY`. Si no hay key
 * configurada, la autenticación está deshabilitada (uso local por stdio, donde
 * la confianza es del proceso que lanza el servidor).
 *
 * Reutiliza el mismo modelo de "API key" previsto para el backend (#158/#230):
 * los permisos por tool seguirán los helpers `can*` cuando se añadan las tools
 * que mutan o exponen datos sensibles.
 */
export function verifyApiKey(provided: string | undefined): boolean {
  const expected = config.apiKey;
  if (!expected) return true; // auth deshabilitada
  return typeof provided === "string" && provided === expected;
}

/**
 * Comprobación de arranque: cuando hay `MCP_API_KEY` configurada, el proceso que
 * lanza el servidor debe aportar la misma key en `MCP_PROVIDED_KEY`. Evita
 * exponer el servidor por error sin credencial en un despliegue remoto.
 */
export function assertStartupAuth(): void {
  if (!config.authRequired) return;
  if (!verifyApiKey(process.env.MCP_PROVIDED_KEY)) {
    throw new Error(
      "MCP_API_KEY está configurada pero MCP_PROVIDED_KEY no coincide: acceso denegado.",
    );
  }
}
