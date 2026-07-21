import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("contracts and audit routes", () => {
  it("creates contract as owner", async () => {
    const { response, payload } = await requestJson("/api/v1/contracts", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_owner_01",
      },
      body: {
        rentalRequestId: "rr_seed_01",
        terms: {
          summary: "Contrato anual",
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        },
      },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.rentalRequestId).toBe("rr_seed_01");
  });

  // #140 F-3: el enum de AuditEvent.action carecía de "signed"/"completed", así
  // que firmar un contrato reventaba al registrar la auditoría (500). Ahora el
  // flujo completo debe funcionar y dejar el evento "signed".
  it("signs a contract and records a 'signed' audit event (F-3)", async () => {
    const created = await requestJson("/api/v1/contracts", {
      method: "POST",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: {
        rentalRequestId: "rr_seed_01",
        terms: {
          summary: "Contrato para firmar",
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        },
      },
    });
    const contractId = created.payload.data.id;

    const signed = await requestJson(`/api/v1/contracts/${contractId}/sign`, {
      method: "POST",
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(signed.response.status).toBe(200);
    expect(signed.payload.data.status).toBe("active");

    const audit = await requestJson(
      "/api/v1/audit-events?entity=contract&action=signed",
      { headers: { "x-dev-user-id": "admin_test", "x-dev-role": "admin" } },
    );
    expect(audit.response.status).toBe(200);
    expect(audit.payload.data.some((e: { entityId: string }) => e.entityId === contractId)).toBe(true);
  });

  it("lists audit events for admin", async () => {
    const { response, payload } = await requestJson("/api/v1/audit-events", {
      headers: {
        "x-dev-user-id": "admin_test",
        "x-dev-role": "admin",
      },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data)).toBe(true);
  });
});

describe("contract PDF export (HU-101 #327)", () => {
  it("exports contract as PDF for owner", async () => {
    const res = await requestJson("/api/v1/contracts/contract_seed_01/pdf", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(res.response.status).toBe(200);
    expect(res.response.headers.get("content-type")).toContain("application/pdf");
  });

  it("tenant can download contract PDF", async () => {
    const res = await requestJson("/api/v1/contracts/contract_seed_01/pdf", {
      headers: { "x-dev-user-id": "user_tenant_01" },
    });
    expect(res.response.status).toBe(200);
    expect(res.response.headers.get("content-type")).toContain("application/pdf");
  });

  it("admin can download contract PDF", async () => {
    const res = await requestJson("/api/v1/contracts/contract_seed_01/pdf", {
      headers: { "x-dev-user-id": "user_admin_01", "x-dev-role": "admin" },
    });
    expect(res.response.status).toBe(200);
    expect(res.response.headers.get("content-type")).toContain("application/pdf");
  });

  it("rejects PDF export for non-party", async () => {
    const res = await requestJson("/api/v1/contracts/contract_seed_01/pdf", {
      headers: { "x-dev-user-id": "random_stranger" },
    });
    expect(res.response.status).toBe(403);
  });

  it("returns 404 for non-existent contract PDF", async () => {
    const res = await requestJson("/api/v1/contracts/nonexistent/pdf", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(res.response.status).toBe(404);
  });
});
