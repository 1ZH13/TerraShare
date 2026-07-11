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

/** Operación de una solicitud/trato: alquiler o venta (#249/#140). */
export const DealOperationSchema = z.enum(["alquiler", "venta"] as const);

/**
 * Solicitud de alquiler o compra (#140). Modela ambas operaciones para coincidir
 * con el backend y con `CreateRentalRequestDto`:
 *  - `venta`  → requiere `offerAmount` (> 0); sin period/intendedUse.
 *  - `alquiler` (por defecto) → requiere `period` y `intendedUse`.
 */
export const CreateRentalRequestSchema = z
  .object({
    landId: z.string().min(1, "ID de terreno requerido"),
    operation: DealOperationSchema.optional(),
    period: RentalPeriodSchema.optional(),
    intendedUse: z.string().min(3, "Uso propuesto debe tener al menos 3 caracteres").optional(),
    offerAmount: z.number().positive("La oferta debe ser mayor a 0").optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const operation = data.operation ?? "alquiler";
    if (operation === "venta") {
      if (data.offerAmount === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["offerAmount"],
          message: "offerAmount es requerido para una operación de venta",
        });
      }
    } else {
      if (data.period === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["period"],
          message: "period es requerido para una operación de alquiler",
        });
      }
      if (data.intendedUse === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["intendedUse"],
          message: "intendedUse es requerido para una operación de alquiler",
        });
      }
    }
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