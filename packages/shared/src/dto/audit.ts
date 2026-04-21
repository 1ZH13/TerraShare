import type { AuditAction, AuditableEntity } from "../types/domain";

export interface AuditEventDto {
  id: string;
  actorId: string;
  entity: AuditableEntity;
  action: AuditAction;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditEventFilterDto {
  actorId?: string;
  entity?: AuditableEntity;
  action?: AuditAction;
  entityId?: string;
  from?: string;
  to?: string;
}
