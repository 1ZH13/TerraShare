import { describe, expect, it } from "bun:test";

import { requireAdmin } from "../middleware/require-auth";
import type { AuthContextUser } from "../types";
import {
  canAccessAuditEvents,
  canCreateContract,
  canCreateRentalRequest,
  canInitiatePayment,
  canListPayments,
  canListRentalRequests,
  canMutateContract,
  canMutateLand,
  canReadChat,
  canReadContract,
  canReadNotification,
  canReadPayment,
  canReadRentalRequest,
  canTransitionRentalRequest,
  isAdmin,
  isOwnerOrAdmin,
  isParticipant,
} from "./auth-helpers";

const adminUser: AuthContextUser = {
  id: "admin_01",
  clerkUserId: "admin_01",
  email: "admin@test",
  role: "admin",
  status: "active",
  profile: { fullName: "Admin" },
};

const ownerUser: AuthContextUser = {
  id: "owner_01",
  clerkUserId: "owner_01",
  email: "owner@test",
  role: "user",
  status: "active",
  profile: { fullName: "Owner" },
};

const tenantUser: AuthContextUser = {
  id: "tenant_01",
  clerkUserId: "tenant_01",
  email: "tenant@test",
  role: "user",
  status: "active",
  profile: { fullName: "Tenant" },
};

const outsiderUser: AuthContextUser = {
  id: "outsider_01",
  clerkUserId: "outsider_01",
  email: "outsider@test",
  role: "user",
  status: "active",
  profile: { fullName: "Outsider" },
};

const land = { ownerId: "owner_01" };
const request = { tenantId: "tenant_01" };
const contract = { ownerId: "owner_01", tenantId: "tenant_01" };
const notification = { userId: "owner_01" };
const chat = {
  participants: [
    { userId: "owner_01", role: "owner" as const },
    { userId: "tenant_01", role: "tenant" as const },
  ],
};

describe("auth-helpers legacy", () => {
  it("isAdmin detecta admin", () => {
    expect(isAdmin(adminUser)).toBe(true);
    expect(isAdmin(ownerUser)).toBe(false);
  });

  it("isOwnerOrAdmin permite owner o admin", () => {
    expect(isOwnerOrAdmin(ownerUser, "owner_01")).toBe(true);
    expect(isOwnerOrAdmin(adminUser, "owner_01")).toBe(true);
    expect(isOwnerOrAdmin(tenantUser, "owner_01")).toBe(false);
  });
});

describe("isParticipant", () => {
  it("participante esta en el chat", () => {
    expect(isParticipant(chat, "owner_01")).toBe(true);
    expect(isParticipant(chat, "tenant_01")).toBe(true);
    expect(isParticipant(chat, "outsider_01")).toBe(false);
  });
});

describe("canMutateLand", () => {
  it("owner puede mutar su land", () => {
    expect(canMutateLand(ownerUser, land)).toBe(true);
  });
  it("admin puede mutar cualquier land", () => {
    expect(canMutateLand(adminUser, land)).toBe(true);
  });
  it("outsider no puede mutar", () => {
    expect(canMutateLand(tenantUser, land)).toBe(false);
  });
});

describe("canReadRentalRequest", () => {
  it("admin puede leer cualquier request", () => {
    expect(canReadRentalRequest(adminUser, request, land)).toBe(true);
  });
  it("tenant puede leer su request", () => {
    expect(canReadRentalRequest(tenantUser, request, land)).toBe(true);
  });
  it("owner de la land puede leer el request", () => {
    expect(canReadRentalRequest(ownerUser, request, land)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadRentalRequest(outsiderUser, request, land)).toBe(false);
  });
});

describe("canListRentalRequests", () => {
  it("admin ve todos (filtro vacio)", () => {
    expect(canListRentalRequests(adminUser, [])).toEqual({});
  });
  it("user ve requests donde es tenant o owner de la land", () => {
    const filter = canListRentalRequests(tenantUser, ["land_01"]);
    expect(filter).toEqual({
      $or: [{ tenantId: "tenant_01" }, { landId: { $in: ["land_01"] } }],
    });
  });
  it("user sin lands como owner ve solo sus requests como tenant", () => {
    const filter = canListRentalRequests(tenantUser, []);
    expect(filter).toEqual({
      $or: [{ tenantId: "tenant_01" }, { landId: { $in: [] } }],
    });
  });
});

describe("canCreateRentalRequest", () => {
  it("no-owner puede crear request", () => {
    expect(canCreateRentalRequest(tenantUser, land)).toBe(true);
  });
  it("owner no puede crear request sobre propia land", () => {
    expect(canCreateRentalRequest(ownerUser, land)).toBe(false);
  });
});

describe("canTransitionRentalRequest", () => {
  it("owner puede aprobar", () => {
    expect(canTransitionRentalRequest(ownerUser, request, land, "approved")).toBe(true);
  });
  it("admin puede aprobar", () => {
    expect(canTransitionRentalRequest(adminUser, request, land, "approved")).toBe(true);
  });
  it("tenant no puede aprobar", () => {
    expect(canTransitionRentalRequest(tenantUser, request, land, "approved")).toBe(false);
  });
  it("tenant puede cancelar", () => {
    expect(canTransitionRentalRequest(tenantUser, request, land, "cancelled")).toBe(true);
  });
  it("owner puede cancelar", () => {
    expect(canTransitionRentalRequest(ownerUser, request, land, "cancelled")).toBe(true);
  });
  it("outsider no puede cancelar", () => {
    expect(canTransitionRentalRequest(outsiderUser, request, land, "cancelled")).toBe(false);
  });
});

