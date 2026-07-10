import { WebhookEvent, IdempotencyKey } from "../db/schemas";

/**
 * Idempotencia de pagos y webhooks (HU-42 #160).
 *
 * - Operaciones de pago: se reserva la `Idempotency-Key` del cliente ANTES de
 *   crear el pago; el índice único de `IdempotencyKey` resuelve las carreras.
 * - Webhooks: se registra el `eventId` de Stripe una vez procesado; una
 *   reentrega del mismo evento se detecta y no repite efectos.
 */

/** Detecta el error de clave duplicada de Mongo (E11000). */
function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}

/** Devuelve el paymentId asociado a una clave, o null si no existe. */
export async function findPaymentIdByIdempotencyKey(key: string): Promise<string | null> {
  const rec = await IdempotencyKey.findOne({ key }).lean();
  return rec?.paymentId ?? null;
}

/**
 * Reserva una clave de idempotencia para un `paymentId`. Devuelve `true` si se
 * reservó (primer uso) y `false` si la clave ya existía (reintento/carrera).
 */
export async function reserveIdempotencyKey(
  key: string,
  scope: string,
  paymentId: string,
): Promise<boolean> {
  try {
    await IdempotencyKey.create({ key, scope, paymentId });
    return true;
  } catch (err) {
    if (isDuplicateKeyError(err)) return false;
    throw err;
  }
}

/** ¿Ya se procesó este evento de webhook de Stripe? */
export async function isWebhookProcessed(eventId: string): Promise<boolean> {
  const existing = await WebhookEvent.findOne({ eventId }).lean();
  return !!existing;
}

/**
 * Marca un evento de webhook como procesado. Devuelve `true` si se registró y
 * `false` si otra entrega concurrente ya lo había registrado (carrera).
 */
export async function markWebhookProcessed(
  eventId: string,
  type?: string,
  paymentId?: string,
): Promise<boolean> {
  try {
    await WebhookEvent.create({ eventId, type, paymentId });
    return true;
  } catch (err) {
    if (isDuplicateKeyError(err)) return false;
    throw err;
  }
}
