import { z } from "zod";

import { Land } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-64 (#181): Obtener detalle de terreno. Devuelve la ficha completa
 * de un terreno por su ID, incluyendo ubicación, área, usos, precio y
 * disponibilidad.
 */

export const getLandInput = {
  landId: z.string().min(1).describe("ID del terreno a consultar"),
};

export type GetLandInput = z.infer<z.ZodObject<typeof getLandInput>>;

/**
 * Función pura de búsqueda (testeable de forma aislada). Busca un terreno
 * por ID y devuelve sus datos completos.
 */
export async function getLand(rawInput: unknown): Promise<Record<string, unknown>> {
  const input = z.object(getLandInput).parse(rawInput);

  // Excluye terrenos con borrado lógico (soft-delete, #328).
  const land = await Land.findOne({ id: input.landId, deletedAt: null }).lean();
  if (!land) throw new ToolError("Terreno no encontrado");

  const { _id, __v, ...rest } = land as unknown as Record<string, unknown>;
  return rest;
}

/**
 * Definición de la tool. Pública (no requiere identidad): cualquier
 * usuario puede consultar terrenos publicados.
 */
export const getLandTool: ToolDefinition<typeof getLandInput> = {
  name: "get_land",
  title: "Obtener terreno",
  description:
    "Obtiene la ficha completa de un terreno por su ID, incluyendo ubicación, área, usos permitidos, precio y disponibilidad.",
  inputSchema: getLandInput,
  requires: "public",
  handler: (args) => getLand(args),
};
