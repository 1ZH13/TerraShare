import { z } from "zod";

import { Land, AuditEvent } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canMutateLand } from "../permissions";

const updateLandInput = {
  landId: z.string().min(1).describe("ID del terreno a actualizar"),
  title: z.string().min(3).optional().describe("Nuevo título (mín. 3 caracteres)"),
  description: z.string().optional().describe("Nueva descripción"),
  area: z.number().positive().optional().describe("Nueva área (mayor a 0)"),
  allowedUses: z
    .array(z.enum(["agricultura", "ganaderia", "forestal", "acuicultura", "mixto", "otro"]))
    .min(1)
    .optional()
    .describe("Usos permitidos del terreno"),
  location: z
    .object({
      province: z.string().min(1).optional(),
      district: z.string().min(1).optional(),
      corregimiento: z.string().optional(),
      addressLine: z.string().optional(),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional()
    .describe("Ubicación del terreno"),
  availability: z
    .object({
      availableFrom: z.string().optional(),
      availableTo: z.string().optional(),
    })
    .optional()
    .describe("Disponibilidad temporal"),
  priceRule: z
    .object({
      currency: z.enum(["USD", "PAB"]),
      pricePerMonth: z.number().positive(),
    })
    .optional()
    .describe("Regla de precio mensual"),
  operation: z
    .enum(["alquiler", "venta", "ambas"])
    .optional()
    .describe("Tipo de operación"),
  salePrice: z.number().positive().optional().describe("Precio de venta"),
  water: z.string().optional().describe("Disponibilidad de agua"),
  access: z.string().optional().describe("Acceso al terreno"),
  features: z.array(z.string()).optional().describe("Características adicionales"),
};

export type UpdateLandInput = z.infer<z.ZodObject<typeof updateLandInput>>;

export async function updateLand(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(updateLandInput);
  const input = schema.parse(rawInput ?? {});

  const current = await Land.findOne({ id: input.landId }).lean();
  if (!current) throw new ToolError("Terreno no encontrado");

  if (!canMutateLand(actingUser as never, { ownerId: current.ownerId } as never)) {
    throw new ToolError("No autorizado para modificar este terreno");
  }

  const { landId, ...updates } = input;
  const merged = {
    ...current,
    ...updates,
    id: current.id,
    ownerId: current.ownerId,
    updatedAt: new Date(),
  };

  const doc = await Land.findOneAndUpdate({ id: landId }, { $set: merged }, { returnDocument: "after" });
  if (!doc) throw new ToolError("Error al actualizar el terreno");
  const { _id, __v, ...updated } = doc.toObject();

  await AuditEvent.create({
    id: `audit_${crypto.randomUUID()}`,
    actorId: actingUser.id,
    actorRole: actingUser.role as "user" | "admin",
    entity: "land",
    action: "updated",
    entityId: landId,
    metadata: { fields: Object.keys(updates) },
  });

  return updated;
}

export const updateLandTool: ToolDefinition<typeof updateLandInput> = {
  name: "update_land",
  title: "Actualizar terreno",
  description:
    "Actualiza los datos de un terreno existente. Solo el propietario o un administrador pueden modificarlo. Los campos id y ownerId no se alteran.",
  inputSchema: updateLandInput,
  requires: "user",
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return updateLand(args, actingUser);
  },
};
