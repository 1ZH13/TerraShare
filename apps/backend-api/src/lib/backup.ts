/**
 * Motor de respaldos cifrados de MongoDB (HU-56 #174).
 *
 * Enfoque "bundle cifrado por la app": lee las colecciones con el driver nativo,
 * serializa a Extended JSON (preserva ObjectId/Date/Decimal128), comprime con
 * gzip y cifra con AES-256-GCM. El artefacto resultante es autoverificable
 * (checksum SHA-256 + tag de autenticación GCM) y su restauración se puede
 * *probar* rehidratándolo en una base temporal aislada y comparando conteos.
 *
 * No depende de binarios externos (`mongodump`), por lo que la lógica —incluida
 * la restauración verificada, un criterio de aceptación— corre en CI con
 * `mongodb-memory-server`.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EJSON } from "bson";

import { env } from "../config/env";
import mongooseConn from "../db/mongoose";

// Derivamos los tipos del driver desde la conexión de mongoose para usar la
// misma versión de mongodb que él trae (evita choques de tipos entre la copia
// top-level y la anidada de mongoose).
type Db = NonNullable<typeof mongooseConn.connection.db>;
type MongoClient = ReturnType<typeof mongooseConn.connection.getClient>;

export const BACKUP_ALGORITHM = "aes-256-gcm";
const BUNDLE_VERSION = 1 as const;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** Colecciones internas que no tiene sentido respaldar/restaurar. */
function isSystemCollection(name: string): boolean {
  return name.startsWith("system.");
}

export interface BackupBundle {
  version: typeof BUNDLE_VERSION;
  createdAt: string;
  source: string;
  collections: Record<string, unknown[]>;
}

export interface BackupCollectionInfo {
  name: string;
  count: number;
}

export interface BackupResult {
  id: string;
  fileName: string;
  filePath: string;
  sizeBytes: number;
  checksum: string;
  algorithm: string;
  collections: BackupCollectionInfo[];
  createdAt: string;
}

export interface RestoreVerification {
  ok: boolean;
  checksumOk: boolean;
  checkedAt: string;
  collections: Array<{ name: string; expected: number; restored: number; ok: boolean }>;
  error?: string;
}

/**
 * Resuelve y valida la clave de cifrado (32 bytes). Acepta hex de 64 chars o
 * base64. Lanza un error claro si falta o es inválida, de modo que las rutas la
 * traduzcan a un 503 en vez de un fallo opaco.
 */
export function getBackupKey(raw: string | undefined = env.backupEncryptionKey): Buffer {
  if (!raw) {
    throw new BackupNotConfiguredError();
  }
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new BackupNotConfiguredError(
      "BACKUP_ENCRYPTION_KEY must be 32 bytes (64 hex chars or base64)",
    );
  }
  return key;
}

export class BackupNotConfiguredError extends Error {
  constructor(message = "BACKUP_ENCRYPTION_KEY is not configured") {
    super(message);
    this.name = "BackupNotConfiguredError";
  }
}

/** Cifra un buffer con AES-256-GCM. Formato de salida: iv | authTag | ciphertext. */
function encrypt(plain: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(BACKUP_ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]);
}

