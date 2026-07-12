/**
 * Configuración del servidor MCP de TerraShare (#234).
 *
 * Reutiliza la misma `MONGODB_URI` que el backend. La API key es opcional: si se
 * define `MCP_API_KEY`, el servidor exige que el cliente la presente (para
 * transportes remotos); en uso local por stdio la confianza es del proceso.
 */
export const config = {
  get mongoUri(): string {
    return process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/terrashare";
  },
  get apiKey(): string | undefined {
    const key = process.env.MCP_API_KEY;
    return key && key.length > 0 ? key : undefined;
  },
  get authRequired(): boolean {
    return !!config.apiKey;
  },
  serverName: "terrashare-mcp",
  serverVersion: "0.1.0",
};
