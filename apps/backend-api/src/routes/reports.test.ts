import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

const asUser = { "x-dev-user-id": "user_reporter_01" };
const asAdmin = { "x-dev-user-id": "admin_reports", "x-dev-role": "admin" };

async function createReport(overrides: Record<string, unknown> = {}) {
  return requestJson("/api/v1/reports", {
    method: "POST",
    headers: asUser,
    body: { targetType: "land", targetId: "land_001", reason: "spam", ...overrides },
  });
}

describe("reports routes", () => {
  it("lets an authenticated user create a report", async () => {
    const { response, payload } = await createReport({ description: "Anuncio sospechoso" });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.id).toBeDefined();
    expect(payload.data.status).toBe("open");
  });

  it("rejects a report with an invalid targetType", async () => {
    const { response, payload } = await createReport({ targetType: "planet" });

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
  });

  it("rejects a report with an invalid reason", async () => {
    const { response, payload } = await createReport({ reason: "no-me-gusta" });

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
  });

  it("requires authentication to create a report", async () => {
    const { response } = await requestJson("/api/v1/reports", {
      method: "POST",
      body: { targetType: "land", targetId: "land_001", reason: "spam" },
    });

    expect(response.status).toBe(401);
  });

  it("lists reports for an admin", async () => {
    await createReport();
    const { response, payload } = await requestJson("/api/v1/admin/reports", { headers: asAdmin });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(Array.isArray(payload.data.items)).toBe(true);
    expect(payload.data.items.length).toBeGreaterThan(0);
  });

  it("forbids listing reports for a non-admin user", async () => {
    const { response, payload } = await requestJson("/api/v1/admin/reports", { headers: asUser });

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });

  it("returns a report detail for an admin", async () => {
    const { payload: created } = await createReport();
    const { response, payload } = await requestJson(`/api/v1/admin/reports/${created.data.id}`, {
      headers: asAdmin,
    });

    expect(response.status).toBe(200);
    expect(payload.data.id).toBe(created.data.id);
    expect(payload.data.targetLabel).toBeDefined();
  });

  it("returns 404 for a missing report", async () => {
    const { response } = await requestJson("/api/v1/admin/reports/report_missing", { headers: asAdmin });
    expect(response.status).toBe(404);
  });

  it("lets an admin transition a report to resolved", async () => {
    const { payload: created } = await createReport();
    const { response, payload } = await requestJson(`/api/v1/admin/reports/${created.data.id}`, {
      method: "PATCH",
      headers: asAdmin,
      body: { status: "resolved", resolutionNote: "Sin fundamento" },
    });

    expect(response.status).toBe(200);
    expect(payload.data.status).toBe("resolved");
    expect(payload.data.resolvedBy).toBeDefined();
  });

  it("rejects an invalid status transition", async () => {
    const { payload: created } = await createReport();
    const { response } = await requestJson(`/api/v1/admin/reports/${created.data.id}`, {
      method: "PATCH",
      headers: asAdmin,
      body: { status: "banana" },
    });

    expect(response.status).toBe(400);
  });
});
