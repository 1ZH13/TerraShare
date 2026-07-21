import { describe, expect, it } from "bun:test";

import { requestJson } from "../lib/http-test-utils";
import { resetStore } from "../lib/http-test-utils";

/** Helper: create a completed contract between owner and tenant. */
async function createCompletedContract(
  ownerId: string,
  tenantId: string,
): Promise<string> {
  const land = await requestJson("/api/v1/lands", {
    method: "POST",
    headers: { "x-dev-user-id": ownerId },
    body: {
      title: "Terreno para reseña",
      area: 25,
      allowedUses: ["agricultura"],
      location: { province: "Panama", district: "Panama" },
      priceRule: { currency: "USD", pricePerMonth: 400 },
    },
  });
  const landId = land.payload.data.id as string;
  await requestJson(`/api/v1/lands/${landId}/status`, {
    method: "PATCH",
    headers: { "x-dev-user-id": ownerId },
    body: { status: "active" },
  });

  const rr = await requestJson("/api/v1/rental-requests", {
    method: "POST",
    headers: { "x-dev-user-id": tenantId },
    body: {
      landId,
      operation: "alquiler",
      period: { startDate: "2026-08-01", endDate: "2026-12-31" },
      intendedUse: "agricultura",
      notes: "Test review",
    },
  });
  const rrId = rr.payload.data.id as string;

  await requestJson(`/api/v1/rental-requests/${rrId}/status`, {
    method: "PATCH",
    headers: { "x-dev-user-id": ownerId },
    body: { status: "approved" },
  });

  const contract = await requestJson("/api/v1/contracts", {
    method: "POST",
    headers: { "x-dev-user-id": ownerId },
    body: {
      rentalRequestId: rrId,
      terms: {
        summary: "Contrato de prueba",
        startsAt: "2026-08-01",
        endsAt: "2026-12-31",
      },
    },
  });
  const contractId = contract.payload.data.id as string;

  await requestJson(`/api/v1/contracts/${contractId}/sign`, {
    method: "POST",
    headers: { "x-dev-user-id": ownerId },
  });
  await requestJson(`/api/v1/contracts/${contractId}/sign`, {
    method: "POST",
    headers: { "x-dev-user-id": tenantId },
  });

  await requestJson(`/api/v1/contracts/${contractId}/status`, {
    method: "PATCH",
    headers: { "x-dev-user-id": ownerId },
    body: { status: "completed" },
  });

  return contractId;
}

