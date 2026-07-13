import type { ZodRawShape } from "zod";

import { Land, Payment, RentalRequest, User } from "@backend/db/schemas";
import type { ToolDefinition } from "./define-tool";

/**
 * Tool HU-88 (#205): Analítica general (admin). Espeja el núcleo de
 * `GET /analytics/overview`: métricas agregadas de terrenos, solicitudes y pagos
 * (más usuarios) para que el agente genere reportes ejecutivos. Solo lectura.
 */

// Sin argumentos. Tipado como `ZodRawShape` para unificar en el array `TOOLS`.
export const getAnalyticsOverviewInput: ZodRawShape = {};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Estados de solicitud que cuentan como "aprobadas" (avanzadas). */
const APPROVED_STATUSES = ["approved", "pending_payment", "paid"];

export interface AnalyticsOverview {
  lands: { total: number; byCategory: Record<string, number> };
  requests: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    last7Days: number;
    last30Days: number;
    byStatus: Record<string, number>;
  };
  payments: {
    total: number;
    totalRevenue: number;
    pendingRevenue: number;
    byStatus: Record<string, number>;
  };
  users: { total: number; active: number };
}

/** Cuenta ocurrencias por una clave string en una colección. */
function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] || 0) + 1;
  return out;
}

/**
 * Lógica pura (testeable): agrega las métricas desde Mongo. Solo lectura; el
 * acceso admin lo garantiza `requires: "admin"` en la tool.
 */
export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const now = Date.now();
  const d7 = now - 7 * DAY_MS;
  const d30 = now - 30 * DAY_MS;

  const [activeLands, requests, payments, users] = await Promise.all([
    Land.find({ status: "active" }).lean(),
    RentalRequest.find().lean(),
    Payment.find().lean(),
    User.find().lean(),
  ]);

  // Terrenos (activos) por categoría de uso.
  const landsByCategory: Record<string, number> = {};
  for (const land of activeLands as unknown as { allowedUses?: string[] }[]) {
    for (const use of land.allowedUses ?? []) {
      landsByCategory[use] = (landsByCategory[use] || 0) + 1;
    }
  }

  const reqs = requests as unknown as { status: string; createdAt: Date | string }[];
  const approved = reqs.filter((r) => APPROVED_STATUSES.includes(r.status)).length;
  const rejected = reqs.filter((r) => r.status === "rejected").length;
  const inWindow = (d: Date | string, from: number) => new Date(d).getTime() >= from;

  const pays = payments as unknown as { status: string; amount: number }[];
  const totalRevenue = pays
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const pendingRevenue = pays
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const usrs = users as unknown as { status: string }[];

  return {
    lands: { total: activeLands.length, byCategory: landsByCategory },
    requests: {
      total: reqs.length,
      approved,
      rejected,
      pending: reqs.length - approved - rejected,
      last7Days: reqs.filter((r) => inWindow(r.createdAt, d7)).length,
      last30Days: reqs.filter((r) => inWindow(r.createdAt, d30)).length,
      byStatus: countBy(reqs, (r) => r.status),
    },
    payments: {
      total: pays.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      pendingRevenue: Math.round(pendingRevenue * 100) / 100,
      byStatus: countBy(pays, (p) => p.status),
    },
    users: { total: usrs.length, active: usrs.filter((u) => u.status === "active").length },
  };
}

/**
 * Definición de la tool. `requires: "admin"` → solo administradores; el
 * andamiaje aplica la puerta. Sin argumentos.
 */
export const getAnalyticsOverviewTool: ToolDefinition<typeof getAnalyticsOverviewInput> = {
  name: "get_analytics_overview",
  title: "Analítica general (admin)",
  description:
    "Devuelve un overview de métricas del negocio: terrenos (por categoría), solicitudes (por estado, aprobadas/rechazadas/pendientes, recientes), pagos (ingresos y pendientes) y usuarios. Solo admin; solo lectura.",
  inputSchema: getAnalyticsOverviewInput,
  requires: "admin",
  handler: () => getAnalyticsOverview(),
};
