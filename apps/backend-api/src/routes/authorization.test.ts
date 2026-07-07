import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";

describe("authorization 403 por recurso", () => {
  describe("Land", () => {
    it("no-owner PATCH /lands/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
        method: "PATCH",
        headers: { "x-dev-user-id": "user_tenant_01" },
        body: { title: "Cambio ajeno" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("no-owner DELETE /lands/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/lands/land_seed_01", {
        method: "DELETE",
        headers: { "x-dev-user-id": "user_tenant_01" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("no-owner PATCH /lands/:id/status retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/lands/land_seed_01/status", {
        method: "PATCH",
        headers: { "x-dev-user-id": "user_tenant_01" },
        body: { status: "inactive" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });

  describe("RentalRequest", () => {
    it("outsider GET /rental-requests/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests/rr_seed_01", {
        headers: { "x-dev-user-id": "user_owner_02" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("tenant PATCH /status approve retorna 403 (solo owner/admin)", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests/rr_seed_01/status", {
        method: "PATCH",
        headers: { "x-dev-user-id": "user_tenant_01" },
        body: { status: "approved" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("owner GET /rental-requests incluye requests de su land (fix ownership)", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(200);
      const items = payload.data as Array<{ id: string }>;
      expect(items.some((r) => r.id === "rr_seed_01")).toBe(true);
    });
  });

  describe("Contract", () => {
    it("no-owner POST /contracts retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/contracts", {
        method: "POST",
        headers: { "x-dev-user-id": "user_tenant_01" },
        body: {
          rentalRequestId: "rr_seed_01",
          terms: {
            summary: "Contrato ajeno",
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
          },
        },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("outsider GET /contracts/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/contracts/contract_seed_01", {
        headers: { "x-dev-user-id": "user_owner_02" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("no-owner POST /contracts/:id/complete retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/contracts/contract_seed_01/complete", {
        method: "POST",
        headers: { "x-dev-user-id": "user_tenant_01" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Payment", () => {
    it("outsider GET /payments/:id retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/payments/pay_seed_01", {
        headers: { "x-dev-user-id": "user_owner_02" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("owner de la land GET /payments/:id retorna 200 (fix ownership)", async () => {
      const { response } = await requestJson("/api/v1/payments/pay_seed_01", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(200);
    });

    it("owner de la land GET /payments incluye pago de su land (fix ownership)", async () => {
      const { response, payload } = await requestJson("/api/v1/payments", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(200);
      const items = payload.data as Array<{ id: string }>;
      expect(items.some((p) => p.id === "pay_seed_01")).toBe(true);
    });
  });

  describe("Chat", () => {
    it("outsider GET /chats/:id/messages retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/chats/chat_seed_01/messages", {
        headers: { "x-dev-user-id": "user_owner_02" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("outsider POST /chats/:id/messages retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/chats/chat_seed_01/messages", {
        method: "POST",
        headers: { "x-dev-user-id": "user_owner_02" },
        body: { text: "Mensaje ajeno" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Notification", () => {
    it("outsider GET /notifications/:id retorna 403 o 404", async () => {
      const store = (await import("../store/in-memory-db")).getStore();
      const notifications = Array.from(store.notifications.values());
      if (notifications.length === 0) return;

      const target = notifications[0];
      const nonOwner = target.userId === "user_owner_01" ? "user_owner_02" : "user_owner_01";
      const { response } = await requestJson(`/api/v1/notifications/${target.id}`, {
        headers: { "x-dev-user-id": nonOwner },
      });
      expect([403, 404]).toContain(response.status);
    });
  });

  describe("AuditEvent", () => {
    it("non-admin GET /audit-events retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/audit-events", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });

  describe("Admin routes", () => {
    it("non-admin GET /admin/users retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/admin/users", {
        headers: { "x-dev-user-id": "user_owner_01" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });

    it("non-admin PATCH /admin/users/:id/status retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/admin/users/user_owner_02/status", {
        method: "PATCH",
        headers: { "x-dev-user-id": "user_owner_01" },
        body: { status: "blocked" },
      });
      expect(response.status).toBe(403);
      expect(payload.error.code).toBe("FORBIDDEN");
    });
  });
});
