import { z } from "zod";

import { RentalRequest, Land, AuditEvent } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canTransitionRentalRequest } from "../permissions";

const allowedTransitions: Record<string, string[]> = {
  draft: ["pending_owner", "cancelled"],
  pending_owner: ["approved", "rejected", "cancelled"],
  approved: ["pending_payment", "cancelled"],
  rejected: [],
  cancelled: [],
  pending_payment: ["paid", "cancelled"],
  paid: [],
};

const nextStatusEnum = z.enum([
  "approved",
  "rejected",
  "cancelled",
  "pending_payment",
  "paid",
]);

const updateRentalRequestStatusInput = {
  requestId: z.string().min(1).describe("ID de la solicitud de alquiler"),
  nextStatus: nextStatusEnum.describe("Nuevo estado de la solicitud"),
  reason: z.string().optional().describe("Motivo del cambio de estado"),
};

export type UpdateRentalRequestStatusInput = z.infer<z.ZodObject<typeof updateRentalRequestStatusInput>>;

export async function updateRentalRequestStatus(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(updateRentalRequestStatusInput);
  const input = schema.parse(rawInput ?? {});

  const request = await RentalRequest.findOne({ id: input.requestId }).lean();
  if (!request) throw new ToolError("Solicitud no encontrada");

  const allowed = allowedTransitions[request.status] ?? [];
  if (!allowed.includes(input.nextStatus)) {
    throw new ToolError(
      `Transición no permitida: de "${request.status}" a "${input.nextStatus}"`,
    );
  }

  const land = await Land.findOne({ id: request.landId }).lean();
  if (!land) throw new ToolError("Terreno asociado no encontrado");

  if (
    !canTransitionRentalRequest(
      actingUser as never,
      { tenantId: request.tenantId } as never,
      { ownerId: land.ownerId } as never,
      input.nextStatus,
    )
  ) {
    throw new ToolError("No tiene permisos para realizar esta transición");
  }

  const updated = await RentalRequest.findOneAndUpdate(
    { id: input.requestId },
    { $set: { status: input.nextStatus, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) throw new ToolError("Error al actualizar la solicitud");

  const actionMap: Record<string, string> = {
    approved: "approved",
    rejected: "rejected",
    cancelled: "cancelled",
  };

  await AuditEvent.create({
    id: `audit_${crypto.randomUUID()}`,
    actorId: actingUser.id,
    actorRole: actingUser.role as "user" | "admin",
    entity: "rental_request",
    action: (actionMap[input.nextStatus] ?? "status_changed") as "status_changed",
    entityId: input.requestId,
    metadata: { from: request.status, to: input.nextStatus, reason: input.reason },
  });

  const { _id, __v, ...rest } = updated.toObject();
  return rest;
}

export const updateRentalRequestStatusTool: ToolDefinition<typeof updateRentalRequestStatusInput> = {
  name: "update_rental_request_status",
  title: "Gestionar estado de solicitud",
  description:
    "Aprobar, rechazar o cancelar una solicitud de alquiler. Respeta la máquina de estados y los permisos por rol.",
  inputSchema: updateRentalRequestStatusInput,
  requires: "user",
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return updateRentalRequestStatus(args, actingUser);
  },
};