describe("reviews routes (#97)", () => {
  describe("POST /reviews", () => {
    it("allows a participant to leave a review on a completed contract", async () => {
      resetStore();
      const contractId = await createCompletedContract("review_owner_01", "review_tenant_01");

      const res = await requestJson("/api/v1/reviews", {
        method: "POST",
        headers: { "x-dev-user-id": "review_owner_01" },
        body: {
          contractId,
          receiverId: "review_tenant_01",
          rating: 5,
          comment: "Excelente inquilino",
        },
      });
      expect(res.response.status).toBe(201);
      expect(res.payload.data.rating).toBe(5);
      expect(res.payload.data.senderId).toBe("review_owner_01");
      expect(res.payload.data.receiverId).toBe("review_tenant_01");
    });

    it("rejects duplicate review from same user for same contract", async () => {
      resetStore();
      const contractId = await createCompletedContract("review_owner_02", "review_tenant_02");

      await requestJson("/api/v1/reviews", {
        method: "POST",
        headers: { "x-dev-user-id": "review_owner_02" },
        body: { contractId, receiverId: "review_tenant_02", rating: 4 },
      });

      const dup = await requestJson("/api/v1/reviews", {
        method: "POST",
        headers: { "x-dev-user-id": "review_owner_02" },
        body: { contractId, receiverId: "review_tenant_02", rating: 3 },
      });
      expect(dup.response.status).toBe(409);
    });

    it("rejects review if contract is not completed", async () => {
      resetStore();
      const land = await requestJson("/api/v1/lands", {
        method: "POST",
        headers: { "x-dev-user-id": "review_owner_03" },
        body: {
          title: "Terreno activo",
          area: 10,
          allowedUses: ["ganaderia"],
          location: { province: "Colon", district: "Colon" },
          priceRule: { currency: "USD", pricePerMonth: 200 },
        },
      });
      const landId = land.payload.data.id as string;
      await requestJson(`/api/v1/lands/${landId}/status`, {
        method: "PATCH",
        headers: { "x-dev-user-id": "review_owner_03" },
        body: { status: "active" },
      });

      const rr = await requestJson("/api/v1/rental-requests", {
        method: "POST",
        headers: { "x-dev-user-id": "review_tenant_03" },
        body: {
          landId,
          operation: "alquiler",
          period: { startDate: "2026-08-01", endDate: "2026-12-31" },
          intendedUse: "ganaderia",
        },
      });
      const rrId = rr.payload.data.id as string;
      await requestJson(`/api/v1/rental-requests/${rrId}/status`, {
        method: "PATCH",
        headers: { "x-dev-user-id": "review_owner_03" },
        body: { status: "approved" },
      });

      const ct = await requestJson("/api/v1/contracts", {
        method: "POST",
        headers: { "x-dev-user-id": "review_owner_03" },
        body: {
          rentalRequestId: rrId,
          terms: { summary: "Contrato activo", startsAt: "2026-08-01", endsAt: "2026-12-31" },
        },
      });
      const contractId = ct.payload.data.id as string;

      const res = await requestJson("/api/v1/reviews", {
        method: "POST",
        headers: { "x-dev-user-id": "review_owner_03" },
        body: { contractId, receiverId: "review_tenant_03", rating: 4 },
      });
      expect(res.response.status).toBe(400);
    });

    it("rejects review from non-participant", async () => {
      resetStore();
      const contractId = await createCompletedContract("review_owner_04", "review_tenant_04");

      const res = await requestJson("/api/v1/reviews", {
        method: "POST",
        headers: { "x-dev-user-id": "review_stranger" },
        body: { contractId, receiverId: "review_owner_04", rating: 3 },
      });
      expect(res.response.status).toBe(403);
    });
  });

  describe("GET /users/:userId/reviews", () => {
    it("returns reviews for a user", async () => {
      resetStore();
      const contractId = await createCompletedContract("review_list_owner", "review_list_tenant");

      await requestJson("/api/v1/reviews", {
        method: "POST",
        headers: { "x-dev-user-id": "review_list_owner" },
        body: { contractId, receiverId: "review_list_tenant", rating: 4, comment: "Muy bien" },
      });

      const res = await requestJson("/api/v1/users/review_list_tenant/reviews");
      expect(res.response.status).toBe(200);
      expect(Array.isArray(res.payload.data)).toBe(true);
      expect(res.payload.data.length).toBe(1);
      expect(res.payload.data[0].rating).toBe(4);
    });

    it("returns empty array for user with no reviews", async () => {
      resetStore();
      const res = await requestJson("/api/v1/users/user_no_reviews/reviews");
      expect(res.response.status).toBe(200);
      expect(res.payload.data).toEqual([]);
    });
  });

  describe("GET /users/:userId/rating", () => {
    it("returns average rating and total reviews", async () => {
      resetStore();
      const contractId = await createCompletedContract("review_avg_owner", "review_avg_tenant");

      await requestJson("/api/v1/reviews", {
        method: "POST",
        headers: { "x-dev-user-id": "review_avg_owner" },
        body: { contractId, receiverId: "review_avg_tenant", rating: 4 },
      });

      const res = await requestJson("/api/v1/users/review_avg_tenant/rating");
      expect(res.response.status).toBe(200);
      expect(res.payload.data.averageRating).toBe(4);
      expect(res.payload.data.totalReviews).toBe(1);
    });

    it("returns 0 average for user with no reviews", async () => {
      resetStore();
      const res = await requestJson("/api/v1/users/user_no_rating/rating");
      expect(res.response.status).toBe(200);
      expect(res.payload.data.averageRating).toBe(0);
      expect(res.payload.data.totalReviews).toBe(0);
    });
  });
});
