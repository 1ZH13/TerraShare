import { z, type ZodRawShape } from "zod";
import { CreateRentalRequestSchema } from "@terrashare/shared";

import { Land, RentalRequest } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import type { ActingUser } from "../context";
import { canCreateRentalRequest } from "../permissions";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-70 (#187): Crear una solicitud de alquiler (o de compra). Espeja
 * `POST /rental-requests` del backend: valida forma con el MISMO
 * `CreateRentalRequestSchema` compartido, aplica las reglas de negocio con la BD
 * (dueño no puede solicitar su propio terreno, operación/uso permitidos,
 * solapamiento) y crea la solicitud en `pending_owner` a nombre del arrendatario.
 */

// El schema compartido es un `ZodEffects` (usa `superRefine`), así que no expone
// `.shape`. Declaramos aquí el shape que anuncia el SDK MCP (con `.describe()`);
// la validación REAL —incluidas las reglas condicionales venta/alquiler— la hace
// `CreateRentalRequestSchema.parse` dentro de la función pura (fuente de verdad).
// Tipado como `ZodRawShape` (el supertipo común): así `TOOLS` en server.ts
// colapsa a `ToolDefinition<ZodRawShape>` y `registerTool` infiere el genérico
// sin ambigüedad frente a otras tools con shapes concretos distintos.
export const createRentalRequestInput: ZodRawShape = {
  landId: z.string().min(1).describe("ID del terreno a solicitar"),
  operation: z
    .enum(["alquiler", "venta"])
    .optional()
    .describe("Tipo de operación (por defecto: alquiler)"),
  period: z
    .object({
      startDate: z.string().describe("Fecha de inicio (ISO)"),
      endDate: z.string().describe("Fecha de fin (ISO)"),
    })
    .optional()
    .describe("Período del alquiler (requerido para operación 'alquiler')"),
  intendedUse: z
    .string()
    .optional()
    .describe("Uso propuesto del terreno (requerido para 'alquiler'; debe estar permitido)"),
  offerAmount: z
    .number()
    .positive()
    .optional()
    .describe("Monto ofertado (requerido para operación 'venta')"),
  notes: z.string().optional().describe("Notas opcionales para el dueño"),
};

/** Solicitud creada (sin campos internos de Mongo). */
export interface CreatedRentalRequest {
  id: string;
  landId: string;
  tenantId: string;
  operation: "alquiler" | "venta";
  period?: { startDate: string; endDate: string };
  intendedUse?: string;
  offerAmount?: number;
  notes?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lógica pura (testeable): valida, aplica reglas de negocio y persiste. `tenantId`
 * es el usuario que actúa (garantizado por `requires: "user"`).
 */
export async function createRentalRequest(
  rawInput: unknown,
  tenantId: string,
): Promise<CreatedRentalRequest> {
  const data = CreateRentalRequestSchema.parse(rawInput ?? {});
  const operation = data.operation ?? "alquiler";

  const land = await Land.findOne({ id: data.landId }).lean();
  if (!land) throw new ToolError("Terreno no encontrado");

  // Misma regla que la API REST: el dueño no puede solicitar su propio terreno.
  if (!canCreateRentalRequest({ id: tenantId } as unknown as ActingUser, land)) {
    throw new ToolError("El dueño no puede crear una solicitud sobre su propio terreno");
  }

  // La operación solicitada debe estar admitida por el terreno ("ambas" acepta las dos).
  const landOperation = (land.operation ?? "alquiler") as string;
  if (landOperation !== "ambas" && landOperation !== operation) {
    throw new ToolError(`Este terreno no admite la operación '${operation}'`);
  }

  const initialStatus = "pending_owner";

  if (operation === "venta") {
    // El schema garantiza offerAmount presente y > 0 para venta.
    const record = await RentalRequest.create({
      id: `rr_${crypto.randomUUID()}`,
      landId: data.landId,
      tenantId,
      operation: "venta",
      offerAmount: data.offerAmount,
      notes: data.notes,
      status: initialStatus,
    });

    await createAuditEvent({
      actor: { id: tenantId, role: "user" },
      entity: "rental_request",
      action: "created",
      entityId: record.id,
      metadata: { landId: data.landId, operation: "venta", offerAmount: data.offerAmount },
    });

    return clean(record);
  }

  // ── Alquiler ── (schema garantiza period válido con endDate > startDate e intendedUse)
  const allowedUses = (land.allowedUses ?? []) as string[];
  if (allowedUses.length > 0 && data.intendedUse && !allowedUses.includes(data.intendedUse)) {
    throw new ToolError(`El uso '${data.intendedUse}' no está permitido en este terreno`);
  }

  const periodStart = Date.parse(data.period!.startDate);
  const periodEnd = Date.parse(data.period!.endDate);

  // Bloquea si ya existe una solicitud aprobada/pendiente/pagada que solape.
  const overlapping = await RentalRequest.findOne({
    landId: data.landId,
    operation: { $ne: "venta" },
    status: { $in: ["approved", "pending_payment", "paid"] },
  }).lean();

  if (overlapping?.period) {
    const existingStart = Date.parse(overlapping.period.startDate);
    const existingEnd = Date.parse(overlapping.period.endDate);
    if (periodStart < existingEnd && periodEnd > existingStart) {
      throw new ToolError("El terreno ya tiene una solicitud aprobada/pendiente que solapa el período");
    }
  }

  const record = await RentalRequest.create({
    id: `rr_${crypto.randomUUID()}`,
    landId: data.landId,
    tenantId,
    operation: "alquiler",
    period: { startDate: data.period!.startDate, endDate: data.period!.endDate },
    intendedUse: data.intendedUse,
    notes: data.notes,
    status: initialStatus,
  });

  await createAuditEvent({
    actor: { id: tenantId, role: "user" },
    entity: "rental_request",
    action: "created",
    entityId: record.id,
    metadata: { landId: data.landId, period: record.period },
  });

  return clean(record);
}

/** Convierte el doc Mongoose a objeto plano sin `_id`/`__v`. */
function clean(doc: { toObject: () => Record<string, unknown> }): CreatedRentalRequest {
  const { _id, __v, ...rest } = doc.toObject();
  return rest as unknown as CreatedRentalRequest;
}

/**
 * Definición de la tool. `requires: "user"` → necesita identidad configurada
 * (MCP_ACTING_USER_ID); la solicitud queda a nombre de ese usuario (arrendatario).
 */
export const createRentalRequestTool: ToolDefinition<typeof createRentalRequestInput> = {
  name: "create_rental_request",
  title: "Crear solicitud de alquiler",
  description:
    "Crea una solicitud de alquiler (o de compra) sobre un terreno, a nombre del arrendatario autenticado. Valida período y uso, bloquea si el solicitante es el dueño, y devuelve la solicitud creada con estado inicial 'pending_owner'.",
  inputSchema: createRentalRequestInput,
  requires: "user",
  handler: (args, ctx) => createRentalRequest(args, (ctx.actingUser as ActingUser).id),
};
