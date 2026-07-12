import { z } from "zod";

import { Contract } from "@backend/db/schemas";
import { canReadContract } from "@backend/lib/auth-helpers";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-76 (#193): Consultar contrato. Devuelve los detalles de un
 * contrato por su ID, incluyendo estado, fechas y términos.
 */

export const getContractInput = {
  contractId: z.string().min(1).describe("ID del contrato a consultar"),
};

export type GetContractInput = z.infer<z.ZodObject<typeof getContractInput>>;

/**
 * Función pura de búsqueda (testeable de forma aislada). Busca un contrato
 * por ID y verifica que el usuario tenga permisos para verlo.
 */
export async function getContract(rawInput: {
  contractId: string;
  actingUserId: string | null;
}): Promise<Record<string, unknown>> {
  if (!rawInput.actingUserId) {
    throw new ToolError("Se requiere un usuario autenticado");
  }

  const contract = await Contract.findOne({ id: rawInput.contractId }).lean();
  if (!contract) throw new ToolError("Contrato no encontrado");

  // Check permission: only parties (owner/tenant) or admin can read
  if (!canReadContract({ id: rawInput.actingUserId } as any, contract as any)) {
    throw new ToolError("No autorizado para ver este contrato");
  }

  const { _id, __v, ...rest } = contract as unknown as Record<string, unknown>;
  return rest;
}

/**
 * Definición de la tool. Requiere usuario autenticado (scope tenant/owner).
 */
export const getContractTool: ToolDefinition<typeof getContractInput> = {
  name: "get_contract",
  title: "Consultar contrato",
  description:
    "Obtiene los detalles de un contrato por su ID, incluyendo estado, fechas y términos. Solo las partes o un administrador pueden verlo.",
  inputSchema: getContractInput,
  requires: "user",
  handler: (args, ctx) =>
    getContract({
      contractId: args.contractId as string,
      actingUserId: ctx.actingUser?.id ?? null,
    }),
};
