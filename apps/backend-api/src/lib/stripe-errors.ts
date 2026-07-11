/**
 * Clasificación de errores de Stripe para las respuestas HTTP (#265).
 *
 * Stripe distingue entre errores de *solicitud/estado* (el intent no existe, el
 * cargo ya se reembolsó, importe inválido…) — que son responsabilidad del
 * cliente/estado y deben ser 4xx — y errores *upstream* (red, timeout, 5xx del
 * lado de Stripe) que son transitorios y deben ser 5xx de tipo "reintenta".
 *
 * Tratar cualquier excepción de Stripe como `500 INTERNAL_ERROR` disparaba
 * falsas alarmas de "el servidor está roto" y, con reintentos automáticos,
 * habría entrado en bucle. Este helper mapea la excepción a un status/código
 * de negocio coherente. Es duck-typed (no depende de `instanceof`) para que sea
 * fácil de testear y robusto ante distintas versiones del SDK.
 */

import type { ERROR_CATALOG } from "./api-response";

type StripeErrorCode = Extract<
  keyof typeof ERROR_CATALOG,
  "NOT_FOUND" | "BUSINESS_RULE_VIOLATION" | "STRIPE_UPSTREAM_ERROR"
>;

export interface MappedStripeError {
  status: 404 | 422 | 503;
  code: StripeErrorCode;
  message: string;
}

/** Tipos de error de Stripe que son fallos transitorios de infraestructura. */
const UPSTREAM_TYPES = new Set([
  "StripeConnectionError",
  "StripeAPIError",
  "StripeRateLimitError",
]);

function readField(err: unknown, key: string): string | number | undefined {
  if (err && typeof err === "object" && key in err) {
    const value = (err as Record<string, unknown>)[key];
    if (typeof value === "string" || typeof value === "number") return value;
  }
  return undefined;
}

/**
 * Mapea una excepción lanzada por el cliente de Stripe a la respuesta HTTP
 * adecuada. Todo lo que no sea claramente un fallo upstream se trata como un
 * error de solicitud (4xx), nunca como 500.
 */
export function mapStripeError(err: unknown): MappedStripeError {
  const type = String(readField(err, "type") ?? "");
  const code = String(readField(err, "code") ?? "");
  const statusCode = readField(err, "statusCode");
  const rawMessage = readField(err, "message");

  const isUpstream =
    UPSTREAM_TYPES.has(type) ||
    (typeof statusCode === "number" && statusCode >= 500);

  if (isUpstream) {
    return {
      status: 503,
      code: "STRIPE_UPSTREAM_ERROR",
      message:
        "No se pudo contactar con Stripe (error temporal). Reintenta en unos momentos.",
    };
  }

  // A partir de aquí es un error de solicitud/estado → 4xx.
  if (code === "resource_missing" || statusCode === 404) {
    return {
      status: 404,
      code: "NOT_FOUND",
      message: "El pago no tiene un cargo reembolsable en Stripe (intent inexistente).",
    };
  }

  if (code === "charge_already_refunded") {
    return {
      status: 422,
      code: "BUSINESS_RULE_VIOLATION",
      message: "El cargo ya fue reembolsado en Stripe.",
    };
  }

  return {
    status: 422,
    code: "BUSINESS_RULE_VIOLATION",
    message: rawMessage
      ? `Stripe rechazó la solicitud: ${rawMessage}`
      : "Stripe rechazó la solicitud de reembolso.",
  };
}
