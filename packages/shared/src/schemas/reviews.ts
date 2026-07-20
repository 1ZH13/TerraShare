import { z } from "zod";

export const CreateReviewSchema = z.object({
  contractId: z.string().min(1, "El contractId es requerido"),
  rating: z.number().int().min(1).max(5, "La calificación debe ser entre 1 y 5 estrellas"),
  comment: z.string().max(500, "El comentario no puede exceder 500 caracteres").optional(),
});

export type CreateReviewInput = z.input<typeof CreateReviewSchema>;
export type CreateReviewOutput = z.output<typeof CreateReviewSchema>;
