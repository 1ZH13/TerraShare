import { migrations as defaultMigrations } from "../migrations";
import type { Db, Migration } from "../migrations/types";

/**
 * Migrador de base de datos versionado (#173 / HU-55).
 *
 * Aplica migraciones ordenadas de forma reproducible y reversible, registrando
 * las aplicadas en la colección `_migrations`. Reaplicar es un no-op (solo se
 * ejecutan las pendientes); revertir ejecuta el `down` de las más recientes.
 */

export const MIGRATIONS_COLLECTION = "_migrations";

export interface MigrationRecord {
  id: string;
  name: string;
  appliedAt: Date;
}

export interface MigrationStatusEntry {
  id: string;
  name: string;
  applied: boolean;
  appliedAt: Date | null;
}

interface MigratorOptions {
  /** Lista de migraciones a considerar (por defecto, todas las registradas). */
  migrations?: Migration[];
}

/** Garantiza el índice único que evita registrar dos veces la misma migración. */
async function ensureLedger(db: Db): Promise<void> {
  await db.collection(MIGRATIONS_COLLECTION).createIndex({ id: 1 }, { unique: true });
}

async function getApplied(db: Db): Promise<MigrationRecord[]> {
  return db
    .collection<MigrationRecord>(MIGRATIONS_COLLECTION)
    .find()
    .sort({ id: 1 })
    .toArray();
}

/** Estado de cada migración: aplicada o pendiente. */
export async function migrationStatus(
  db: Db,
  { migrations = defaultMigrations }: MigratorOptions = {},
): Promise<MigrationStatusEntry[]> {
  const applied = new Map((await getApplied(db)).map((r) => [r.id, r.appliedAt]));
  return migrations.map((m) => ({
    id: m.id,
    name: m.name,
    applied: applied.has(m.id),
    appliedAt: applied.get(m.id) ?? null,
  }));
}

/**
 * Aplica todas las migraciones pendientes en orden. Idempotente: las ya
 * registradas se omiten. Devuelve los ids realmente aplicados.
 */
export async function migrateUp(
  db: Db,
  { migrations = defaultMigrations }: MigratorOptions = {},
): Promise<string[]> {
  await ensureLedger(db);
  const appliedIds = new Set((await getApplied(db)).map((r) => r.id));
  const pending = [...migrations]
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((m) => !appliedIds.has(m.id));

  const ran: string[] = [];
  for (const migration of pending) {
    await migration.up(db);
    await db
      .collection<MigrationRecord>(MIGRATIONS_COLLECTION)
      .insertOne({ id: migration.id, name: migration.name, appliedAt: new Date() });
    ran.push(migration.id);
  }
  return ran;
}

/**
 * Revierte las últimas `steps` migraciones aplicadas (por defecto 1), de la más
 * reciente a la más antigua. Devuelve los ids revertidos.
 */
export async function migrateDown(
  db: Db,
  { steps = 1, migrations = defaultMigrations }: MigratorOptions & { steps?: number } = {},
): Promise<string[]> {
  await ensureLedger(db);
  const applied = await getApplied(db);
  const toRevert = applied.slice(-steps).reverse();
  const byId = new Map(migrations.map((m) => [m.id, m]));

  const reverted: string[] = [];
  for (const record of toRevert) {
    const migration = byId.get(record.id);
    if (migration) {
      await migration.down(db);
    }
    await db.collection(MIGRATIONS_COLLECTION).deleteOne({ id: record.id });
    reverted.push(record.id);
  }
  return reverted;
}
