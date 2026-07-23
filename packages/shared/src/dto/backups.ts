/**
 * Contratos de respaldos automáticos y restauración (HU-56 #174).
 */

export type BackupStatus = "completed" | "failed";
export type BackupVerifyStatus = "pending" | "passed" | "failed";

export interface BackupCollectionInfoDto {
  name: string;
  count: number;
}

export interface BackupVerifyCollectionDto {
  name: string;
  expected: number;
  restored: number;
  ok: boolean;
}

export interface BackupRecordDto {
  id: string;
  fileName: string;
  sizeBytes: number;
  checksum: string;
  algorithm: string;
  collections: BackupCollectionInfoDto[];
  status: BackupStatus;
  error?: string;
  createdBy: string;
  lastVerifiedAt: string | null;
  verifyStatus: BackupVerifyStatus;
  verifyDetail: {
    checksumOk?: boolean;
    collections?: BackupVerifyCollectionDto[];
    error?: string;
  } | null;
  createdAt: string;
}

export interface BackupListDto {
  items: BackupRecordDto[];
  total: number;
  lastBackupAt: string | null;
  lastVerifiedAt: string | null;
  /**
   * Si el servidor tiene `BACKUP_ENCRYPTION_KEY`. Sin ella no se puede cifrar
   * nada y crear un respaldo falla siempre.
   *
   * Se expone para que la pantalla lo diga por adelantado en vez de ofrecer un
   * botón que revienta al pulsarlo (#397).
   */
  configured: boolean;
}
