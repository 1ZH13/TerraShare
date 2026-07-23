import { z } from "zod";
import { canonicalTerritory, type PanamaTerritory } from "../data/panama";
import type { LandOperation, LandSortField, LandStatus, LandUse } from "../dto/lands";

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

/** Tipo de operación de una publicación: alquiler, venta o ambas (#138/#140). */
export const LandOperationSchema = z.enum([
  "alquiler",
  "venta",
  "ambas",
] as const satisfies readonly LandOperation[]);

/**
 * Provincia o comarca, comprobada contra la lista oficial y **normalizada**.
 *
 * Antes bastaba con que no estuviera vacía, así que en producción entraron
 * provincias como «f» y «fffff» — y como el desplegable del catálogo se
 * construye con las provincias que existen en los datos, esa basura acabó
 * publicada como opción de filtro para cualquier visitante (#391).
 *
 * Se transforma además de validar: quien escriba «chiriqui» sin tilde publica
 * igual, pero se guarda «Chiriquí», de modo que los datos quedan uniformes sin
 * castigar a quien teclea desde un móvil.
 */
const ProvinceSchema = z
  .string()
  .transform((value) => canonicalTerritory(value))
  .refine((value): value is PanamaTerritory => value !== undefined, {
    message: "Provincia no reconocida",
  });

export const LandLocationSchema = z.object({
  province: ProvinceSchema,
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

/**
 * Mínimo de caracteres del título.
 *
 * Se exporta para que el formulario de publicación avise en el propio campo en
 * vez de dejar que la regla salte al enviar: el asistente validaba solo «no
 * vacío», así que un título de una letra pasaba el paso 1 y el rechazo llegaba
 * cuatro pasos después, en el de fotos, pareciendo un fallo de las fotos (#390).
 */
export const LAND_TITLE_MIN_LENGTH = 3;

export const CreateLandSchema = z.object({
  title: z
    .string()
    .min(LAND_TITLE_MIN_LENGTH, `Título debe tener al menos ${LAND_TITLE_MIN_LENGTH} caracteres`),
  description: z.string().optional(),
  area: z.number().positive("Área debe ser mayor a 0"),
  allowedUses: z.array(LandUseSchema).min(1, "Al menos un uso requerido"),
  location: LandLocationSchema,
  availability: LandAvailabilitySchema.optional(),
  priceRule: LandPriceRuleSchema,
  // Operación y campos de detalle (#138/#140). Alineados con LandDto/CreateLandDto
  // y con el schema Mongoose del backend.
  operation: LandOperationSchema.optional(),
  salePrice: z.number().positive("Precio de venta debe ser mayor a 0").optional(),
  water: z.string().optional(),
  access: z.string().optional(),
  features: z.array(z.string()).optional(),
});

export type CreateLandInput = z.input<typeof CreateLandSchema>;
export type CreateLandOutput = z.output<typeof CreateLandSchema>;

export const UpdateLandSchema = z.object({
  title: z.string().min(LAND_TITLE_MIN_LENGTH).optional(),
  description: z.string().optional(),
  area: z.number().positive().optional(),
  allowedUses: z.array(LandUseSchema).min(1).optional(),
  location: z.object({
    // Misma comprobación al editar: si no, la basura entraría por la puerta de
    // atrás en cuanto exista una pantalla de edición (#391).
    province: ProvinceSchema.optional(),
    district: z.string().min(1).optional(),
    corregimiento: z.string().optional(),
    addressLine: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }).optional(),
  availability: LandAvailabilitySchema.optional(),
  priceRule: LandPriceRuleSchema.optional(),
  operation: LandOperationSchema.optional(),
  salePrice: z.number().positive().optional(),
  water: z.string().optional(),
  access: z.string().optional(),
  features: z.array(z.string()).optional(),
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
