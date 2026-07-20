import { Hono } from "hono";
import { z } from "zod";
import { requireAuth } from "../middleware/require-auth";
import { success, failure } from "../lib/api-response";
import { Review, Contract } from "../db/schemas";
import { randomUUID } from "crypto";
import type { AppEnv } from "../types";

const app = new Hono<AppEnv>();

const createReviewSchema = z.object({
  contractId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

app.post("/reviews", requireAuth, async (c) => {
  const user = c.get("authUser");
  const rawBody = await c.req.json().catch(() => ({}));
  const parsed = createReviewSchema.safeParse(rawBody);
  
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return failure(c, 400, "VALIDATION_ERROR", "Invalid input", details);
  }
  
  const { contractId, rating, comment } = parsed.data;

  // Verify contract exists and is completed
  const contract = await Contract.findOne({ id: contractId });
  if (!contract) {
    return failure(c, 404, "NOT_FOUND", "Contract not found");
  }

  if (contract.status !== "completed") {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Can only review completed contracts");
  }

  // Verify user is part of the contract
  if (contract.ownerId !== user.id && contract.tenantId !== user.id) {
    return failure(c, 403, "FORBIDDEN", "You are not part of this contract");
  }

  // Determine target user
  const targetUserId = contract.ownerId === user.id ? contract.tenantId : contract.ownerId;

  // Verify no duplicate review from this author for this contract
  const existingReview = await Review.findOne({ contractId, authorId: user.id });
  if (existingReview) {
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "You have already reviewed this contract");
  }

  const reviewId = randomUUID();
  const review = new Review({
    id: reviewId,
    contractId,
    authorId: user.id,
    targetUserId,
    rating,
    comment,
  });

  await review.save();

  return success(c, {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    authorId: review.authorId,
    targetUserId: review.targetUserId,
    createdAt: review.createdAt,
  }, 201);
});

app.get("/users/:userId/reviews", async (c) => {
  const { userId } = c.req.param();
  const reviews = await Review.find({ targetUserId: userId }).sort({ createdAt: -1 });

  return success(c, reviews.map(r => ({
    id: r.id,
    contractId: r.contractId,
    authorId: r.authorId,
    targetUserId: r.targetUserId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
  })));
});

export { app as reviewRoutes };
