import { z } from "zod";

export const ReviewSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  authorId: z.string(),
  targetUserId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  createdAt: z.union([z.string(), z.date()]),
});

export type ReviewDto = z.infer<typeof ReviewSchema>;

export const CreateReviewSchema = z.object({
  contractId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;
