import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { isOwnerOrAdmin } from "../lib/auth-helpers";
import { requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { getStore } from "../store/in-memory-db";
import type { RentalRequestRecord, RentalRequestStatus } from "../store/types";
import type { AppEnv } from "../types";

const allowedTransitions: Record<RentalRequestStatus, RentalRequestStatus[]> = {
  draft: ["pending_owner", "cancelled"],
  pending_owner: ["approved", "rejected", "cancelled"],
  approved: ["pending_payment", "cancelled"],
  rejected: [],
  cancelled: [],
  pending_payment: ["paid", "cancelled"],
  paid: [],
};

function canTransition(from: RentalRequestStatus, to: RentalRequestStatus) {
  return allowedTransitions[from].includes(to);
}

export const rentalRequestRoutes = new Hono<AppEnv>();

rentalRequestRoutes.post("/rental-requests", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as
    | {
        landId?: string;
        period?: { startDate?: string; endDate?: string };
        intendedUse?: string;
        notes?: string;
      }
    | null;

  if (
    !body?.landId ||
    !body.period?.startDate ||
    !body.period?.endDate ||
    !body.intendedUse
  ) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing required rental request fields");
  }

  const store = getStore();
  const land = store.lands.get(body.landId);
  if (!land) {
    return failure(c, 404, "NOT_FOUND", "Land not found");
  }

  if (land.ownerId === authUser.id) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Owner cannot create request for own land");
  }

  const periodStart = Date.parse(body.period.startDate);
  const periodEnd = Date.parse(body.period.endDate);
  if (Number.isNaN(periodStart) || Number.isNaN(periodEnd) || periodEnd <= periodStart) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid rental period");
  }

  const overlappingPaid = Array.from(store.rentalRequests.values()).some((request) => {
    if (request.landId !== body.landId) {
      return false;
    }
    if (!["approved", "pending_payment", "paid"].includes(request.status)) {
      return false;
    }
    const existingStart = Date.parse(request.period.startDate);
    const existingEnd = Date.parse(request.period.endDate);
    return periodStart < existingEnd && periodEnd > existingStart;
  });

  if (overlappingPaid) {
    return failure(
      c,
      409,
      "CONFLICT",
      "Land already has an overlapping approved/pending rental request",
    );
  }

  const now = new Date().toISOString();
  const record: RentalRequestRecord = {
    id: `rr_${crypto.randomUUID()}`,
    landId: body.landId,
    tenantId: authUser.id,
    period: {
      startDate: body.period.startDate,
      endDate: body.period.endDate,
    },
    intendedUse: body.intendedUse,
    notes: body.notes,
    status: "pending_owner",
    createdAt: now,
    updatedAt: now,
  };

  store.rentalRequests.set(record.id, record);
  createAuditEvent({
    actor: authUser,
    entity: "rental_request",
    action: "created",
    entityId: record.id,
    metadata: {
      landId: record.landId,
      period: record.period,
    },
  });

  return success(c, record, 201);
});

rentalRequestRoutes.get("/rental-requests", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();

  const items = Array.from(store.rentalRequests.values()).filter((request) => {
    if (authUser.role === "admin") {
      return true;
    }

    if (request.tenantId === authUser.id) {
      return true;
    }

    const land = store.lands.get(request.landId);
    return Boolean(land && land.ownerId === authUser.id);
  });

  return success(c, items);
});

rentalRequestRoutes.get("/rental-requests/:requestId", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const record = store.rentalRequests.get(c.req.param("requestId"));

  if (!record) {
    return failure(c, 404, "NOT_FOUND", "Rental request not found");
  }

  const land = store.lands.get(record.landId);
  const canAccess =
    authUser.role === "admin" ||
    record.tenantId === authUser.id ||
    Boolean(land && land.ownerId === authUser.id);

  if (!canAccess) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this rental request");
  }

  return success(c, record);
});

rentalRequestRoutes.patch("/rental-requests/:requestId/status", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const requestId = c.req.param("requestId");
  const current = store.rentalRequests.get(requestId);

  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Rental request not found");
  }

  const land = store.lands.get(current.landId);
  if (!land) {
    return failure(c, 404, "NOT_FOUND", "Related land not found");
  }

  const isOwner = isOwnerOrAdmin(authUser, land.ownerId);
  const isTenant = current.tenantId === authUser.id;

  const body = (await c.req.json().catch(() => null)) as
    | { status?: RentalRequestStatus; reason?: string }
    | null;

  const nextStatus = body?.status;
  if (!nextStatus) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing status");
  }

  if (!canTransition(current.status, nextStatus)) {
    return failure(c, 409, "CONFLICT", `Invalid status transition ${current.status} -> ${nextStatus}`);
  }

  const ownerOnlyStatuses: RentalRequestStatus[] = ["approved", "rejected"];
  if (ownerOnlyStatuses.includes(nextStatus) && !isOwner) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can approve/reject requests");
  }

  if (nextStatus === "cancelled" && !(isOwner || isTenant || authUser.role === "admin")) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to cancel this request");
  }

  const updated: RentalRequestRecord = {
    ...current,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };

  store.rentalRequests.set(updated.id, updated);

  createAuditEvent({
    actor: authUser,
    entity: "rental_request",
    action:
      nextStatus === "approved"
        ? "approved"
        : nextStatus === "rejected"
          ? "rejected"
          : nextStatus === "cancelled"
            ? "cancelled"
            : "status_changed",
    entityId: updated.id,
    metadata: {
      from: current.status,
      to: nextStatus,
      reason: body?.reason,
    },
  });

  return success(c, updated);
});
