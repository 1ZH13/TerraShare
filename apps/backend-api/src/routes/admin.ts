import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { getStore } from "../store/in-memory-db";
import type { AdminLandSummary, AdminUserSummary, UserStatus } from "../store/types";
import type { AppEnv } from "../types";

export const adminRoutes = new Hono<AppEnv>();

// ─── Users ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/users
 * Lista todos los usuarios del sistema con filtros opcionales.
 * Auth: required (admin)
 */
adminRoutes.get("/admin/users", requireAuth, requireAdmin, (c) => {
  const store = getStore();
  const role = c.req.query("role") as "user" | "admin" | undefined;
  const status = c.req.query("status") as UserStatus | undefined;
  const search = c.req.query("search")?.toLowerCase();

  let users = Array.from(store.users.values()) as AdminUserSummary[];

  if (role) {
    users = users.filter((u) => u.role === role);
  }
  if (status) {
    users = users.filter((u) => u.status === status);
  }
  if (search) {
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        u.profile.fullName.toLowerCase().includes(search),
    );
  }

  return success(c, { items: users, total: users.length });
});

/**
 * GET /api/v1/admin/users/:userId
 * Detalle de un usuario.
 * Auth: required (admin)
 */
adminRoutes.get("/admin/users/:userId", requireAuth, requireAdmin, (c) => {
  const store = getStore();
  const userId = c.req.param("userId");
  const user = store.users.get(userId);
  if (!user) {
    return failure(c, 404, "NOT_FOUND", "User not found");
  }
  return success(c, user);
});

/**
 * PATCH /api/v1/admin/users/:userId/status
 * Bloquea o activa un usuario.
 * Auth: required (admin)
 * Body: { status: "active" | "blocked" }
 */
adminRoutes.patch("/admin/users/:userId/status", requireAuth, requireAdmin, async (c) => {
  const store = getStore();
  const authUser = c.get("authUser");
  const userId = c.req.param("userId");
  const user = store.users.get(userId);
  if (!user) {
    return failure(c, 404, "NOT_FOUND", "User not found");
  }

  const body = (await c.req.json().catch(() => null)) as { status?: UserStatus } | null;
  const nextStatus = body?.status;
  if (!nextStatus || !["active", "blocked"].includes(nextStatus)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid status value");
  }

  // Cannot block yourself
  if (userId === authUser.id) {
    return failure(c, 400, "BUSINESS_RULE_VIOLATION", "Cannot modify own account status");
  }

  const updated = { ...user, status: nextStatus, updatedAt: new Date().toISOString() };
  store.users.set(userId, updated);

  createAuditEvent({
    actor: authUser,
    entity: "user",
    action: "status_changed",
    entityId: userId,
    metadata: { email: user.email },
  });

  return success(c, updated);
});

// ─── Lands ───────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/lands
 * Lista terrenos con filtros — centrado en moderation (draft/inactive).
 * Auth: required (admin)
 */
adminRoutes.get("/admin/lands", requireAuth, requireAdmin, (c) => {
  const store = getStore();
  const status = c.req.query("status");
  const search = c.req.query("search")?.toLowerCase();

  let lands = Array.from(store.lands.values());

  if (status && ["draft", "active", "inactive"].includes(status)) {
    lands = lands.filter((l) => l.status === status);
  }
  if (search) {
    lands = lands.filter(
      (l) =>
        l.title.toLowerCase().includes(search) ||
        l.location.province.toLowerCase().includes(search),
    );
  }

  const items: AdminLandSummary[] = lands.map((l) => {
    const owner = store.users.get(l.ownerId);
    return {
      id: l.id,
      ownerId: l.ownerId,
      ownerEmail: owner?.email ?? l.ownerId,
      title: l.title,
      status: l.status,
      createdAt: l.createdAt,
    };
  });

  return success(c, { items, total: items.length });
});

/**
 * PATCH /api/v1/admin/lands/:landId/status
 * Cambia el estado de un terreno — usado para aprobar/rechazar moderation.
 * Auth: required (admin)
 * Body: { status: "active" | "inactive" | "rejected" }
 */
adminRoutes.patch("/admin/lands/:landId/status", requireAuth, requireAdmin, async (c) => {
  const store = getStore();
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");
  const land = store.lands.get(landId);
  if (!land) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  const body = (await c.req.json().catch(() => null)) as { status?: string } | null;
  const nextStatus = body?.status;
  if (!nextStatus || !["active", "inactive", "rejected"].includes(nextStatus)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid status value");
  }

  const updated = { ...land, status: nextStatus as typeof land.status, updatedAt: new Date().toISOString() };
  store.lands.set(landId, updated);

  createAuditEvent({
    actor: authUser,
    entity: "land",
    action: nextStatus === "active" ? "approved" : "rejected",
    entityId: landId,
    metadata: { title: land.title },
  });

  return success(c, updated);
});