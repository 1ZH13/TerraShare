/**
 * Store de tokens de confirmación para el flujo de "vista previa en 2 pasos"
 * (capa B) de las tools sensibles (#328).
 *
 * Una tool sensible con `preview` responde a la 1ª llamada con un resumen de la
 * acción y un `confirmationToken`, SIN ejecutar. La acción solo procede en una 2ª
 * llamada que presente ese token. Los tokens son:
 *  - de un solo uso (se consumen al validarse),
 *  - efímeros (caducan tras `TTL_MS`),
 *  - atados a la tool y a los argumentos exactos de la vista previa (hash), para
 *    que no se puedan reutilizar para otra acción o con argumentos alterados.
 *
 * El store vive en memoria del proceso del servidor MCP (long-lived). Es suficiente
 * para el transporte stdio (un proceso por cliente). Para un transporte remoto
 * multi-cliente se sustituiría por un store compartido, manteniendo esta interfaz.
 */

export const TTL_MS = 5 * 60 * 1000; // 5 minutos

interface PendingConfirmation {
  tool: string;
  argsHash: string;
  expiresAt: number;
}

const store = new Map<string, PendingConfirmation>();

/** Serialización estable (claves ordenadas) para que el orden de los args no afecte al hash. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function hashArgs(args: Record<string, unknown>): string {
  return stableStringify(args);
}

/** Elimina tokens caducados para acotar el uso de memoria. */
function pruneExpired(now: number): void {
  for (const [token, entry] of store) {
    if (entry.expiresAt < now) store.delete(token);
  }
}

export interface IssuedToken {
  token: string;
  ttlSeconds: number;
  expiresAt: number;
}

/** Emite un token para una acción sensible pendiente de confirmar. */
export function issueToken(tool: string, args: Record<string, unknown>): IssuedToken {
  const now = Date.now();
  pruneExpired(now);
  const token = `cfm_${crypto.randomUUID()}`;
  const expiresAt = now + TTL_MS;
  store.set(token, { tool, argsHash: hashArgs(args), expiresAt });
  return { token, ttlSeconds: TTL_MS / 1000, expiresAt };
}

export type ConsumeResult = { ok: true } | { ok: false; message: string };

/**
 * Valida y consume (un solo uso) un token contra la tool y los argumentos de la
 * 2ª llamada. Devuelve un mensaje legible si falla.
 */
export function consumeToken(
  token: string,
  tool: string,
  args: Record<string, unknown>,
): ConsumeResult {
  const entry = store.get(token);
  if (!entry) {
    return { ok: false, message: "Token de confirmación inválido o ya utilizado." };
  }
  // Un solo uso: se elimina siempre, válido o no.
  store.delete(token);

  if (entry.expiresAt < Date.now()) {
    return { ok: false, message: "El token de confirmación expiró. Vuelve a solicitar la acción." };
  }
  if (entry.tool !== tool) {
    return { ok: false, message: "El token de confirmación no corresponde a esta acción." };
  }
  if (entry.argsHash !== hashArgs(args)) {
    return {
      ok: false,
      message: "Los argumentos cambiaron respecto a la vista previa. Vuelve a solicitar la acción.",
    };
  }
  return { ok: true };
}

/** Solo para tests: vacía el store. */
export function _clearConfirmations(): void {
  store.clear();
}
