import type { AuthContextUser } from "../types";
import { AuditEvent } from "../db/schemas";
import type { AuditEventRecord } from "./types";

/**
 * Registra un evento de auditoría en Mongo (#135, hallazgo A-5). Antes vivía en
 * el store en memoria y se perdía al reiniciar, y el endpoint de lectura
 * (`GET /audit-events`, Mongoose) nunca veía los eventos creados en runtime.
 */
export async function createAuditEvent(input: {
  actor: AuthContextUser;
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
