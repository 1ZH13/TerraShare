import { z } from "zod";

export const CreateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
  receiverId: z.string().min(1),
  contractId: z.string().min(1),
});

export type CreateReviewRequest = z.infer<typeof CreateReviewSchema>;
