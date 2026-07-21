import { describe, expect, it } from "bun:test";
import { inflateSync } from "zlib";

import { requestJson } from "../lib/http-test-utils";
import { User } from "../db/schemas";

function extractPdfText(buf: Buffer): string {
  const str = buf.toString("latin1");
  const texts: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = streamRe.exec(str)) !== null) {
    const raw = Buffer.from(m[1], "latin1");
    try {
      const decompressed = inflateSync(raw);
      const decoded = decompressed.toString("latin1");
      // TJ arrays: [<hex> <kerning> <hex> ...] TJ
      const tjArrRe = /\[([^\]]*)\]\s*TJ/g;
      let tjArr;
      while ((tjArr = tjArrRe.exec(decoded)) !== null) {
        let line = "";
        const parts = tjArr[1].split(/(<[0-9A-Fa-f]+>)/);
        for (const part of parts) {
          if (part.startsWith("<") && part.endsWith(">")) {
            line += Buffer.from(part.slice(1, -1), "hex").toString("latin1");
          }
        }
        texts.push(line);
      }
      // Simple Tj: (text) Tj
      const tjRe = /\(([^)]*)\)\s*Tj/g;
      let tj;
      while ((tj = tjRe.exec(decoded)) !== null) {
        texts.push(tj[1]);
      }
    } catch {
      // not a compressed stream, skip
    }
  }
  return texts.join(" ");
}

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

  it("exports contract as PDF for owner", async () => {
    const res = await requestJson("/api/v1/contracts/contract_seed_01/pdf", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(res.response.status).toBe(200);
    const contentType = res.response.headers.get("content-type");
    expect(contentType).toContain("application/pdf");
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

  it("admin can download contract PDF", async () => {
    const res = await requestJson("/api/v1/contracts/contract_seed_01/pdf", {
      headers: { "x-dev-user-id": "user_admin_01", "x-dev-role": "admin" },
    });
    expect(res.response.status).toBe(200);
    const contentType = res.response.headers.get("content-type");
    expect(contentType).toContain("application/pdf");
  });

  it("tenant can download contract PDF", async () => {
    const res = await requestJson("/api/v1/contracts/contract_seed_01/pdf", {
      headers: { "x-dev-user-id": "user_tenant_01" },
    });
    expect(res.response.status).toBe(200);
    const contentType = res.response.headers.get("content-type");
    expect(contentType).toContain("application/pdf");
  });

  it("signed contract PDF includes Firma section and resolved names", async () => {
    await User.findOneAndUpdate(
      { clerkUserId: "user_owner_01" },
      { $setOnInsert: { clerkUserId: "user_owner_01", email: "owner@test.com", role: "user", status: "active", profile: { fullName: "Propietario Demo" } } },
      { upsert: true },
    );
    await User.findOneAndUpdate(
      { clerkUserId: "user_tenant_01" },
      { $setOnInsert: { clerkUserId: "user_tenant_01", email: "tenant@test.com", role: "user", status: "active", profile: { fullName: "Arrendatario Demo" } } },
      { upsert: true },
    );

    const created = await requestJson("/api/v1/contracts", {
      method: "POST",
      headers: { "x-dev-user-id": "user_owner_01" },
      body: {
        rentalRequestId: "rr_seed_01",
        terms: {
          summary: "Contrato para PDF firmado",
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
        },
      },
    });
    const contractId = created.payload.data.id;

    await requestJson(`/api/v1/contracts/${contractId}/sign`, {
      method: "POST",
      headers: { "x-dev-user-id": "user_owner_01" },
    });

    const res = await requestJson(`/api/v1/contracts/${contractId}/pdf`, {
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(res.response.status).toBe(200);

    const buf = Buffer.from(await res.response.arrayBuffer());
    const text = extractPdfText(buf);
    expect(text).toContain("Firma");
    expect(text).toContain("Propietario Demo");
    expect(text).toContain("Arrendatario Demo");
  });

  it("draft contract PDF does NOT include Firma section", async () => {
    const res = await requestJson("/api/v1/contracts/contract_seed_01/pdf", {
      headers: { "x-dev-user-id": "user_owner_01" },
    });
    expect(res.response.status).toBe(200);

    const buf = Buffer.from(await res.response.arrayBuffer());
    const text = extractPdfText(buf);
    expect(text).not.toContain("Firma");
  });
});
