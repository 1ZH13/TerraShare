import { z } from "zod";

export const ContractStatusSchema = z.enum([
  "draft",
  "active",
  "completed",
  "cancelled",
] as const);

export const ContractTermsSchema = z.object({
  summary: z.string().min(10, "Resumen debe tener al menos 10 caracteres"),
  signedAt: z.string().optional(),
  startsAt: z.string().refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: "Fecha de inicio inválida" }
  ),
  endsAt: z.string().refine(
    (val) => !Number.isNaN(Date.parse(val)),
    { message: "Fecha de fin inválida" }
  ),
}).refine(
  (data) => new Date(data.startsAt) < new Date(data.endsAt),
  { message: "La fecha de fin debe ser posterior a la de inicio", path: ["endsAt"] }
);

export type ContractTermsInput = z.input<typeof ContractTermsSchema>;
export type ContractTermsOutput = z.output<typeof ContractTermsSchema>;

export const CreateContractSchema = z.object({
  rentalRequestId: z.string().min(1, "ID de solicitud requerido"),
  terms: ContractTermsSchema,
});

export type CreateContractInput = z.input<typeof CreateContractSchema>;
export type CreateContractOutput = z.output<typeof CreateContractSchema>;

export const UpdateContractStatusSchema = z.object({
  status: z.enum(["active", "completed", "cancelled"] as const),
  reason: z.string().optional(),
});

export type UpdateContractStatusInput = z.input<typeof UpdateContractStatusSchema>;
export type UpdateContractStatusOutput = z.output<typeof UpdateContractStatusSchema>;