import { z } from "zod";

import { Land } from "@backend/db/schemas";
import type { ToolDefinition } from "./define-tool";

/**
 * Tool HU-63 (#180): Buscar terrenos. Espeja los filtros públicos de
 * `GET /lands` del backend (solo publicaciones activas), resueltos en la BD.
 */

// Shape de entrada (ZodRawShape) para el registro en el SDK MCP.
export const searchLandsInput = {
  q: z.string().optional().describe("Búsqueda por texto en título/descripción"),
  province: z.string().optional().describe("Filtrar por provincia"),
  district: z.string().optional().describe("Filtrar por distrito"),
  use: z
    .enum(["agricultura", "ganaderia", "forestal", "acuicultura", "mixto", "otro"])
    .optional()
    .describe("Uso permitido"),
  operation: z.enum(["alquiler", "venta", "ambas"]).optional().describe("Tipo de operación"),
  priceMin: z.number().nonnegative().optional().describe("Precio mensual mínimo"),
  priceMax: z.number().nonnegative().optional().describe("Precio mensual máximo"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sort: z.enum(["createdAt", "price", "area"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
};

const SearchLandsSchema = z.object(searchLandsInput);
export type SearchLandsInput = z.infer<typeof SearchLandsSchema>;

export interface SearchLandsResult {
  items: Record<string, unknown>[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Función pura de búsqueda (testeable de forma aislada). Construye la query en
 * Mongo, pagina y ordena — sin duplicar la capa HTTP.
 */
export async function searchLands(rawInput: unknown): Promise<SearchLandsResult> {
  const input = SearchLandsSchema.parse(rawInput ?? {});

  const query: Record<string, unknown> = { status: "active" };
  if (input.province) query["location.province"] = input.province;
  if (input.district) query["location.district"] = input.district;
  if (input.use) query.allowedUses = input.use;
  if (input.operation) query.operation = input.operation;
  if (input.priceMin !== undefined || input.priceMax !== undefined) {
    query["priceRule.pricePerMonth"] = {
      ...(input.priceMin !== undefined ? { $gte: input.priceMin } : {}),
      ...(input.priceMax !== undefined ? { $lte: input.priceMax } : {}),
    };
  }
  if (input.q) {
    const rx = new RegExp(escapeRegex(input.q), "i");
    query.$or = [{ title: rx }, { description: rx }];
  }

  const sortField = input.sort === "price" ? "priceRule.pricePerMonth" : input.sort === "area" ? "area" : "createdAt";
  const sortDir = input.order === "asc" ? 1 : -1;

  const totalItems = await Land.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalItems / input.pageSize));
  const docs = await Land.find(query)
    .sort({ [sortField]: sortDir })
    .skip((input.page - 1) * input.pageSize)
    .limit(input.pageSize)
    .lean();

  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return {
    items,
    pagination: { page: input.page, pageSize: input.pageSize, totalItems, totalPages },
  };
}

/**
 * Definición de la tool (referencia para las demás HU-64..HU-92). Es pública
 * (no requiere identidad): busca solo publicaciones activas.
 */
export const searchLandsTool: ToolDefinition<typeof searchLandsInput> = {
  name: "search_lands",
  title: "Buscar terrenos",
  description:
    "Busca terrenos publicados (activos) con filtros por texto, ubicación, uso, operación y precio. Devuelve resultados paginados.",
  inputSchema: searchLandsInput,
  requires: "public",
  handler: (args) => searchLands(args),
};
