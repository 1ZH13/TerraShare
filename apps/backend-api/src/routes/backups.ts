import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAdmin, requireAuth } from "../middleware/require-auth";
import { createAuditEvent } from "../store/audit";
import { BackupRecord } from "../db/schemas";
import mongoose from "../db/mongoose";
import { BackupNotConfiguredError, createBackup, verifyRestore } from "../lib/backup";
import { env } from "../config/env";
import type { AppEnv } from "../types";

/**
 * Respaldos automáticos y restauración probada (HU-56 #174).
 *
 * Endpoints de operaciones (solo admin): disparar un respaldo cifrado, consultar
 * el historial y ejecutar una restauración verificada sobre una base temporal.
 * La programación periódica la hace `scripts/backup.ts` vía cron.
 */
export const backupRoutes = new Hono<AppEnv>();

function toDto(record: {
  id: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  algorithm: string;
  collections: { name: string; count: number }[];
  status: string;
  error?: string;
  createdBy: string;
  lastVerifiedAt?: Date | null;
  verifyStatus: string;
  verifyDetail?: Record<string, unknown> | null;
  createdAt: Date;
}) {
  return {
    id: record.id,
    fileName: record.fileName,
    sizeBytes: record.sizeBytes,
    checksum: record.checksum,
    algorithm: record.algorithm,
    collections: record.collections.map((c) => ({ name: c.name, count: c.count })),
    status: record.status,
    error: record.error,
    createdBy: record.createdBy,
    lastVerifiedAt: record.lastVerifiedAt ? new Date(record.lastVerifiedAt).toISOString() : null,
    verifyStatus: record.verifyStatus,
    verifyDetail: record.verifyDetail ?? null,
    createdAt: new Date(record.createdAt).toISOString(),
  };
}

/** Dispara un respaldo cifrado del estado actual de la base. */
backupRoutes.post("/admin/backups", requireAuth, requireAdmin, async (c) => {
  const authUser = c.get("authUser");
  const db = mongoose.connection.db;
  if (!db) {
    return failure(c, 503, "INTERNAL_ERROR", "Database connection not available");
  }

  let result;
  try {
    result = await createBackup(db);
  } catch (err) {
    if (err instanceof BackupNotConfiguredError) {
      return failure(c, 503, "INTERNAL_ERROR", err.message);
    }
    throw err;
  }

  const record = await BackupRecord.create({
    id: result.id,
    fileName: result.fileName,
    sizeBytes: result.sizeBytes,
    checksum: result.checksum,
    algorithm: result.algorithm,
    collections: result.collections,
    status: "completed",
    createdBy: authUser.id,
    verifyStatus: "pending",
  });

  await createAuditEvent({
    actor: authUser,
    entity: "backup",
    action: "created",
    entityId: result.id,
    metadata: { fileName: result.fileName, sizeBytes: result.sizeBytes, checksum: result.checksum },
  });

  return success(c, toDto(record.toObject()), 201);
});

/** Historial de respaldos, más recientes primero. */
backupRoutes.get("/admin/backups", requireAuth, requireAdmin, async (c) => {
  const records = await BackupRecord.find().sort({ createdAt: -1 }).lean();
  const items = records.map(toDto);
  const lastVerified = items.find((r) => r.verifyStatus === "passed")?.lastVerifiedAt ?? null;
  return success(c, {
    items,
    total: items.length,
    lastBackupAt: items[0]?.createdAt ?? null,
    lastVerifiedAt: lastVerified,
    // Sin la clave de cifrado no se puede respaldar nada. Se informa aquí para
    // que la pantalla lo advierta antes, en vez de dejar pulsar un botón que
    // termina en un 503 en inglés (#397).
    configured: env.backupConfigured,
  });
});

/** Detalle de un respaldo. */
backupRoutes.get("/admin/backups/:id", requireAuth, requireAdmin, async (c) => {
  const record = await BackupRecord.findOne({ id: c.req.param("id") }).lean();
  if (!record) {
    return failure(c, 404, "NOT_FOUND", "Backup not found");
  }
  return success(c, toDto(record));
});

/**
 * Restauración probada: rehidrata el respaldo en una base temporal y compara
 * conteos. Actualiza el ledger con el resultado y registra auditoría.
 */
backupRoutes.post("/admin/backups/:id/verify", requireAuth, requireAdmin, async (c) => {
  const authUser = c.get("authUser");
  const record = await BackupRecord.findOne({ id: c.req.param("id") });
  if (!record) {
    return failure(c, 404, "NOT_FOUND", "Backup not found");
  }

  let verification;
  try {
    verification = await verifyRestore(record.fileName, { expectedChecksum: record.checksum });
  } catch (err) {
    if (err instanceof BackupNotConfiguredError) {
      return failure(c, 503, "INTERNAL_ERROR", err.message);
    }
    // Un artefacto ilegible (borrado, clave rotada) no es un 500: se marca el
    // ledger como fallido y se informa al operador.
    record.verifyStatus = "failed";
    record.lastVerifiedAt = new Date();
    record.verifyDetail = { error: err instanceof Error ? err.message : "unknown error" };
    await record.save();
    return failure(c, 422, "BUSINESS_RULE_VIOLATION", "Backup could not be restored/verified");
  }

  record.verifyStatus = verification.ok ? "passed" : "failed";
  record.lastVerifiedAt = new Date(verification.checkedAt);
  record.verifyDetail = {
    checksumOk: verification.checksumOk,
    collections: verification.collections,
    error: verification.error,
  };
  await record.save();

  await createAuditEvent({
    actor: authUser,
    entity: "backup",
    action: "verified",
    entityId: record.id,
    metadata: { ok: verification.ok, checksumOk: verification.checksumOk },
  });

  return success(c, toDto(record.toObject()));
});