/** Descifra un buffer con el formato iv | authTag | ciphertext. */
function decrypt(payload: Buffer, key: Buffer): Buffer {
  const iv = payload.subarray(0, IV_BYTES);
  const authTag = payload.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = payload.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv(BACKUP_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Lee todas las colecciones (menos las de sistema) a un bundle en memoria. */
export async function serializeDatabase(db: Db): Promise<BackupBundle> {
  const collections = await db.listCollections().toArray();
  const bundle: BackupBundle = {
    version: BUNDLE_VERSION,
    createdAt: new Date().toISOString(),
    source: db.databaseName,
    collections: {},
  };
  for (const info of collections) {
    if (isSystemCollection(info.name)) continue;
    bundle.collections[info.name] = await db.collection(info.name).find().toArray();
  }
  return bundle;
}

interface BackupOptions {
  dir?: string;
  key?: Buffer;
}

/**
 * Crea un respaldo cifrado del estado actual de la base y lo escribe en disco.
 * Devuelve los metadatos (checksum, tamaño, conteos) para persistir en el ledger.
 */
export async function createBackup(db: Db, options: BackupOptions = {}): Promise<BackupResult> {
  const key = options.key ?? getBackupKey();
  const dir = options.dir ?? env.backupDir;

  const bundle = await serializeDatabase(db);
  const plaintext = gzipSync(Buffer.from(EJSON.stringify(bundle), "utf8"));
  const encrypted = encrypt(plaintext, key);

  const createdAt = new Date();
  const id = `backup_${createdAt.toISOString().replace(/[:.]/g, "-")}_${randomBytes(4).toString("hex")}`;
  const fileName = `${id}.bak.enc`;
  const filePath = join(dir, fileName);

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, encrypted);

  return {
    id,
    fileName,
    filePath,
    sizeBytes: encrypted.length,
    checksum: sha256(encrypted),
    algorithm: BACKUP_ALGORITHM,
    collections: Object.entries(bundle.collections).map(([name, docs]) => ({
      name,
      count: docs.length,
    })),
    createdAt: createdAt.toISOString(),
  };
}

interface LoadOptions extends BackupOptions {
  /** Checksum esperado; si se pasa, se valida antes de descifrar. */
  expectedChecksum?: string;
}

/** Carga y descifra un respaldo desde disco, validando checksum si se provee. */
export async function loadBackup(
  fileName: string,
  options: LoadOptions = {},
): Promise<{ bundle: BackupBundle; checksumOk: boolean }> {
  const key = options.key ?? getBackupKey();
  const dir = options.dir ?? env.backupDir;
  const encrypted = await readFile(join(dir, fileName));

  const checksumOk = options.expectedChecksum
    ? sha256(encrypted) === options.expectedChecksum
    : true;

  const plaintext = decrypt(encrypted, key);
  const bundle = EJSON.parse(gunzipSync(plaintext).toString("utf8")) as unknown as BackupBundle;
  return { bundle, checksumOk };
}

/**
 * Restaura un bundle en una base destino. Si `drop` es true, vacía cada
 * colección antes de insertar (restauración de reemplazo).
 */
export async function restoreBundle(
  bundle: BackupBundle,
  targetDb: Db,
  { drop = false }: { drop?: boolean } = {},
): Promise<Array<{ name: string; restored: number }>> {
  const results: Array<{ name: string; restored: number }> = [];
  for (const [name, docs] of Object.entries(bundle.collections)) {
    const collection = targetDb.collection(name);
    if (drop) {
      await collection.deleteMany({});
    }
    if (docs.length > 0) {
      await collection.insertMany(docs as Record<string, unknown>[]);
    }
    results.push({ name, restored: docs.length });
  }
  return results;
}

/**
 * Restauración *probada*: descifra el respaldo, valida su checksum y lo
 * rehidrata en una base temporal aislada, comparando los conteos por colección.
 * Deja la base de datos real intacta y elimina la temporal al terminar.
 */
export async function verifyRestore(
  fileName: string,
  options: LoadOptions & { client?: MongoClient } = {},
): Promise<RestoreVerification> {
  const checkedAt = new Date().toISOString();
  const { bundle, checksumOk } = await loadBackup(fileName, options);

  if (!checksumOk) {
    return {
      ok: false,
      checksumOk: false,
      checkedAt,
      collections: [],
      error: "Checksum mismatch: el archivo de respaldo pudo alterarse o corromperse",
    };
  }

  // Restauramos en una base temporal aislada (mismo cluster) para no tocar la
  // base real. El cliente sale de la conexión activa de mongoose.
  const client = options.client ?? mongooseConn.connection.getClient();
  const tempName = `ts_restore_verify_${Date.now()}_${randomBytes(3).toString("hex")}`;
  const tempDb = client.db(tempName);

  try {
    await restoreBundle(bundle, tempDb, { drop: true });

    const collections = await Promise.all(
      Object.entries(bundle.collections).map(async ([name, docs]) => {
        const restored = await tempDb.collection(name).countDocuments();
        return { name, expected: docs.length, restored, ok: restored === docs.length };
      }),
    );

    return {
      ok: collections.every((c) => c.ok),
      checksumOk: true,
      checkedAt,
      collections,
    };
  } finally {
    await tempDb.dropDatabase().catch(() => {
      /* la base temporal es efímera; ignorar fallos de limpieza */
    });
  }
}
