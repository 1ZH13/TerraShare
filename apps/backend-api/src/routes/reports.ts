import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { Report, User, Land } from "../db/schemas";
import type { ReportReason, ReportStatus, ReportTargetType } from "../db/schemas";
import type { AppEnv } from "../types";

export const reportRoutes = new Hono<AppEnv>();

const TARGET_TYPES: ReportTargetType[] = ["land", "user", "chat"];
const REASONS: ReportReason[] = ["spam", "fraude", "contenido_inapropiado", "informacion_falsa", "otro"];
const STATUSES: ReportStatus[] = ["open", "reviewing", "resolved", "dismissed"];

/**
 * Etiqueta legible del elemento reportado para el panel admin. Para terrenos
 * usamos el título; para usuarios, el email; para chats, el propio id.
 */
async function describeTarget(targetType: ReportTargetType, targetId: string): Promise<string> {
  if (targetType === "land") {
    const land = await Land.findOne({ id: targetId }).lean();
    return land?.title ?? targetId;
  }
  if (targetType === "user") {
    const user = await User.findOne({ clerkUserId: targetId }).lean();
    return user?.email ?? targetId;
  }
  return targetId;
}

// ─── Crear reporte (cualquier usuario autenticado) ───────────────────────────

reportRoutes.post("/reports", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as
    | { targetType?: string; targetId?: string; reason?: string; description?: string }
    | null;

  if (!body) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid JSON body");
  }
  if (!body.targetType || !TARGET_TYPES.includes(body.targetType as ReportTargetType)) {
    return failure(c, 400, "VALIDATION_ERROR", "targetType must be one of land|user|chat");
  }
  if (!body.targetId || typeof body.targetId !== "string") {
    return failure(c, 400, "VALIDATION_ERROR", "targetId is required");
  }
  if (!body.reason || !REASONS.includes(body.reason as ReportReason)) {
    return failure(c, 400, "VALIDATION_ERROR", "reason is invalid");
  }

  const report = await Report.create({
    id: `report_${crypto.randomUUID()}`,
    targetType: body.targetType as ReportTargetType,
    targetId: body.targetId,
    reason: body.reason as ReportReason,
    description: typeof body.description === "string" ? body.description.trim() : undefined,
    reporterId: authUser.id,
    status: "open",
  });

  await createAuditEvent({
    actor: authUser,
    entity: "report",
    action: "created",
    entityId: report.id,
    metadata: { targetType: report.targetType, targetId: report.targetId, reason: report.reason },
  });

  return success(c, { id: report.id, status: report.status, createdAt: report.createdAt }, 201);
});

// ─── Listar reportes (solo admin) ────────────────────────────────────────────

reportRoutes.get("/admin/reports", requireAuth, requireAdmin, async (c) => {
  const status = c.req.query("status");
  const targetType = c.req.query("targetType");
  const search = c.req.query("search")?.toLowerCase();

  const query: Record<string, unknown> = {};
  if (status && STATUSES.includes(status as ReportStatus)) query.status = status;
  if (targetType && TARGET_TYPES.includes(targetType as ReportTargetType)) query.targetType = targetType;

  const reports = await Report.find(query).sort({ createdAt: -1 }).lean();

  const reporterIds = [...new Set(reports.map((r) => r.reporterId))];
  const reporters = await User.find({ clerkUserId: { $in: reporterIds } }).lean();
  const reporterMap = new Map(reporters.map((u) => [u.clerkUserId, u]));

  let items = await Promise.all(
    reports.map(async (r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      targetLabel: await describeTarget(r.targetType, r.targetId),
      reason: r.reason,
      status: r.status,
      reporterId: r.reporterId,
      reporterEmail: reporterMap.get(r.reporterId)?.email ?? r.reporterId,
      createdAt: r.createdAt,
    })),
  );

  if (search) {
    items = items.filter(
      (r) =>
        r.targetLabel.toLowerCase().includes(search) ||
        r.reporterEmail.toLowerCase().includes(search) ||
        r.reason.toLowerCase().includes(search),
    );
  }

  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(c.req.query("pageSize") ?? 20) || 20));
  const total = items.length;
  const start = (page - 1) * pageSize;

  return success(c, {
    items: items.slice(start, start + pageSize),
    total,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});

// ─── Ver un reporte (solo admin) ─────────────────────────────────────────────

reportRoutes.get("/admin/reports/:reportId", requireAuth, requireAdmin, async (c) => {
  const reportId = c.req.param("reportId");
  const report = await Report.findOne({ id: reportId }).lean();
  if (!report) {
    return failure(c, 404, "NOT_FOUND", "Report not found");
  }

  const reporter = await User.findOne({ clerkUserId: report.reporterId }).lean();

  return success(c, {
    ...report,
    targetLabel: await describeTarget(report.targetType, report.targetId),
    reporterEmail: reporter?.email ?? report.reporterId,
    reporterName: reporter?.profile?.fullName ?? null,
  });
});

// ─── Transicionar estado de un reporte (solo admin) ──────────────────────────

reportRoutes.patch("/admin/reports/:reportId", requireAuth, requireAdmin, async (c) => {
  const authUser = c.get("authUser");
  const reportId = c.req.param("reportId");

  const report = await Report.findOne({ id: reportId }).lean();
  if (!report) {
    return failure(c, 404, "NOT_FOUND", "Report not found");
  }

  const body = (await c.req.json().catch(() => null)) as
    | { status?: string; resolutionNote?: string }
    | null;
  const nextStatus = body?.status;
  if (!nextStatus || !STATUSES.includes(nextStatus as ReportStatus)) {
    return failure(c, 400, "VALIDATION_ERROR", "status must be one of open|reviewing|resolved|dismissed");
  }

  const isClosing = nextStatus === "resolved" || nextStatus === "dismissed";
  const update: Record<string, unknown> = {
    status: nextStatus,
    resolutionNote: typeof body?.resolutionNote === "string" ? body.resolutionNote.trim() : report.resolutionNote,
    resolvedBy: isClosing ? authUser.id : undefined,
  };

  await Report.updateOne({ id: reportId }, update);

  await createAuditEvent({
    actor: authUser,
    entity: "report",
    action: "status_changed",
    entityId: reportId,
    metadata: { from: report.status, to: nextStatus },
  });

  const updated = await Report.findOne({ id: reportId }).lean();
  return success(c, updated);
});
