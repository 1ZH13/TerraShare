import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { getStore } from "../store/in-memory-db";
import type { LandRecord } from "../store/types";
import type { AppEnv, UserStatus } from "../types";

const moderationDecisions = new Set(["approve", "reject"]);
const managedUserStatuses = new Set<UserStatus>(["active", "blocked"]);

function attachOwnerSnapshot(store: ReturnType<typeof getStore>, land: LandRecord) {
  const owner = store.users.get(land.ownerId);

  return {
    ...land,
    owner: owner
      ? {
          id: owner.id,
          email: owner.email,
          status: owner.status,
          profile: owner.profile,
        }
      : null,
  };
}

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.get("/admin/lands/pending", requireAuth, requireAdmin, (c) => {
  const store = getStore();
  const ownerId = c.req.query("ownerId");

  let items = Array.from(store.lands.values()).filter((land) => land.status === "draft");

  if (ownerId) {
    items = items.filter((land) => land.ownerId === ownerId);
  }

  items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return success(
    c,
    items.map((land) => attachOwnerSnapshot(store, land)),
  );
});

adminRoutes.patch("/admin/lands/:landId/moderate", requireAuth, requireAdmin, async (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const landId = c.req.param("landId");
  const current = store.lands.get(landId);

  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  const body = (await c.req.json().catch(() => null)) as
    | {
        decision?: "approve" | "reject";
        reason?: string;
      }
    | null;

  if (!body?.decision || !moderationDecisions.has(body.decision)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid moderation decision");
  }

  if (current.status !== "draft") {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Only draft lands can be moderated");
  }

  const toStatus = body.decision === "approve" ? "active" : "inactive";
  const auditAction = body.decision === "approve" ? "approved" : "rejected";

  const updated: LandRecord = {
    ...current,
    status: toStatus,
    updatedAt: new Date().toISOString(),
  };

  store.lands.set(landId, updated);

  createAuditEvent({
    actor: authUser,
    entity: "land",
    action: auditAction,
    entityId: landId,
    metadata: {
      from: current.status,
      to: toStatus,
      reason: body.reason,
    },
  });

  return success(c, attachOwnerSnapshot(store, updated));
});

adminRoutes.get("/admin/users", requireAuth, requireAdmin, (c) => {
  const store = getStore();
  const role = c.req.query("role");
  const status = c.req.query("status");
  const search = c.req.query("search")?.trim().toLowerCase();

  let users = Array.from(store.users.values());

  if (role === "admin" || role === "user") {
    users = users.filter((user) => user.role === role);
  }

  if (status === "active" || status === "blocked") {
    users = users.filter((user) => user.status === status);
  }

  if (search) {
    users = users.filter((user) => {
      const fullName = user.profile.fullName.toLowerCase();
      return (
        user.id.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        fullName.includes(search)
      );
    });
  }

  users.sort((a, b) => a.email.localeCompare(b.email));

  return success(c, users);
});

adminRoutes.patch("/admin/users/:userId/status", requireAuth, requireAdmin, async (c) => {
  const authUser = c.get("authUser");
  const userId = c.req.param("userId");
  const store = getStore();
  const current = store.users.get(userId);

  if (!current) {
    return failure(c, 404, "NOT_FOUND", "User not found");
  }

  const body = (await c.req.json().catch(() => null)) as
    | {
        status?: UserStatus;
        reason?: string;
      }
    | null;

  if (!body?.status || !managedUserStatuses.has(body.status)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid user status");
  }

  if (current.role === "admin" && body.status === "blocked") {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Admin users cannot be blocked");
  }

  if (current.id === authUser.id && body.status === "blocked") {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "You cannot block your own admin user");
  }

  if (current.status === body.status) {
    return success(c, current);
  }

  const updated = {
    ...current,
    status: body.status,
  };

  store.users.set(updated.id, updated);

  createAuditEvent({
    actor: authUser,
    entity: "user",
    action: "status_changed",
    entityId: updated.id,
    metadata: {
      from: current.status,
      to: updated.status,
      reason: body.reason,
    },
  });

  return success(c, updated);
});
