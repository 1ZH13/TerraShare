import type { ZodRawShape } from "zod";
import { CreateLandSchema } from "@terrashare/shared";

import { Land } from "@backend/db/schemas";
import { createAuditEvent } from "@backend/store/audit";
import type { ActingUser } from "../context";
import type { ToolDefinition } from "./define-tool";

/**
 * Tool HU-65 (#182): Publicar un terreno. Espeja `POST /lands` del backend:
 * valida con el MISMO schema compartido, crea el terreno en `draft` a nombre del
 * usuario que actúa y registra el evento de auditoría — sin duplicar reglas.
 */

// Reusa el shape del schema compartido como `inputSchema` del SDK MCP: una sola
// fuente de verdad para los campos y sus validaciones (título ≥3, área >0, ≥1
// uso, location, priceRule, y opcionales operation/salePrice/water/access/…).
//
// `@terrashare/shared` resuelve su propia copia de Zod v4 (distinta minor a la
// del mcp-server); son compatibles en runtime, pero sus tipos nominales no
// coinciden. Adaptamos el shape al `ZodRawShape` del Zod local para el SDK; la
// validación real la sigue haciendo `CreateLandSchema.parse` en `createLand`.
export const createLandInput = CreateLandSchema.shape as unknown as ZodRawShape;

/** Terreno tal como se persiste (sin los campos internos de Mongo). */
export interface CreatedLand {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  area: number;
  allowedUses: string[];
  photos: string[];
  location: Record<string, unknown>;
  availability: Record<string, unknown>;
  priceRule: { currency: string; pricePerMonth: number };
  status: "draft";
  operation: string;
  salePrice?: number;
  water?: string;
  access?: string;
  features: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Lógica pura (testeable de forma aislada): valida la entrada, construye el
 * terreno igual que el endpoint REST y lo persiste. `ownerId` es el usuario que
 * actúa (garantizado por `requires: "user"` en la tool).
 */
export async function createLand(rawInput: unknown, ownerId: string): Promise<CreatedLand> {
  const data = CreateLandSchema.parse(rawInput ?? {});

  const now = new Date().toISOString();
  const land: CreatedLand = {
    id: `land_${crypto.randomUUID()}`,
    ownerId,
    title: data.title,
    description: data.description,
    area: data.area,
    allowedUses: data.allowedUses,
    photos: [],
    location: data.location,
    availability: data.availability ?? {},
    priceRule: data.priceRule,
    status: "draft",
    operation: data.operation ?? "alquiler",
    salePrice: data.salePrice,
    water: data.water,
    access: data.access,
    features: data.features ?? [],
    createdAt: now,
    updatedAt: now,
  };

  await Land.create(land);

  // Misma auditoría que la API REST (entity: land, action: created).
  await createAuditEvent({
    actor: { id: ownerId, role: "user" },
    entity: "land",
    action: "created",
    entityId: land.id,
  });

  return land;
}

/**
 * Definición de la tool. `requires: "user"` → necesita identidad configurada
 * (MCP_ACTING_USER_ID); el terreno queda a nombre de ese usuario.
 */
export const createLandTool: ToolDefinition<typeof createLandInput> = {
  name: "create_land",
  title: "Publicar un terreno",
  description:
    "Crea un terreno en borrador (draft) a nombre del dueño autenticado. Valida los campos requeridos (título, área, usos, ubicación y precio) antes de crear. Devuelve el terreno creado.",
  inputSchema: createLandInput,
  requires: "user",
  handler: (args, ctx) => createLand(args, (ctx.actingUser as ActingUser).id),
};
