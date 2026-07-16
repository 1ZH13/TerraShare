import { z } from "zod";
import { Lead } from "@backend/db/schemas";
import type { ToolDefinition } from "./define-tool";

export const listLeadsInput = {
  page: z.number().int().min(1).default(1).describe("Página (1-indexed)"),
  pageSize: z.number().int().min(1).max(100).default(50).describe("Resultados por página"),
};

const ListLeadsSchema = z.object(listLeadsInput);

export async function listLeads(rawInput: unknown): Promise<{
  items: Record<string, unknown>[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}> {
  const input = ListLeadsSchema.parse(rawInput ?? {});

  const totalItems = await Lead.countDocuments();
  const totalPages = Math.max(1, Math.ceil(totalItems / input.pageSize));
  const docs = await Lead.find()
    .sort({ createdAt: -1 })
    .skip((input.page - 1) * input.pageSize)
    .limit(input.pageSize)
    .lean();

  const items = (docs as unknown as Record<string, unknown>[]).map((d) => {
    const { _id, __v, ...rest } = d;
    return rest;
  });

  return {
    items,
    pagination: { page: input.page, pageSize: input.pageSize, totalItems, totalPages },
  };
}

export const listLeadsTool: ToolDefinition<typeof listLeadsInput> = {
  name: "list_leads",
  title: "Listar leads",
  description:
    "Lista todos los leads capturados (email, fuente, fecha) ordenados del más reciente al más antiguo. Requiere rol de administrador.",
  inputSchema: listLeadsInput,
  requires: "admin",
  handler: (args) => listLeads(args),
};