describe("canCreateContract", () => {
  it("owner de la land puede crear contrato", () => {
    expect(canCreateContract(ownerUser, land)).toBe(true);
  });
  it("admin puede crear contrato", () => {
    expect(canCreateContract(adminUser, land)).toBe(true);
  });
  it("tenant no puede crear contrato", () => {
    expect(canCreateContract(tenantUser, land)).toBe(false);
  });
});

describe("canReadContract", () => {
  it("admin puede leer cualquier contrato", () => {
    expect(canReadContract(adminUser, contract)).toBe(true);
  });
  it("owner puede leer su contrato", () => {
    expect(canReadContract(ownerUser, contract)).toBe(true);
  });
  it("tenant puede leer su contrato", () => {
    expect(canReadContract(tenantUser, contract)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadContract(outsiderUser, contract)).toBe(false);
  });
});

describe("canMutateContract", () => {
  it("owner puede mutar su contrato", () => {
    expect(canMutateContract(ownerUser, contract)).toBe(true);
  });
  it("admin puede mutar cualquier contrato", () => {
    expect(canMutateContract(adminUser, contract)).toBe(true);
  });
  it("tenant no puede mutar", () => {
    expect(canMutateContract(tenantUser, contract)).toBe(false);
  });
});

describe("canInitiatePayment", () => {
  it("tenant puede iniciar pago de su request", () => {
    expect(canInitiatePayment(tenantUser, request)).toBe(true);
  });
  it("admin puede iniciar pago", () => {
    expect(canInitiatePayment(adminUser, request)).toBe(true);
  });
  it("owner no puede iniciar pago (no es tenant)", () => {
    expect(canInitiatePayment(ownerUser, request)).toBe(false);
  });
});

describe("canReadPayment", () => {
  it("admin puede leer cualquier pago", () => {
    expect(canReadPayment(adminUser, request, land)).toBe(true);
  });
  it("tenant puede leer su pago", () => {
    expect(canReadPayment(tenantUser, request, land)).toBe(true);
  });
  it("owner de la land puede leer el pago", () => {
    expect(canReadPayment(ownerUser, request, land)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadPayment(outsiderUser, request, land)).toBe(false);
  });
});

describe("canListPayments", () => {
  it("admin ve todos (filtro vacio)", () => {
    expect(canListPayments(adminUser, [])).toEqual({});
  });
  it("user ve pagos de sus requests (tenant o owner)", () => {
    const filter = canListPayments(tenantUser, ["rr_01", "rr_02"]);
    expect(filter).toEqual({ rentalRequestId: { $in: ["rr_01", "rr_02"] } });
  });
});

describe("canReadChat", () => {
  it("admin puede leer cualquier chat", () => {
    expect(canReadChat(adminUser, chat)).toBe(true);
  });
  it("participante puede leer", () => {
    expect(canReadChat(ownerUser, chat)).toBe(true);
    expect(canReadChat(tenantUser, chat)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadChat(outsiderUser, chat)).toBe(false);
  });
});

describe("canReadNotification", () => {
  it("admin puede leer cualquier notificacion", () => {
    expect(canReadNotification(adminUser, notification)).toBe(true);
  });
  it("dueno puede leer su notificacion", () => {
    expect(canReadNotification(ownerUser, notification)).toBe(true);
  });
  it("outsider no puede leer", () => {
    expect(canReadNotification(tenantUser, notification)).toBe(false);
  });
});

describe("canAccessAuditEvents", () => {
  it("admin puede acceder", () => {
    expect(canAccessAuditEvents(adminUser)).toBe(true);
  });
  it("user no puede acceder", () => {
    expect(canAccessAuditEvents(ownerUser)).toBe(false);
  });
});

const mfaAdminUser = {
  id: "admin_01",
  clerkUserId: "admin_01",
  email: "admin@example.com",
  role: "admin" as const,
  status: "active" as const,
  profile: { fullName: "Admin", phone: undefined },
  mfaVerified: true,
};

describe("requireAdmin", () => {
  it("rechaza admin sin MFA en produccion", async () => {
    const c = {
      get: (key: string) => {
        if (key === "authUser") return { ...mfaAdminUser, mfaVerified: false };
        return undefined;
      },
      req: { header: () => undefined },
      header: () => {},
      json: () => Promise.resolve({ error: { code: "MFA_REQUIRED" } }),
      res: undefined,
    } as any;

    let called = false;
    await requireAdmin(c, () => { called = true; });
    expect(called).toBe(false);
  });

  it("permite admin con MFA en produccion", async () => {
    const c = {
      get: (key: string) => {
        if (key === "authUser") return { ...mfaAdminUser, mfaVerified: true };
        return undefined;
      },
      req: { header: () => undefined },
      header: () => {},
      json: () => Promise.resolve({ error: { code: "" } }),
      res: undefined,
    } as any;

    let called = false;
    await requireAdmin(c, () => { called = true; });
    expect(called).toBe(true);
  });

  it("permite admin sin MFA en dev bypass", async () => {
    const c = {
      get: (key: string) => {
        if (key === "authUser") return { ...mfaAdminUser, mfaVerified: false };
        return undefined;
      },
      req: { header: (name: string) => name === "x-dev-user-id" ? "admin_01" : undefined },
      header: () => {},
      json: () => Promise.resolve({ error: { code: "" } }),
      res: undefined,
    } as any;

    let called = false;
    await requireAdmin(c, () => { called = true; });
    expect(called).toBe(true);
  });
});
