import type { Connection } from "mongoose";

/**
 * Tipo `Db` derivado del `Connection` de Mongoose (no de `mongodb` directamente):
 * el proyecto tiene dos versiones de `mongodb` en el árbol (la propia y la que
 * anida Mongoose), y `mongoose.connection.db` devuelve la de Mongoose. Derivarlo
 * de aquí garantiza compatibilidad de tipos.
 */
export type Db = NonNullable<Connection["db"]>;

/**
 * Una migración versionada de base de datos (#173 / HU-55).
 *
 * Cada migración es reproducible (idempotente al reaplicarse) y reversible
 * (`down` deshace lo que hace `up`). El `id` es ordenable y único; las
 * migraciones se aplican en orden ascendente de `id`.
 */
export interface Migration {
  /** Identificador ordenable y único, p. ej. "001". */
  id: string;
  /** Descripción legible de qué hace la migración. */
  name: string;
  /** Aplica la migración. Debe ser idempotente. */
  up(db: Db): Promise<void>;
  /** Revierte la migración. Debe tolerar que lo revertido ya no exista. */
  down(db: Db): Promise<void>;
}
