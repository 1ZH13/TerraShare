import { Hono } from "hono";
import { CreateReviewSchema } from "@terrashare/shared";

import { failure, success } from "../lib/api-response";
import { validateBody } from "../lib/validate";
import { requireAuth } from "../middleware/require-auth";
import { Review, Contract } from "../db/schemas";
import type { AppEnv } from "../types";

export const reviewRoutes = new Hono<AppEnv>();

reviewRoutes.post("/reviews", requireAuth, async (c) => {
  const authUser = c.get("authUser");
  const parsed = await validateBody(c, CreateReviewSchema);
  if (!parsed.success) return parsed.response;
  
  const body = parsed.data;

  // Verify contract exists
  const contract = await Contract.findOne({ id: body.contractId }).lean();
  if (!contract) {
    return failure(c, 404, "NOT_FOUND", "Contract not found");
  }

  // Contract must be completed
  if (contract.status !== "completed") {
    return failure(c, 400, "VALIDATION_ERROR", "Contract must be completed to leave a review");
  }

  // AuthUser must be sender
  // Wait, the client sends receiverId and contractId. We just enforce sender is authUser.
  // Actually, authUser must be a participant in the contract, and receiver must be the other participant.
  if (authUser.id !== contract.ownerId && authUser.id !== contract.tenantId) {
    return failure(c, 403, "FORBIDDEN", "Not a participant of this contract");
  }

  const expectedReceiver = authUser.id === contract.ownerId ? contract.tenantId : contract.ownerId;
  if (body.receiverId !== expectedReceiver) {
    return failure(c, 400, "VALIDATION_ERROR", "Receiver is not the other participant in this contract");
  }

  // Check for duplicate review
  const existingReview = await Review.findOne({ contractId: body.contractId, senderId: authUser.id }).lean();
  if (existingReview) {
    return failure(c, 409, "CONFLICT", "Review already exists for this contract by this user");
  }

  const review = await Review.create({
    id: `review_${crypto.randomUUID()}`,
    contractId: body.contractId,
    senderId: authUser.id,
    receiverId: body.receiverId,
    rating: body.rating,
    comment: body.comment,
  });

  return success(c, review, 201);
});

reviewRoutes.get("/users/:userId/reviews", async (c) => {
  const userId = c.req.param("userId");
  const reviews = await Review.find({ receiverId: userId })
    .sort({ createdAt: -1 })
    .lean();
  return success(c, reviews);
});

reviewRoutes.get("/users/:userId/rating", async (c) => {
  const userId = c.req.param("userId");
  const reviews = await Review.find({ receiverId: userId })
    .select("rating")
    .lean();

  if (reviews.length === 0) {
    return success(c, { averageRating: 0, totalReviews: 0 });
  }

  const total = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / total) * 10) / 10;

  return success(c, { averageRating, totalReviews: total });
});
