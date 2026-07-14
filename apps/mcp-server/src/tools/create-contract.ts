import { z, type ZodRawShape } from "zod";
import { CreateContractSchema } from "@terrashare/shared";

import { Contract, Land, RentalRequest } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import type { ActingUser } from "../context";
import { canCreateContract } from "../permissions";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-73 (#190): Generar un contrato. Espeja `POST /contracts` del backend:
 * valida forma con el MISMO `CreateContractSchema` compartido, resuelve la
 * solicitud y su terreno, verifica que el que actúa sea el dueño (o admin) y
 * crea el contrato en `draft` vinculado a la solicitud, con términos y partes.
 */

// El schema compartido tiene `terms` con `.refine` (ZodEffects), así que el
// `inputSchema` que anuncia el SDK se declara con el Zod local (con `.describe()`);
// la validación REAL la hace `CreateContractSchema.parse` en la función pura.
// Tipado como `ZodRawShape` para que `TOOLS` unifique en server.ts.
export const createContractInput: ZodRawShape = {
  rentalRequestId: z.string().min(1).describe("ID de la solicitud a formalizar"),
  terms: z
    .object({
      summary: z.string().min(10).describe("Resumen de los términos (mín. 10 caracteres)"),
      signedAt: z.string().optional().describe("Fecha de firma (ISO), opcional"),
      startsAt: z.string().describe("Fecha de inicio del contrato (ISO)"),
      endsAt: z.string().describe("Fecha de fin del contrato (ISO)"),
    })
    .describe("Términos del contrato (fin posterior al inicio)"),
};

/** Contrato creado (sin campos internos de Mongo). */
export interface CreatedContract {
  id: string;
  rentalRequestId: string;
  ownerId: string;
  tenantId: string;
  terms: { summary: string; signedAt?: string; startsAt: string; endsAt: string };
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lógica pura (testeable): valida, resuelve solicitud/terreno, verifica permiso y
 * persiste. `actingUser` es el usuario que actúa (garantizado por `requires`).
 */
export async function createContract(
  rawInput: unknown,
  actingUser: Pick<ActingUser, "id" | "role">,
): Promise<CreatedContract> {
  const data = CreateContractSchema.parse(rawInput ?? {});

  const request = await RentalRequest.findOne({ id: data.rentalRequestId }).lean();
  if (!request) throw new ToolError("Solicitud no encontrada");

  const land = await Land.findOne({ id: request.landId }).lean();
  if (!land) throw new ToolError("Terreno de la solicitud no encontrado");

  // Misma regla que la API REST: solo el dueño del terreno (o un admin).
  if (!canCreateContract(actingUser as ActingUser, land)) {
    throw new ToolError("Solo el dueño o un admin pueden generar el contrato");
  }

  const record = await Contract.create({
    id: `contract_${crypto.randomUUID()}`,
    rentalRequestId: request.id,
    ownerId: land.ownerId,
    tenantId: request.tenantId,
    terms: {
      summary: data.terms.summary,
      signedAt: data.terms.signedAt,
      startsAt: data.terms.startsAt,
      endsAt: data.terms.endsAt,
    },
    status: "draft",
  });

  await createAuditEvent({
    actor: { id: actingUser.id, role: actingUser.role },
    entity: "contract",
    action: "created",
    entityId: record.id,
    metadata: { rentalRequestId: record.rentalRequestId },
  });

  const { _id, __v, ...rest } = record.toObject();
  return rest as unknown as CreatedContract;
}

/**
 * Definición de la tool. `requires: "user"` → necesita identidad; el permiso por
 * recurso (dueño/admin) lo aplica `canCreateContract`.
 */
export const createContractTool: ToolDefinition<typeof createContractInput> = {
  name: "create_contract",
  title: "Generar contrato",
  description:
    "Genera un contrato en borrador (draft) vinculado a una solicitud, con términos, fechas y partes. Solo el dueño del terreno (o un admin) puede crearlo. Devuelve el contrato creado.",
  inputSchema: createContractInput,
  requires: "user",
  handler: (args, ctx) => {
    const actingUser = ctx.actingUser as ActingUser;
    return createContract(args, { id: actingUser.id, role: actingUser.role });
  },
};
