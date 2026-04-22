import { z } from "zod";
import type { AuditAction, AuditableEntity } from "../types/domain";

export const AuditEventFilterSchema = z.object({
  actorId: z.string().optional(),
  entity: z.enum([
    "auth",
    "user",
    "land",
    "rental_request",
    "contract",
    "payment",
    "chat",
  ] as const satisfies AuditableEntity[]).optional(),
  action: z.enum([
    "created",
    "updated",
    "deleted",
    "approved",
    "rejected",
    "cancelled",
    "paid",
    "status_changed",
  ] as const satisfies AuditAction[]).optional(),
  entityId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type AuditEventFilterInput = z.input<typeof AuditEventFilterSchema>;
export type AuditEventFilterOutput = z.output<typeof AuditEventFilterSchema>;