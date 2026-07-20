import { z } from "zod";

import { Contract, AuditEvent } from "@backend/db/schemas";
import { config } from "../config";
import { notifyUser } from "../lib/notify";
import type { ActingUser } from "../context";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canReadContract } from "../permissions";

// La confirmación (capa B, vista previa) la gestiona el andamiaje `registerTool`
// vía `sensitive` — no se declara `confirm` aquí.
const signContractInput = {
  contractId: z.string().min(1).describe("ID del contrato a firmar"),
};

export type SignContractInput = z.infer<z.ZodObject<typeof signContractInput>>;

export async function signContract(
  rawInput: unknown,
  actingUser: { id: string; role: string },
): Promise<Record<string, unknown>> {
  const schema = z.object(signContractInput);
  const input = schema.parse(rawInput ?? {});

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

  // Capa E (#328): notifica a ambas partes que el contrato quedó firmado/activo.
  try {
    for (const userId of [contract.ownerId, contract.tenantId]) {
      if (userId) {
        await notifyUser({
          userId,
          type: "contract_signed",
          title: "Contrato firmado",
          body: `El contrato ${input.contractId} fue firmado y está activo.`,
        });
      }
    }
  } catch (err) {
    console.error("[mcp-server] sign_contract: fallo al notificar a las partes", err);
  }

  const { _id, __v, ...rest } = updated.toObject();
  return rest;
}

/**
 * Vista previa (capa B, #328): resume el contrato a firmar SIN firmarlo. Aplica
 * la misma restricción de propiedad (C): solo una parte (owner/tenant) o admin.
 */
export async function signContractPreview(
  args: Record<string, unknown>,
  actingUser: Pick<ActingUser, "id" | "role">,
): Promise<Record<string, unknown>> {
  const { contractId } = z.object(signContractInput).parse(args ?? {});
  const contract = await Contract.findOne({ id: contractId }).lean();
  if (!contract) throw new ToolError("Contrato no encontrado");
  if (
    !canReadContract(
      actingUser as never,
      { ownerId: contract.ownerId, tenantId: contract.tenantId } as never,
    )
  ) {
    throw new ToolError("No autorizado para firmar este contrato");
  }
  return {
    contractId: contract.id,
    status: contract.status,
    ownerId: contract.ownerId,
    tenantId: contract.tenantId,
    terms: contract.terms,
    willBecome: "active",
  };
}

export const signContractTool: ToolDefinition<typeof signContractInput> = {
  name: "sign_contract",
  title: "Firmar contrato",
  description:
    "Firma un contrato en borrador, pasándolo a estado activo. Solo una parte del contrato (owner o tenant) o un admin puede firmarlo. Acción sensible: la 1ª llamada devuelve una vista previa de los términos y un confirmationToken; la firma se aplica al repetir con ese token. Notifica a ambas partes.",
  inputSchema: signContractInput,
  requires: "user",
  sensitive: {
    preview: (args, ctx) => signContractPreview(args, ctx.actingUser!),
    enabled: () => config.allowSign,
  },
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!;
    return signContract(args, actingUser);
  },
};
