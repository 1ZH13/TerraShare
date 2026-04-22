import { describe, expect, it, beforeEach } from "bun:test";

import { requestJson, resetStore } from "../lib/http-test-utils";

describe("Smoke E2E auth y flujo protegido", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("auth basico", () => {
    it("registro/login: /auth/me retorna usuario autenticado", async () => {
      const { response, payload } = await requestJson("/api/v1/auth/me", {
        method: "GET",
        headers: {
          "x-dev-user-id": "user_test_01",
          "x-dev-role": "user",
        },
      });

      expect(response.status).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.id).toBe("user_test_01");
      expect(payload.data.role).toBe("user");
    });

    it("registro/login: /auth/me retorna datos completos del usuario", async () => {
      const { response, payload } = await requestJson("/api/v1/auth/me", {
        method: "GET",
        headers: {
          "x-dev-user-id": "user_complete_01",
          "x-dev-role": "user",
        },
      });

      expect(response.status).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data).toMatchObject({
        id: "user_complete_01",
        clerkUserId: "user_complete_01",
        role: "user",
        status: "active",
      });
    });

    it("registro/login: /auth/me admin tiene acceso a ruta de admin", async () => {
      const { response, payload } = await requestJson("/api/v1/auth/admin/ping", {
        method: "GET",
        headers: {
          "x-dev-user-id": "admin_user_01",
          "x-dev-role": "admin",
        },
      });

      expect(response.status).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.data.allowed).toBe(true);
      expect(payload.data.role).toBe("admin");
    });
  });

  describe("flujo protegido: requiere login", () => {
    it("crear land requiere autenticacion", async () => {
      const { response, payload } = await requestJson("/api/v1/lands", {
        method: "POST",
        body: {
          title: "Test Land",
          description: "Description",
          location: { province: "Panama", district: "Panama" },
          priceRule: { currency: "USD", pricePerMonth: 1000 },
          area: 1000,
          allowedUses: ["agriculture"],
        },
      });

      expect(response.status).toBe(401);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("crear rental request requiere autenticacion", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests", {
        method: "POST",
        body: {
          landId: "land_seed_01",
          intendedUse: "agricultura",
        },
      });

      expect(response.status).toBe(401);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("crear contrato requiere autenticacion", async () => {
      const { response, payload } = await requestJson("/api/v1/contracts", {
        method: "POST",
        body: {
          rentalRequestId: "rr_seed_01",
          terms: {
            summary: "Contrato de arrendamiento",
            startsAt: new Date().toISOString(),
            endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
          },
        },
      });

      expect(response.status).toBe(401);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("crear pago requiere autenticacion", async () => {
      const { response, payload } = await requestJson("/api/v1/payments/checkout-session", {
        method: "POST",
        body: {
          rentalRequestId: "rr_seed_01",
        },
      });

      expect(response.status).toBe(401);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("crear chat requiere autenticacion", async () => {
      const { response, payload } = await requestJson("/api/v1/chats", {
        method: "POST",
        body: {
          landId: "land_seed_01",
        },
      });

      expect(response.status).toBe(401);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });

    it("listar rental requests sin login retorna 401", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests");

      expect(response.status).toBe(401);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("flujo protegido: error esperado para invitado", () => {
    it("acceso sin token retorna error 401 con mensaje claro", async () => {
      process.env.ALLOW_DEV_AUTH_BYPASS = "false";
      const app = (await import("../app")).createApp();

      const response = await app.request("/api/v1/auth/me");
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("UNAUTHORIZED");
      expect(payload.error.message).toBe("Missing or invalid bearer token");

      process.env.ALLOW_DEV_AUTH_BYPASS = "true";
    });

    it("token invalido retorna error 401", async () => {
      process.env.ALLOW_DEV_AUTH_BYPASS = "false";
      const app = (await import("../app")).createApp();

      const response = await app.request("/api/v1/auth/me", {
        method: "GET",
        headers: {
          authorization: "Bearer invalid_token",
        },
      });
      const payload = await response.json();

      expect(response.status).toBe(401);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("UNAUTHORIZED");

      process.env.ALLOW_DEV_AUTH_BYPASS = "true";
    });

    it("ruta de admin sin rol admin retorna 403", async () => {
      const { response, payload } = await requestJson("/api/v1/auth/admin/ping", {
        method: "GET",
        headers: {
          "x-dev-user-id": "user_regular_01",
          "x-dev-role": "user",
        },
      });

      expect(response.status).toBe(403);
      expect(payload.ok).toBe(false);
      expect(payload.error.code).toBe("FORBIDDEN");
      expect(payload.error.message).toBe("Admin role required");
    });

    it("usuario bloqueado no puede acceder", async () => {
      const { response, payload } = await requestJson("/api/v1/auth/me", {
        method: "GET",
        headers: {
          "x-dev-user-id": "blocked_user",
          "x-dev-role": "user",
        },
      });

      expect(response.status).toBe(200);

      const blockResponse = await requestJson("/api/v1/admin/users/blocked_user/status", {
        method: "PATCH",
        headers: {
          "x-dev-user-id": "admin_01",
          "x-dev-role": "admin",
        },
        body: {
          status: "blocked",
        },
      });

      expect(blockResponse.response.status).toBe(200);

      const { response: finalResponse, payload: finalPayload } = await requestJson("/api/v1/auth/me", {
        method: "GET",
        headers: {
          "x-dev-user-id": "blocked_user",
          "x-dev-role": "user",
        },
      });

      expect(finalResponse.status).toBe(403);
      expect(finalPayload.ok).toBe(false);
      expect(finalPayload.error.code).toBe("FORBIDDEN");
      expect(finalPayload.error.message).toBe("User is blocked");
    });
  });

  describe("acciones transaccionales con login", () => {
    it("crear land con autenticacion exitosa", async () => {
      const { response, payload } = await requestJson("/api/v1/lands", {
        method: "POST",
        headers: {
          "x-dev-user-id": "owner_01",
          "x-dev-role": "user",
        },
        body: {
          title: "Finca Test",
          description: "Description",
          location: { province: "Panama", district: "Panama" },
          priceRule: { currency: "USD", pricePerMonth: 500 },
          area: 5000,
          allowedUses: ["agricultura"],
        },
      });

      expect(response.status).toBe(201);
      expect(payload.ok).toBe(true);
      expect(payload.data.title).toBe("Finca Test");
    });

    it("crear rental request con autenticacion exitosa", async () => {
      const { response, payload } = await requestJson("/api/v1/rental-requests", {
        method: "POST",
        headers: {
          "x-dev-user-id": "tenant_01",
          "x-dev-role": "user",
        },
        body: {
          landId: "land_seed_01",
          period: {
            startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 300).toISOString(),
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
          },
          intendedUse: "agricultura",
        },
      });

      expect(response.status).toBe(201);
      expect(payload.ok).toBe(true);
      expect(payload.data.landId).toBe("land_seed_01");
      expect(payload.data.tenantId).toBe("tenant_01");
    });
  });
});