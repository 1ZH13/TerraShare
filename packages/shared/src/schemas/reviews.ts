import { z } from "zod";

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
  receiverId: z.string().min(1),
  contractId: z.string().min(1),
});

export type CreateReviewRequest = z.infer<typeof CreateReviewSchema>;
