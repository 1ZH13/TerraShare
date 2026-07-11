import type { Migration } from "./types";
import {
  User,
  Land,
  RentalRequest,
  Contract,
  Payment,
  Chat,
  ChatMessage,
  AuditEvent,
  Lead,
  WebhookEvent,
  IdempotencyKey,
  Report,
} from "../db/schemas";

/**
 * Índices únicos que garantizan la identidad de cada entidad (#173).
 *
 * Los nombres de colección se derivan de los modelos Mongoose (`.collection.name`)
 * en vez de escribirse a mano: así la migración apunta SIEMPRE a la colección real
 * que la app lee (Mongoose pluraliza en minúsculas: `RentalRequest` →
 * `rentalrequests`), evitando el desajuste camelCase del hallazgo A-2.
 *
 * Se usan los nombres de índice por defecto de Mongo (`<campo>_1`), idénticos a
 * los que crearía `autoIndex`, para que `createIndex` sea idempotente y no
 * choque con un índice ya existente.
 */
const UNIQUE_INDEXES: { collection: string; field: string }[] = [
  { collection: User.collection.name, field: "clerkUserId" },
  { collection: Land.collection.name, field: "id" },
  { collection: RentalRequest.collection.name, field: "id" },
  { collection: Contract.collection.name, field: "id" },
  { collection: Payment.collection.name, field: "id" },
  { collection: Chat.collection.name, field: "id" },
  { collection: ChatMessage.collection.name, field: "id" },
  { collection: AuditEvent.collection.name, field: "id" },
  { collection: Lead.collection.name, field: "id" },
  { collection: WebhookEvent.collection.name, field: "eventId" },
  { collection: IdempotencyKey.collection.name, field: "key" },
  { collection: Report.collection.name, field: "id" },
];

export const migration: Migration = {
  id: "001",
  name: "unique-indexes",
  async up(db) {
    for (const { collection, field } of UNIQUE_INDEXES) {
      await db.collection(collection).createIndex({ [field]: 1 }, { unique: true });
    }
  },
  async down(db) {
    for (const { collection, field } of UNIQUE_INDEXES) {
      // Nombre por defecto de Mongo para un índice de un solo campo ascendente.
      await db
        .collection(collection)
        .dropIndex(`${field}_1`)
        .catch(() => {
          /* el índice puede no existir; down debe ser tolerante */
        });
    }
  },
};
