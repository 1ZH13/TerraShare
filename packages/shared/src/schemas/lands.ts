import { z } from "zod";
import type { LandSortField, LandStatus, LandUse } from "../dto/lands";

export const LandUseSchema = z.enum([
  "agricultura",
  "ganaderia",
  "forestal",
  "acuicultura",
  "mixto",
  "otro",
] as const satisfies readonly LandUse[]);
export type LandUseInput = z.input<typeof LandUseSchema>;
export type LandUseOutput = z.output<typeof LandUseSchema>;

export const LandStatusSchema = z.enum(["draft", "active", "inactive"] as const);
export type LandStatusInput = z.input<typeof LandStatusSchema>;
export type LandStatusOutput = z.output<typeof LandStatusSchema>;

export const LandLocationSchema = z.object({
  province: z.string().min(1, "Provincia requerida"),
  district: z.string().min(1, "Distrito requerido"),
  corregimiento: z.string().optional(),
  addressLine: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export const LandAvailabilitySchema = z.object({
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
});

export const LandPriceRuleSchema = z.object({
  currency: z.enum(["USD", "PAB"]),
  pricePerMonth: z.number().positive("Precio debe ser mayor a 0"),
});

export const CreateLandSchema = z.object({
  title: z.string().min(3, "Título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  area: z.number().positive("Área debe ser mayor a 0"),
  allowedUses: z.array(LandUseSchema).min(1, "Al menos un uso requerido"),
  location: LandLocationSchema,
  availability: LandAvailabilitySchema.optional(),
  priceRule: LandPriceRuleSchema,
});

export type CreateLandInput = z.input<typeof CreateLandSchema>;
export type CreateLandOutput = z.output<typeof CreateLandSchema>;

export const UpdateLandSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional(),
  area: z.number().positive().optional(),
  allowedUses: z.array(LandUseSchema).min(1).optional(),
  location: z.object({
    province: z.string().min(1).optional(),
    district: z.string().min(1).optional(),
    corregimiento: z.string().optional(),
    addressLine: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  availability: LandAvailabilitySchema.optional(),
  priceRule: LandPriceRuleSchema.optional(),
});

export type UpdateLandInput = z.input<typeof UpdateLandSchema>;
export type UpdateLandOutput = z.output<typeof UpdateLandSchema>;

export const UpdateLandStatusSchema = z.object({
  status: LandStatusSchema,
});

export const LandFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "price", "area"] as const).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  use: LandUseSchema.optional(),
  priceMin: z.coerce.number().optional(),
  priceMax: z.coerce.number().optional(),
  province: z.string().optional(),
  district: z.string().optional(),
  availableFrom: z.string().optional(),
  availableTo: z.string().optional(),
});

export type LandFilterInput = z.input<typeof LandFilterSchema>;
export type LandFilterOutput = z.output<typeof LandFilterSchema>;
