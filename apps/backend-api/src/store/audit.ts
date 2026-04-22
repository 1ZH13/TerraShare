import type { AuthContextUser } from "../types";
import { getStore } from "./in-memory-db";
import type { AuditEventRecord } from "./types";

export function createAuditEvent(input: {
  actor: AuthContextUser;
  entity: AuditEventRecord["entity"];
  action: AuditEventRecord["action"];
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const store = getStore();
  const now = new Date().toISOString();
  const event: AuditEventRecord = {
    id: `audit_${crypto.randomUUID()}`,
    actorId: input.actor.id,
    actorRole: input.actor.role,
    entity: input.entity,
    action: input.action,
    entityId: input.entityId,
    metadata: input.metadata,
    createdAt: now,
  };

  store.auditEvents.set(event.id, event);
  return event;
}
