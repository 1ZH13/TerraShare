import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { isOwnerOrAdmin } from "../lib/auth-helpers";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { Contract, AuditEvent, RentalRequest, Land } from "../db/schemas";
import type { AppEnv } from "../types";

const allowedContractStatus = new Set(["active", "completed", "cancelled"]);

export const contractRoutes = new Hono<AppEnv>();

contractRoutes.post("/contracts", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const body = (await c.req.json().catch(() => null)) as
    | {
        rentalRequestId?: string;
        terms?: { summary?: string; signedAt?: string; startsAt?: string; endsAt?: string };
      }
    | null;

  if (!body?.rentalRequestId || !body.terms?.summary || !body.terms?.startsAt || !body.terms?.endsAt) {
    return failure(c, 400, "VALIDATION_ERROR", "Missing contract fields");
  }

  const request = await RentalRequest.findOne({ id: body.rentalRequestId }).lean();
  if (!request) {
    return failure(c, 404, "NOT_FOUND", "Rental request not found");
  }

  const land = await Land.findOne({ id: request.landId }).lean();
  if (!land) {
    return failure(c, 404, "NOT_FOUND", "Related land not found");
  }

  if (!isOwnerOrAdmin(authUser, land.ownerId)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can create contracts");
  }

  const contract = await Contract.create({
    id: `contract_${crypto.randomUUID()}`,
    rentalRequestId: request.id,
    ownerId: land.ownerId,
    tenantId: request.tenantId,
    terms: {
      summary: body.terms.summary,
      signedAt: body.terms.signedAt,
      startsAt: body.terms.startsAt,
      endsAt: body.terms.endsAt,
    },
    status: "draft",
  });

  createAuditEvent({
    actor: authUser,
    entity: "contract",
    action: "created",
    entityId: contract.id,
    metadata: {
      rentalRequestId: contract.rentalRequestId,
    },
  });

  return success(c, contract, 201);
});

contractRoutes.get("/contracts", requireAuth, async (c) => {
  const authUser = c.get("authUser");

  const query = authUser.role === "admin"
    ? {}
    : { $or: [{ ownerId: authUser.id }, { tenantId: authUser.id }] };

  const contracts = await Contract.find(query).lean();
  return success(c, contracts);
});

contractRoutes.get("/contracts/:contractId", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const contractId = c.req.param("contractId");

  const contract = await Contract.findOne({ id: contractId }).lean();
  if (!contract) {
    return failure(c, 404, "NOT_FOUND", "Contract not found");
  }

  if (
    authUser.role !== "admin" &&
    contract.ownerId !== authUser.id &&
    contract.tenantId !== authUser.id
  ) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to access this contract");
  }

  return success(c, contract);
});

contractRoutes.patch("/contracts/:contractId/status", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const contractId = c.req.param("contractId");

  const current = await Contract.findOne({ id: contractId }).lean();
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Contract not found");
  }

  if (!isOwnerOrAdmin(authUser, current.ownerId)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can update contract status");
  }

  const body = (await c.req.json().catch(() => null)) as { status?: string; reason?: string } | null;
  const status = body?.status;

  if (!status || !allowedContractStatus.has(status)) {
    return failure(c, 400, "VALIDATION_ERROR", "Invalid contract status");
  }

  await Contract.updateOne(
    { id: contractId },
    { status: status as any, updatedAt: new Date() },
  );

  createAuditEvent({
    actor: authUser,
    entity: "contract",
    action: "status_changed",
    entityId: contractId,
    metadata: { from: current.status, to: status, reason: body?.reason },
  });

  const updated = await Contract.findOne({ id: contractId }).lean();
  return success(c, updated);
});

contractRoutes.post("/contracts/:contractId/sign", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const contractId = c.req.param("contractId");

  const current = await Contract.findOne({ id: contractId }).lean();
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Contract not found");
  }

  if (
    authUser.role !== "admin" &&
    current.ownerId !== authUser.id &&
    current.tenantId !== authUser.id
  ) {
    return failure(c, 403, "FORBIDDEN", "Not allowed to sign this contract");
  }

  if (current.status !== "draft") {
    return failure(c, 400, "INVALID_TRANSITION", `Cannot sign contract in '${current.status}' status`);
  }

  await Contract.updateOne(
    { id: contractId },
    {
      status: "active",
      "terms.signedAt": new Date().toISOString(),
      updatedAt: new Date(),
    },
  );

  createAuditEvent({
    actor: authUser,
    entity: "contract",
    action: "signed",
    entityId: contractId,
    metadata: { from: current.status, to: "active" },
  });

  const updated = await Contract.findOne({ id: contractId }).lean();
  return success(c, updated);
});

contractRoutes.post("/contracts/:contractId/complete", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const contractId = c.req.param("contractId");

  const current = await Contract.findOne({ id: contractId }).lean();
  if (!current) {
    return failure(c, 404, "NOT_FOUND", "Contract not found");
  }

  if (!isOwnerOrAdmin(authUser, current.ownerId)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can complete this contract");
  }

  if (current.status !== "active") {
    return failure(c, 400, "INVALID_TRANSITION", `Cannot complete contract in '${current.status}' status`);
  }

  await Contract.updateOne(
    { id: contractId },
    { status: "completed", updatedAt: new Date() },
  );

  createAuditEvent({
    actor: authUser,
    entity: "contract",
    action: "completed",
    entityId: contractId,
    metadata: { from: current.status, to: "completed" },
  });

  const updated = await Contract.findOne({ id: contractId }).lean();
  return success(c, updated);
});

contractRoutes.get("/audit-events", requireAuth, requireAdmin, async (c) => {
  const actorId = c.req.query("actorId");
  const entity = c.req.query("entity");
  const action = c.req.query("action");
  const entityIdQuery = c.req.query("entityId");

  const query: Record<string, any> = {};
  if (actorId) query.actorId = actorId;
  if (entity) query.entity = entity;
  if (action) query.action = action;
  if (entityIdQuery) query.entityId = entityIdQuery;

  const events = await AuditEvent.find(query).sort({ createdAt: -1 }).lean();
  return success(c, events);
});

contractRoutes.get("/audit-events/:eventId", requireAuth, requireAdmin, async (c) => {
  const eventId = c.req.param("eventId");

  const event = await AuditEvent.findOne({ id: eventId }).lean();
  if (!event) {
    return failure(c, 404, "NOT_FOUND", "Audit event not found");
  }

  return success(c, event);
});
