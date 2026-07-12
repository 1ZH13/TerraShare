import { afterAll, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mongoose from "mongoose";

import { createBackup, getBackupKey, loadBackup, verifyRestore } from "./backup";

const KEY = getBackupKey();

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "ts-backup-"));
}

const dirs: string[] = [];
async function scopedDir(): Promise<string> {
  const dir = await tempDir();
  dirs.push(dir);
  return dir;
}

afterAll(async () => {
  await Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true })));
});

describe("backup engine (HU-56 #174)", () => {
  it("crea un respaldo cifrado y descifra el mismo contenido (round-trip)", async () => {
    const db = mongoose.connection.db!;
    const dir = await scopedDir();

    const result = await createBackup(db, { dir, key: KEY });

    expect(result.fileName.endsWith(".bak.enc")).toBe(true);
    expect(result.algorithm).toBe("aes-256-gcm");
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.collections.length).toBeGreaterThan(0);

    // El archivo en disco está cifrado: no contiene texto plano reconocible.
    const raw = await readFile(join(dir, result.fileName));
    expect(raw.includes(Buffer.from("createdAt"))).toBe(false);

    const { bundle, checksumOk } = await loadBackup(result.fileName, {
      dir,
      key: KEY,
      expectedChecksum: result.checksum,
    });
    expect(checksumOk).toBe(true);
    expect(bundle.version).toBe(1);
    // Las colecciones semilla (lands, etc.) están presentes en el bundle.
    const landsCount = result.collections.find((c) => c.name === "lands")?.count ?? 0;
    expect(bundle.collections.lands?.length ?? 0).toBe(landsCount);
  });

  it("verifica la restauración en una base temporal comparando conteos", async () => {
    const db = mongoose.connection.db!;
    const dir = await scopedDir();

    const result = await createBackup(db, { dir, key: KEY });
    const verification = await verifyRestore(result.fileName, {
      dir,
      key: KEY,
      expectedChecksum: result.checksum,
    });

    expect(verification.ok).toBe(true);
    expect(verification.checksumOk).toBe(true);
    expect(verification.collections.every((c) => c.ok)).toBe(true);
  });

  it("falla la verificación si el checksum no coincide (archivo alterado)", async () => {
    const db = mongoose.connection.db!;
    const dir = await scopedDir();

    const result = await createBackup(db, { dir, key: KEY });
    const verification = await verifyRestore(result.fileName, {
      dir,
      key: KEY,
      expectedChecksum: "deadbeef",
    });

    expect(verification.ok).toBe(false);
    expect(verification.checksumOk).toBe(false);
  });

  it("rechaza descifrar un artefacto manipulado (tag GCM inválido)", async () => {
    const db = mongoose.connection.db!;
    const dir = await scopedDir();

    const result = await createBackup(db, { dir, key: KEY });
    const path = join(dir, result.fileName);
    const raw = await readFile(path);
    raw[raw.length - 1] ^= 0xff; // corromper el último byte del ciphertext
    await writeFile(path, raw);

    await expect(loadBackup(result.fileName, { dir, key: KEY })).rejects.toThrow();
  });

  it("exige una clave de 32 bytes", () => {
    expect(() => getBackupKey("tooshort")).toThrow();
    expect(() => getBackupKey("YWJj")).toThrow(); // base64 de 3 bytes ("abc")
    expect(() => getBackupKey("")).toThrow(); // vacío = no configurada
  });
});
