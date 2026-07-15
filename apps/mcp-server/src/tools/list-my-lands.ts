import { z } from "zod";

import { Land } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-68 (#185): Listar mis terrenos. Devuelve todos los terrenos
 * pertenecientes al dueño autenticado, incluyendo estado y métricas básicas.
 */

export const listMyLandsInput = {};

export type ListMyLandsInput = z.infer<z.ZodObject<typeof listMyLandsInput>>;

export interface ListMyLandsResult {
  items: Record<string, unknown>[];
  total: number;
}

/**
 * Función pura de búsqueda (testeable de forma aislada). Busca todos los
 * terrenos donde ownerId coincide con el usuario autenticado.
 */
export async function listMyLands(rawInput: { actingUserId: string | null }): Promise<ListMyLandsResult> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  const query = { ownerId: rawInput.actingUserId };
  const docs = await Land.find(query).sort({ createdAt: -1 }).lean();

  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return { items, total: items.length };
}

/**
 * Definición de la tool. Requiere usuario autenticado (scope owner).
 */
export const listMyLandsTool: ToolDefinition<typeof listMyLandsInput> = {
  name: "list_my_lands",
  title: "Listar mis terrenos",
  description:
    "Devuelve todos los terrenos pertenecientes al dueño autenticado, incluyendo estado, área, precio y ubicación.",
  inputSchema: listMyLandsInput,
  requires: "user",
  handler: (_args, ctx) => listMyLands({ actingUserId: ctx.actingUser?.id ?? null }),
};
