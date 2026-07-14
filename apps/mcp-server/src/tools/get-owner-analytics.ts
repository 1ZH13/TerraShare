import { z } from "zod";

import { Land, RentalRequest, Payment } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { isOwnerOrAdmin } from "../permissions";

const getOwnerAnalyticsInput = {
  ownerId: z.string().optional().describe("ID del dueño (default: el usuario autenticado)"),
};

export type GetOwnerAnalyticsInput = z.infer<z.ZodObject<typeof getOwnerAnalyticsInput>>;

export async function getOwnerAnalytics(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(getOwnerAnalyticsInput);
  const input = schema.parse(rawInput ?? {});

  const targetOwnerId = input.ownerId ?? actingUser.id;

  if (!isOwnerOrAdmin(actingUser as never, targetOwnerId)) {
    throw new ToolError("No autorizado para ver analiticas de otro usuario");
  }

  const activeLands = await Land.find({ ownerId: targetOwnerId, status: "active" }).lean();
  const landIds = activeLands.map((l) => l.id);

  const requests = landIds.length > 0
    ? await RentalRequest.find({ landId: { $in: landIds } }).lean()
    : [];

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const pendingOwner = requests.filter((r) => r.status === "pending_owner").length;
  const approved = requests.filter((r) => r.status === "approved").length;
  const rejected = requests.filter((r) => r.status === "rejected").length;
  const totalRequests = requests.length;

  const requestsLast30Days = requests.filter(
    (r) => new Date(r.createdAt) >= thirtyDaysAgo,
  ).length;
  const requestsLast7Days = requests.filter(
    (r) => new Date(r.createdAt) >= sevenDaysAgo,
  ).length;

  const decidedRequests = requests.filter(
    (r) => r.status === "approved" || r.status === "rejected",
  );
  let avgTimeToDecisionHours = 0;
  if (decidedRequests.length > 0) {
    const totalHours = decidedRequests.reduce((sum, r) => {
      const created = new Date(r.createdAt).getTime();
      const updated = new Date(r.updatedAt).getTime();
      return sum + (updated - created) / (1000 * 60 * 60);
    }, 0);
    avgTimeToDecisionHours = Math.round((totalHours / decidedRequests.length) * 10) / 10;
  }

  const requestApprovalRate = (approved + rejected) > 0
    ? Math.round((approved / (approved + rejected)) * 100) / 100
    : 0;

  const landsByCategory: Record<string, number> = {};
  for (const land of activeLands) {
    for (const use of land.allowedUses) {
      landsByCategory[use] = (landsByCategory[use] ?? 0) + 1;
    }
  }

  let totalRevenue = 0;
  if (requests.length > 0) {
    const requestIds = requests.map((r) => r.id);
    const paidRequests = requests.filter(
      (r) => r.status === "paid" || r.status === "approved" || r.status === "pending_payment",
    );
    const paidRequestIds = paidRequests.map((r) => r.id);

    if (paidRequestIds.length > 0) {
      const payments = await Payment.find({
        rentalRequestId: { $in: paidRequestIds },
        status: "paid",
      }).lean();
      totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    }
  }

  return {
    totalLands: activeLands.length,
    landsByCategory,
    totalRequests,
    pendingOwner,
    approved,
    rejected,
    requestApprovalRate,
    requestsLast30Days,
    requestsLast7Days,
    avgTimeToDecisionHours,
    totalRevenue,
  };
}

export const getOwnerAnalyticsTool: ToolDefinition<typeof getOwnerAnalyticsInput> = {
  name: "get_owner_analytics",
  title: "Analiticas del dueño",
  description:
    "Obtiene metricas de analiticas para un propietario: terrenos activos, solicitudes, tasa de aprobacion, ingresos y mas.",
  inputSchema: getOwnerAnalyticsInput,
  requires: "user",
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return getOwnerAnalytics(args, actingUser);
  },
};
