import { z } from "zod";

import { Payment, RentalRequest, Land } from "@backend/db/schemas";
import { canReadPayment } from "@backend/lib/auth-helpers";
import { ToolError, type ToolDefinition } from "./define-tool";

export const getPaymentStatusInput = {
  paymentId: z.string().min(1).describe("ID del pago a consultar"),
};

export type GetPaymentStatusInput = z.infer<z.ZodObject<typeof getPaymentStatusInput>>;

export async function getPaymentStatus(rawInput: {
  paymentId: string;
  actingUserId: string | null;
  actingUserRole?: string;
}): Promise<Record<string, unknown>> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  const payment = await Payment.findOne({ id: rawInput.paymentId }).lean();
  if (!payment) throw new ToolError("Pago no encontrado");

  const request = await RentalRequest.findOne({ id: payment.rentalRequestId }).lean();
  if (!request) throw new ToolError("Solicitud de alquiler no encontrada");

  const land = await Land.findOne({ id: request.landId }).lean();
  if (!land) throw new ToolError("Terreno no encontrado");

  if (
    !canReadPayment(
      { id: rawInput.actingUserId, role: rawInput.actingUserRole ?? "user" } as any,
      request as any,
      land as any,
    )
  ) {
    throw new ToolError("No autorizado para ver este pago");
  }

  const { _id, __v, ...rest } = payment as unknown as Record<string, unknown>;
  return rest;
}

export const getPaymentStatusTool: ToolDefinition<typeof getPaymentStatusInput> = {
  name: "get_payment_status",
  title: "Consultar estado de pago",
  description:
    "Obtiene el estado de un pago por su ID, incluyendo monto, moneda y estado. Solo las partes o un administrador pueden verlo.",
  inputSchema: getPaymentStatusInput,
  requires: "user",
  handler: (args, ctx) =>
    getPaymentStatus({
      paymentId: args.paymentId as string,
      actingUserId: ctx.actingUser?.id ?? null,
      actingUserRole: ctx.actingUser?.role,
    }),
};
