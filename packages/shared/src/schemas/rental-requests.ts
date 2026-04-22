import { z } from "zod";

export const RentalRequestStatusSchema = z.enum([
  "draft",
  "pending_owner",
  "approved",
  "rejected",
  "cancelled",
  "pending_payment",
  "paid",
] as const);

export const RentalPeriodSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine(
    (data) => !Number.isNaN(Date.parse(data.startDate)),
    { message: "Fecha de inicio inválida", path: ["startDate"] }
  )
  .refine(
    (data) => !Number.isNaN(Date.parse(data.endDate)),
    { message: "Fecha de fin inválida", path: ["endDate"] }
  )
  .refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    { message: "La fecha de fin debe ser posterior a la de inicio", path: ["endDate"] }
  );

export type RentalPeriodInput = z.input<typeof RentalPeriodSchema>;
export type RentalPeriodOutput = z.output<typeof RentalPeriodSchema>;

export const CreateRentalRequestSchema = z.object({
  landId: z.string().min(1, "ID de terreno requerido"),
  period: RentalPeriodSchema,
  intendedUse: z.string().min(3, "Uso propuesto debe tener al menos 3 caracteres"),
  notes: z.string().optional(),
});

export type CreateRentalRequestInput = z.input<typeof CreateRentalRequestSchema>;
export type CreateRentalRequestOutput = z.output<typeof CreateRentalRequestSchema>;

export const UpdateRentalRequestStatusSchema = z.object({
  status: z.enum([
    "pending_owner",
    "approved",
    "rejected",
    "cancelled",
    "pending_payment",
    "paid",
  ] as const),
  reason: z.string().optional(),
});

export type UpdateRentalRequestStatusInput = z.input<typeof UpdateRentalRequestStatusSchema>;
export type UpdateRentalRequestStatusOutput = z.output<typeof UpdateRentalRequestStatusSchema>;