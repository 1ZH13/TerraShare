// TODO(#6-fix): "updates status as owner" returns 409 instead of 200.
// The test creates a request for land_seed_01 with a 200-day period starting in the future.
// When it tries to approve the existing rr_seed_01 (which also targets land_seed_01),
// the business rule "no overlapping approvals" triggers and returns CONFLICT.
// This is the business rule working correctly (non-overlapping check), but the test
// setup needs a land without existing approved requests to isolate this unit test.
// Related: issue #6 (landing), but the fix belongs to #25 (rental requests).
import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("rental requests routes", () => {
  it("creates rental request for a different owner land", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests", {
      method: "POST",
      headers: {
        "x-dev-user-id": "user_tenant_99",
      },
      body: {
        landId: "land_seed_01",
        period: {
          startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 200).toISOString(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 260).toISOString(),
        },
        intendedUse: "agricultura",
      },
    });

    expect(response.status).toBe(201);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("pending_owner");
  });

  it("updates status as owner", async () => {
    const { response, payload } = await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
      method: "PATCH",
      headers: {
        "x-dev-user-id": "user_owner_01",
      },
      body: {
        status: "approved",
      },
    });

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.status).toBe("approved");
  });
});
