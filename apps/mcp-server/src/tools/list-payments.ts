import { z } from "zod";
import { Land, Payment, RentalRequest } from "@backend/db/schemas";
import { canListPayments } from "@backend/lib/auth-helpers";
import { ToolError, type ToolDefinition } from "./define-tool";

export const listPaymentsInput = {
  status: z.enum(["pending", "processing", "paid", "failed", "cancelled", "refunded", "partially_refunded"]).optional().describe("Filtrar por estado del pago"),
};

export async function listPayments(rawInput: {
  actingUserId: string | null;
  actingUserRole?: string;
  status?: string;
}): Promise<{ items: Record<string, unknown>[]; total: number }> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  const ownerLands = await Land.find({ ownerId: rawInput.actingUserId }).lean();
  const ownerLandIds = ownerLands.map((l) => l.id);

  const userRequests = await RentalRequest.find({
    $or: [{ tenantId: rawInput.actingUserId }, { landId: { $in: ownerLandIds } }],
  }).lean();
  const requestIds = userRequests.map((r) => r.id);

  const permissionQuery = canListPayments(
    { id: rawInput.actingUserId, role: rawInput.actingUserRole ?? "user" } as any,
    requestIds
  );

  const query: Record<string, unknown> = { ...permissionQuery };
  if (rawInput.status) {
    query.status = rawInput.status;
  }

  const docs = await Payment.find(query).sort({ createdAt: -1 }).lean();
  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return { items, total: items.length };
}

export const listPaymentsTool: ToolDefinition<typeof listPaymentsInput> = {
  name: "list_payments",
  title: "Listar pagos",
  description: "Devuelve los pagos del usuario autenticado. Los administradores ven todos los pagos. Permite filtrar por estado.",
  inputSchema: listPaymentsInput,
  requires: "user",
  handler: (args, ctx) =>
    listPayments({
      actingUserId: ctx.actingUser?.id ?? null,
      actingUserRole: ctx.actingUser?.role,
      status: args.status as string | undefined,
    }),
};