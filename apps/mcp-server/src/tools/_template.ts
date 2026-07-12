/**
 * PLANTILLA para implementar una tool MCP (HU-64..HU-92). #234
 *
 * Copia este archivo a `src/tools/<mi-tool>.ts`, renómbralo y ajústalo. Luego
 * regístralo añadiéndolo al array `TOOLS` de `src/server.ts`.
 *
 * Este archivo NO se registra (empieza por `_`); es solo una guía. Compila, así
 * que puedes usarlo como referencia viva.
 *
 * Checklist:
 *  1. `inputSchema`: shape Zod con `.describe()` en cada campo (usa el zod local).
 *  2. Función pura (opcional pero recomendado) para la lógica → fácil de testear.
 *  3. Define `requires`: "public" | "user" | "admin".
 *  4. En el handler usa `ctx.actingUser` y los helpers de `../permissions` para
 *     los chequeos por recurso (p. ej. `canMutateLand`). Lanza `ToolError` para
 *     errores de negocio (se devuelven como resultado legible, sin crash).
 *  5. Escribe un test en `<mi-tool>.test.ts` (usa el preload de Mongo en memoria).
 */

import { z } from "zod";

import { Land } from "@backend/db/schemas";
import { ToolError, type ToolDefinition } from "./define-tool";
import { canMutateLand } from "../permissions";

// 1. Entrada
export const exampleInput = {
  landId: z.string().min(1).describe("ID del terreno"),
  title: z.string().min(3).optional().describe("Nuevo título"),
};

// 2. Lógica (pura, testeable). Recibe también el usuario que actúa.
async function exampleLogic(
  args: { landId: string; title?: string },
  actingUserId: string,
): Promise<Record<string, unknown>> {
  const land = await Land.findOne({ id: args.landId }).lean();
  if (!land) throw new ToolError("Terreno no encontrado");
  // ... aplicar cambios, devolver un objeto plano ...
  return { id: args.landId, ok: true, by: actingUserId };
}

// 3 + 4. Definición de la tool
export const exampleTool: ToolDefinition<typeof exampleInput> = {
  name: "example_tool",
  title: "Tool de ejemplo",
  description: "Reemplaza esto por la descripción real de la tool.",
  inputSchema: exampleInput,
  requires: "user", // requiere identidad configurada (MCP_ACTING_USER_ID)
  handler: async (args, ctx) => {
    const actingUser = ctx.actingUser!; // garantizado por `requires: "user"`
    const land = await Land.findOne({ id: args.landId as string }).lean();
    if (!land) throw new ToolError("Terreno no encontrado");

    // Permiso por recurso reutilizando la misma regla que la API REST.
    if (!canMutateLand(actingUser, land as unknown as { ownerId: string })) {
      throw new ToolError("No autorizado para modificar este terreno");
    }

    return exampleLogic(args as { landId: string; title?: string }, actingUser.id);
  },
};
