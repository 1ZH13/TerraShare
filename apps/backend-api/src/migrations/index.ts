import type { Migration } from "./types";
import { migration as m001UniqueIndexes } from "./001-unique-indexes";
import { migration as m002DropStaleUserIdIndex } from "./002-drop-stale-user-id-index";

/**
 * Registro ordenado de migraciones (#173). Añade nuevas migraciones al final,
 * con un `id` estrictamente mayor. El migrador las aplica en este orden.
 */
export const migrations: Migration[] = [m001UniqueIndexes, m002DropStaleUserIdIndex];
