import { z } from "zod";
import { Lead } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";

/**
 * Tool HU-88 (#203): Capturar lead. Registra un nuevo lead de interés en la
 * plataforma. Acceso público: cualquier usuario puede enviar sus datos.
 */

export const captureLeadInput = {
  email: z.string().email().describe("Email del lead"),
  source: z.enum(["landing", "app-web", "admin-dashboard"]).describe("Fuente del lead"),
};

export async function captureLead(rawInput: {
  email: string;
  source: string;
}): Promise<Record<string, unknown>> {
  const parsed = z.object(captureLeadInput).safeParse(rawInput);
  if (!parsed.success) throw new ToolError("Email inválido");

  const email = parsed.data.email.trim().toLowerCase();

  const existing = await Lead.findOne({ email }).lean();
  if (existing) throw new ToolError("Ya existe un lead con este email");

  const lead = await Lead.create({
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email,
    source: parsed.data.source,
    createdAt: new Date(),
  });

  const { _id, __v, ...rest } = lead.toObject() as unknown as Record<string, unknown>;
  return rest;
}

/**
 * Definición de la tool. Pública (no requiere identidad): cualquier
 * usuario puede enviar un lead desde la landing o la app.
 */
export const captureLeadTool: ToolDefinition<typeof captureLeadInput> = {
  name: "capture_lead",
  title: "Capturar lead",
  description: "Registra un nuevo lead de interés en la plataforma. Acceso público.",
  inputSchema: captureLeadInput,
  requires: "public",
  handler: (args) =>
    captureLead({
      email: args.email as string,
      source: args.source as string,
    }),
};
