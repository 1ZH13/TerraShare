import type { Migration } from "./types";
import { User } from "../db/schemas";

/**
 * Elimina el índice único obsoleto `users.id_1` (#356).
 *
 * `UserSchema` no tiene campo `id` — la identidad del usuario es `clerkUserId`.
 * El índice quedó de la etapa del driver nativo, cuando los usuarios semilla
 * llevaban un `id` propio, y sobrevive en cualquier base creada antes de #135
 * porque Mongoose crea índices pero nunca borra los que sobran.
 *
 * Mientras existe, rompe el alta de usuarios reales: `ensureUserInMongo` inserta
 * sin `id`, Mongo indexa el campo ausente como `null`, y el **segundo** usuario
 * de Clerk que inicie sesión choca con E11000 contra el primero. El error se
 * traga el `catch` de `ensureUserInMongo`, así que el síntoma visible es que el
 * panel de admin solo muestra un usuario real, sin ningún error en los logs.
 */
export const migration: Migration = {
  id: "002",
  name: "drop-stale-user-id-index",
  async up(db) {
    await db
      .collection(User.collection.name)
      .dropIndex("id_1")
      .catch(() => {
        // En bases nuevas el índice nunca existió: la migración no tiene efecto.
      });
  },
  async down() {
    // No se recrea a propósito: el índice era un error y volver a ponerlo
    // reintroduciría el fallo de alta de usuarios.
  },
};
