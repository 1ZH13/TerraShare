import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { isOwnerOrAdmin } from "../lib/auth-helpers";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { getStore } from "../store/in-memory-db";
import type { ContractRecord } from "../store/types";
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

  const store = getStore();
  const request = store.rentalRequests.get(body.rentalRequestId);
  if (!request) {
    return failure(c, 404, "NOT_FOUND", "Rental request not found");
  }

  const land = store.lands.get(request.landId);
  if (!land) {
    return failure(c, 404, "NOT_FOUND", "Related land not found");
  }

  if (!isOwnerOrAdmin(authUser, land.ownerId)) {
    return failure(c, 403, "FORBIDDEN", "Only owner or admin can create contracts");
  }

  const now = new Date().toISOString();
  const contract: ContractRecord = {
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
    createdAt: now,
    updatedAt: now,
  };

  store.contracts.set(contract.id, contract);
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

contractRoutes.get("/contracts", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const contracts = Array.from(store.contracts.values()).filter((contract) => {
    if (authUser.role === "admin") {
      return true;
    }
    return contract.ownerId === authUser.id || contract.tenantId === authUser.id;
  });

  return success(c, contracts);
});

contractRoutes.get("/contracts/:contractId", requireAuth, (c) => {
  const authUser = c.get("authUser");
  const store = getStore();
  const contract = store.contracts.get(c.req.param("contractId"));

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
  const store = getStore();
  const contractId = c.req.param("contractId");
  const current = store.contracts.get(contractId);

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

  const updated: ContractRecord = {
    ...current,
    status: status as ContractRecord["status"],
    updatedAt: new Date().toISOString(),
  };

  store.contracts.set(contractId, updated);

  createAuditEvent({
    actor: authUser,
    entity: "contract",
    action: "status_changed",
    entityId: contractId,
    metadata: { from: current.status, to: status, reason: body?.reason },
  });

  return success(c, updated);
});

contractRoutes.get("/audit-events", requireAuth, requireAdmin, (c) => {
  const store = getStore();
  const actorId = c.req.query("actorId");
  const entity = c.req.query("entity");
  const action = c.req.query("action");
  const entityId = c.req.query("entityId");

  let events = Array.from(store.auditEvents.values());

  if (actorId) {
    events = events.filter((event) => event.actorId === actorId);
  }
  if (entity) {
    events = events.filter((event) => event.entity === entity);
  }
  if (action) {
    events = events.filter((event) => event.action === action);
  }
  if (entityId) {
    events = events.filter((event) => event.entityId === entityId);
  }

  events.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return success(c, events);
});

contractRoutes.get("/audit-events/:eventId", requireAuth, requireAdmin, (c) => {
  const store = getStore();
  const event = store.auditEvents.get(c.req.param("eventId"));

  if (!event) {
    return failure(c, 404, "NOT_FOUND", "Audit event not found");
  }

  return success(c, event);
});
