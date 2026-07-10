import type { AppRole } from "../types";
import { AuditEvent } from "../db/schemas";
import type { AuditEventRecord } from "./types";

/**
 * Actor de un evento de auditoría. Solo se necesitan `id` y `role`, por lo que
 * aceptamos ese subconjunto en lugar de un `AuthContextUser` completo: esto
 * permite registrar eventos originados por el propio sistema (p.ej. rechazos de
 * webhooks de Stripe, HU-33 #152), donde no hay usuario autenticado.
 */
export type AuditActor = { id: string; role: AppRole | "system" };

/** Actor sintético para eventos generados por el sistema (sin usuario). */
export const SYSTEM_ACTOR: AuditActor = { id: "system:stripe-webhook", role: "system" };

/**
 * Registra un evento de auditoría en Mongo (#135, hallazgo A-5). Antes vivía en
 * el store en memoria y se perdía al reiniciar, y el endpoint de lectura
 * (`GET /audit-events`, Mongoose) nunca veía los eventos creados en runtime.
 */
export async function createAuditEvent(input: {
  actor: AuditActor;
  entity: AuditEventRecord["entity"];
  action: AuditEventRecord["action"];
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await AuditEvent.create({
    id: `audit_${crypto.randomUUID()}`,
    actorId: input.actor.id,
    actorRole: input.actor.role,
    entity: input.entity,
    action: input.action,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}
