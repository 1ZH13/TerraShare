import { describe, expect, it } from "bun:test";
import { requestJson } from "../lib/http-test-utils";
import { Contract, Review } from "../db/schemas";
import mongoose from "mongoose";

describe("reviews routes", () => {
  it("creates a review for a completed contract", async () => {
    // Manually create a completed contract
    const contract = await Contract.create({
      id: `contract_${new mongoose.Types.ObjectId().toHexString()}`,
      rentalRequestId: "req_test",
      ownerId: "owner_user",
      tenantId: "tenant_user",
      status: "completed",
      terms: { summary: "Test", startsAt: "2023-01-01", endsAt: "2023-12-31" }
    });

    const { response, payload } = await requestJson("/api/v1/reviews", {
      method: "POST",
      headers: { "x-dev-user-id": "tenant_user" },
      body: {
        contractId: contract.id,
        rating: 5,
        comment: "Great owner!"
      }
    });

    expect(response.status).toBe(201);
    expect(payload.data.rating).toBe(5);
    expect(payload.data.targetUserId).toBe("owner_user");
  });

  it("fails to create a review if contract is not completed", async () => {
    const contract = await Contract.create({
      id: `contract_${new mongoose.Types.ObjectId().toHexString()}`,
      rentalRequestId: "req_test2",
      ownerId: "owner_user2",
      tenantId: "tenant_user2",
      status: "active",
      terms: { summary: "Test", startsAt: "2023-01-01", endsAt: "2023-12-31" }
    });

    const { response, payload } = await requestJson("/api/v1/reviews", {
      method: "POST",
      headers: { "x-dev-user-id": "tenant_user2" },
      body: {
        contractId: contract.id,
        rating: 4
      }
    });

    expect(response.status).toBe(422);
    expect(payload.error.code).toBe("BUSINESS_RULE_VIOLATION");
  });

  it("retrieves reviews for a specific user", async () => {
    await Review.create({
      id: `review_${new mongoose.Types.ObjectId().toHexString()}`,
      contractId: "contract_mock",
      authorId: "tenant_user3",
      targetUserId: "owner_user3",
      rating: 4,
      comment: "Nice land"
    });

    const { response, payload } = await requestJson("/api/v1/users/owner_user3/reviews");

    expect(response.status).toBe(200);
    expect(Array.isArray(payload.data)).toBe(true);
    expect(payload.data[0].rating).toBe(4);
    expect(payload.data[0].comment).toBe("Nice land");
  });
});
