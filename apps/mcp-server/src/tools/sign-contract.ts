import { z } from "zod";

import { Contract, AuditEvent } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canReadContract } from "../permissions";

const signContractInput = {
  contractId: z.string().min(1).describe("ID del contrato a firmar"),
  confirm: z.boolean().optional().describe("Debe ser true para confirmar la firma"),
};

export type SignContractInput = z.infer<z.ZodObject<typeof signContractInput>>;

export async function signContract(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(signContractInput);
  const input = schema.parse(rawInput ?? {});

  if (input.confirm !== true) {
    throw new ToolError("Debes confirmar la firma con confirm: true");
  }

  const contract = await Contract.findOne({ id: input.contractId }).lean();
  if (!contract) throw new ToolError("Contrato no encontrado");

  if (
    !canReadContract(
      actingUser as never,
      { ownerId: contract.ownerId, tenantId: contract.tenantId } as never,
    )
  ) {
    throw new ToolError("No autorizado para firmar este contrato");
  }

  if (contract.status !== "draft") {
    throw new ToolError(
      `Solo se pueden firmar contratos en borrador (draft). Estado actual: ${contract.status}`,
    );
  }

  const updated = await Contract.findOneAndUpdate(
    { id: input.contractId },
    {
      $set: {
        status: "active",
        "terms.signedAt": new Date().toISOString(),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new ToolError("Error al firmar el contrato");

  await AuditEvent.create({
    id: `audit_${crypto.randomUUID()}`,
    actorId: actingUser.id,
    actorRole: actingUser.role as "user" | "admin",
    entity: "contract",
    action: "signed",
    entityId: input.contractId,
    metadata: { from: "draft", to: "active" },
  });

  const { _id, __v, ...rest } = updated.toObject();
  return rest;
}

export const signContractTool: ToolDefinition<typeof signContractInput> = {
  name: "sign_contract",
  title: "Firmar contrato",
  description:
    "Firma un contrato en borrador, pasándolo a estado activo. Cualquier parte del contrato (owner o tenant) puede firmarlo.",
  inputSchema: signContractInput,
  requires: "user",
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return signContract(args, actingUser);
  },
};
