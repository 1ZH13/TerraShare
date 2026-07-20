import { Hono } from "hono";
import { Review, Contract, RentalRequest } from "../db/schemas";
import { validateBody } from "../lib/validate";
import { success, failure } from "../lib/api-response";
import { requireAuth } from "../middleware/require-auth";
import { CreateReviewSchema } from "@terrashare/shared";
import type { AppEnv } from "../types";

export const reviewRoutes = new Hono<AppEnv>();

reviewRoutes.post("/reviews", requireAuth, async (c) => {
  const user = c.get("user");
  const parsed = await validateBody(c, CreateReviewSchema);
  if (!parsed.success) {
    return failure(c, 400, "BAD_REQUEST", "Validation error", parsed.errors);
  }
  const data = parsed.data;

  // Validar contrato
  const contract = await Contract.findOne({ id: data.contractId });
  if (!contract) {
    return failure(c, 404, "NOT_FOUND", "Contrato no encontrado");
  }

  if (contract.status !== "completed") {
    return failure(c, 400, "BAD_REQUEST", "El contrato debe estar completado para dejar una reseña");
  }

  // Validar que el llamador sea parte del contrato
  if (contract.ownerId !== user.id && contract.tenantId !== user.id) {
    return failure(c, 403, "FORBIDDEN", "No eres parte de este contrato");
  }

  // El targetUserId es la otra parte del contrato
  const targetUserId = contract.ownerId === user.id ? contract.tenantId : contract.ownerId;

  // Revisar si ya existe reseña
  const existingReview = await Review.findOne({ contractId: data.contractId, reviewerId: user.id });
  if (existingReview) {
    return failure(c, 400, "BAD_REQUEST", "Ya has dejado una reseña para este contrato");
  }

  // Obtener landId
  let landId: string | undefined = undefined;
  const rentalReq = await RentalRequest.findOne({ id: contract.rentalRequestId });
  if (rentalReq) {
    landId = rentalReq.landId;
  }

  const reviewId = crypto.randomUUID();
  const review = new Review({
    id: reviewId,
    contractId: data.contractId,
    reviewerId: user.id,
    targetUserId,
    landId,
    rating: data.rating,
    comment: data.comment,
  });

  await review.save();

  return success(c, {
    id: review.id,
    contractId: review.contractId,
    reviewerId: review.reviewerId,
    targetUserId: review.targetUserId,
    landId: review.landId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  }, 201);
});

reviewRoutes.get("/users/:userId/reviews", async (c) => {
  const { userId } = c.req.param();
  const reviews = await Review.find({ targetUserId: userId }).sort({ createdAt: -1 });

  return success(c, reviews.map(r => ({
    id: r.id,
    contractId: r.contractId,
    reviewerId: r.reviewerId,
    targetUserId: r.targetUserId,
    landId: r.landId,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  })));
});
