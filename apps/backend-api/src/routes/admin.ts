import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { User, Land, RentalRequest } from "../db/schemas";
import type { UserStatus } from "../db/schemas";
import type { AppEnv } from "../types";

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.get("/admin/users", requireAuth, requireAdmin, async (c) => {
  const role = c.req.query("role") as "user" | "admin" | undefined;
  const status = c.req.query("status") as UserStatus | undefined;
  const search = c.req.query("search")?.toLowerCase();

  const query: Record<string, any> = {};
  if (role) query.role = role;
  if (status) query.status = status;

  let users = await User.find(query).lean();

  if (search) {
    users = users.filter(
      (u) =>
        u.email.toLowerCase().includes(search) ||
        (u.profile?.fullName ?? "").toLowerCase().includes(search),
    );
  }

  return success(c, { items: users, total: users.length });
});

adminRoutes.get("/admin/users/:userId", requireAuth, requireAdmin, async (c) => {
  const userId = c.req.param("userId");
  
  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user) {
    return failure(c, 404, "NOT_FOUND", "User not found");
  }
  return success(c, user);
});

adminRoutes.patch("/admin/users/:userId/status", requireAuth, requireAdmin, async (c) => {
  const authUser = c.get("authUser");
  const userId = c.req.param("userId");

  const user = await User.findOne({ clerkUserId: userId }).lean();
  if (!user) {
    return failure(c, 404, "NOT_FOUND", "User not found");
  }

  const body = (await c.req.json().catch(() => null)) as { status?: UserStatus } | null;
  const nextStatus = body?.status;
  if (!nextStatus || !["active", "inactive"].includes(nextStatus)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid status value");
  }

  if (userId === authUser.id) {
    return failure(c, 400, "BUSINESS_RULE_VIOLATION", "Cannot modify own account status");
  }

  await User.updateOne({ clerkUserId: userId }, { status: nextStatus });

  createAuditEvent({
    actor: authUser,
    entity: "user",
    action: "status_changed",
    entityId: userId,
    metadata: { email: user.email },
  });

  const updated = await User.findOne({ clerkUserId: userId }).lean();
  return success(c, updated);
});

adminRoutes.get("/admin/lands", requireAuth, requireAdmin, async (c) => {
  const status = c.req.query("status");
  const search = c.req.query("search")?.toLowerCase();

  const query: Record<string, any> = {};
  if (status && ["draft", "active", "inactive"].includes(status)) {
    query.status = status;
  }

  let lands = await Land.find(query).lean();

  if (search) {
    lands = lands.filter(
      (l) =>
        l.title.toLowerCase().includes(search) ||
        l.location.province.toLowerCase().includes(search),
    );
  }

  const ownerClerkIds = [...new Set(lands.map((l) => l.ownerId))];
  const owners = await User.find({ clerkUserId: { $in: ownerClerkIds } }).lean();
  const ownerMap = new Map(owners.map((o) => [o.clerkUserId, o]));

  const items = lands.map((l) => ({
    id: l.id,
    ownerId: l.ownerId,
    ownerEmail: ownerMap.get(l.ownerId)?.email ?? l.ownerId,
    title: l.title,
    status: l.status,
    createdAt: l.createdAt,
  }));

  return success(c, { items, total: items.length });
});

adminRoutes.patch("/admin/lands/:landId/status", requireAuth, requireAdmin, async (c) => {
  const authUser = c.get("authUser");
  const landId = c.req.param("landId");

  const land = await Land.findOne({ id: landId }).lean();
  if (!land) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  const body = (await c.req.json().catch(() => null)) as { status?: string } | null;
  const nextStatus = body?.status;
  if (!nextStatus || !["active", "inactive"].includes(nextStatus)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid status value");
  }

  await Land.updateOne({ id: landId }, { status: nextStatus as any });

  createAuditEvent({
    actor: authUser,
    entity: "land",
    action: nextStatus === "active" ? "approved" : "rejected",
    entityId: landId,
    metadata: { title: land.title },
  });

  const updated = await Land.findOne({ id: landId }).lean();
  return success(c, updated);
});

adminRoutes.get("/admin/summary", requireAuth, requireAdmin, async (c) => {
  const [users, lands, requests] = await Promise.all([
    User.find().lean(),
    Land.find().lean(),
    RentalRequest.find().lean(),
  ]);

  return success(c, {
    users: {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      blocked: users.filter((u) => u.status === "inactive").length,
    },
    lands: {
      total: lands.length,
      active: lands.filter((l) => l.status === "active").length,
      draft: lands.filter((l) => l.status === "draft").length,
    },
    requests: {
      total: requests.length,
      pendingOwner: requests.filter((r) => r.status === "pending_owner").length,
      approved: requests.filter((r) => r.status === "approved").length,
      paid: requests.filter((r) => r.status === "paid").length,
    },
  });
});

adminRoutes.get("/admin/rental-requests", requireAuth, requireAdmin, async (c) => {
  const status = c.req.query("status");
  const search = c.req.query("search")?.toLowerCase();

  const query: Record<string, any> = {};
  if (status && status !== "all") {
    query.status = status;
  }

  let requests = await RentalRequest.find(query).lean();

  if (search) {
    const landIds = [...new Set(requests.map((r) => r.landId))];
    const tenantIds = [...new Set(requests.map((r) => r.tenantId))];
    const [lands, tenants] = await Promise.all([
      Land.find({ id: { $in: landIds } }).lean(),
      User.find({ clerkUserId: { $in: tenantIds } }).lean(),
    ]);
    const landMap = new Map(lands.map((l) => [l.id, l]));
    const tenantMap = new Map(tenants.map((t) => [t.clerkUserId, t]));

    requests = requests.filter((request) => {
      const land = landMap.get(request.landId);
      const tenant = tenantMap.get(request.tenantId);
      return Boolean(
        request.id.toLowerCase().includes(search) ||
        land?.title.toLowerCase().includes(search) ||
        tenant?.email.toLowerCase().includes(search),
      );
    });
  }

  const landIds = [...new Set(requests.map((r) => r.landId))];
  const tenantIds = [...new Set(requests.map((r) => r.tenantId))];
  const [lands, tenants] = await Promise.all([
    Land.find({ id: { $in: landIds } }).lean(),
    User.find({ clerkUserId: { $in: tenantIds } }).lean(),
  ]);
  const landMap = new Map(lands.map((l) => [l.id, l]));
  const tenantMap = new Map(tenants.map((t) => [t.clerkUserId, t]));

  const items = requests.map((request) => {
    const land = landMap.get(request.landId);
    const tenant = tenantMap.get(request.tenantId);
    return {
      id: request.id,
      landId: request.landId,
      landTitle: land?.title ?? request.landId,
      tenantEmail: tenant?.email ?? request.tenantId,
      status: request.status,
      intendedUse: request.intendedUse,
      createdAt: request.createdAt,
      period: request.period,
    };
  });

  return success(c, { items, total: items.length });
});
