import { z } from "zod";

import { Contract, AuditEvent } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canMutateContract } from "../permissions";

const completeContractInput = {
  contractId: z.string().min(1).describe("ID del contrato a completar"),
};

export type CompleteContractInput = z.infer<z.ZodObject<typeof completeContractInput>>;

export async function completeContract(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(completeContractInput);
  const input = schema.parse(rawInput ?? {});

  const contract = await Contract.findOne({ id: input.contractId }).lean();
  if (!contract) throw new ToolError("Contrato no encontrado");

  if (!canMutateContract(actingUser as never, { ownerId: contract.ownerId } as never)) {
    throw new ToolError("Solo el propietario o un administrador pueden completar contratos");
  }

  if (contract.status !== "active") {
    throw new ToolError(
      `Solo se pueden completar contratos activos. Estado actual: ${contract.status}`,
    );
  }

  const updated = await Contract.findOneAndUpdate(
    { id: input.contractId },
    { $set: { status: "completed", updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!updated) throw new ToolError("Error al completar el contrato");

  await AuditEvent.create({
    id: `audit_${crypto.randomUUID()}`,
    actorId: actingUser.id,
    actorRole: actingUser.role as "user" | "admin",
    entity: "contract",
    action: "completed",
    entityId: input.contractId,
    metadata: { from: "active", to: "completed" },
  });

  const { _id, __v, ...rest } = updated.toObject();
  return rest;
}

export const completeContractTool: ToolDefinition<typeof completeContractInput> = {
  name: "complete_contract",
  title: "Completar contrato",
  description:
    "Marca un contrato activo como completado. Solo el propietario o un administrador pueden ejecutar esta acción.",
  inputSchema: completeContractInput,
  requires: "user",
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return completeContract(args, actingUser);
  },
};
