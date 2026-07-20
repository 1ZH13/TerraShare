import { z } from "zod";

export const visitStatusSchema = z.enum(["pending", "accepted", "rejected", "completed", "cancelled"]);
export type VisitStatus = z.infer<typeof visitStatusSchema>;

export const createVisitSchema = z.object({
  date: z.string().datetime({ message: "Invalid date format, expected ISO" }),
  notes: z.string().max(1000).optional(),
});

export const updateVisitStatusSchema = z.object({
  status: visitStatusSchema,
});

export type CreateVisitPayload = z.infer<typeof createVisitSchema>;
export type UpdateVisitStatusPayload = z.infer<typeof updateVisitStatusSchema>;

export interface VisitDto {
  id: string;
  landId: string;
  visitorId: string;
  ownerId: string;
  date: string;
  status: VisitStatus;
  notes?: string;
  createdAt: string;
}
