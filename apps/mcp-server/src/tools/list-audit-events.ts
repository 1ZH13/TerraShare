import { z } from "zod";
import { AuditEvent } from "@backend/db/schemas";
import { canAccessAuditEvents } from "@backend/lib/auth-helpers";
import { ToolError, type ToolDefinition } from "./define-tool";

export const listAuditEventsInput = {
  entity: z.enum(["auth", "user", "land", "rental_request", "contract", "payment", "chat", "report", "webhook", "backup"]).optional().describe("Filtrar por tipo de entidad"),
  action: z.enum(["created", "updated", "deleted", "approved", "rejected", "cancelled", "paid", "refunded", "signed", "completed", "status_changed", "verified"]).optional().describe("Filtrar por tipo de acción"),
};

export async function listAuditEvents(rawInput: {
  actingUserId: string | null;
  actingUserRole?: string;
  entity?: string;
  action?: string;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  if (!canAccessAuditEvents({ id: rawInput.actingUserId, role: rawInput.actingUserRole ?? "user" } as any)) {
    throw new ToolError("No autorizado");
  }

  const query: Record<string, unknown> = {};
  if (rawInput.entity) query.entity = rawInput.entity;
  if (rawInput.action) query.action = rawInput.action;

  const docs = await AuditEvent.find(query).sort({ createdAt: -1 }).lean();
  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return { items, total: items.length };
}

export const listAuditEventsTool: ToolDefinition<typeof listAuditEventsInput> = {
  name: "list_audit_events",
  title: "Listar eventos de auditoría",
  description: "Devuelve los eventos de auditoría del sistema. Solo administradores. Permite filtrar por entidad y acción.",
  inputSchema: listAuditEventsInput,
  requires: "admin",
  handler: (args, ctx) =>
    listAuditEvents({
      actingUserId: ctx.actingUser?.id ?? null,
      actingUserRole: ctx.actingUser?.role,
      entity: args.entity as string | undefined,
      action: args.action as string | undefined,
    }),
};
