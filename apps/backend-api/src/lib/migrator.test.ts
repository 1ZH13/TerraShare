import { describe, expect, it, beforeEach } from "bun:test";
import mongoose from "mongoose";

import {
  MIGRATIONS_COLLECTION,
  migrateDown,
  migrateUp,
  migrationStatus,
} from "./migrator";
import type { Migration } from "../migrations/types";

function db() {
  const conn = mongoose.connection.db;
  if (!conn) throw new Error("No DB connection");
  return conn;
}

/** Migraciones de prueba: crean/borran un documento marcador en una colección. */
const TEST_COLLECTION = "_migrator_test_marker";
function makeTestMigrations(): Migration[] {
  return [
    {
      id: "t01",
      name: "primera",
      async up(d) {
        await d.collection(TEST_COLLECTION).insertOne({ step: "t01" });
      },
      async down(d) {
        await d.collection(TEST_COLLECTION).deleteOne({ step: "t01" });
      },
    },
    {
      id: "t02",
      name: "segunda",
      async up(d) {
        await d.collection(TEST_COLLECTION).insertOne({ step: "t02" });
      },
      async down(d) {
        await d.collection(TEST_COLLECTION).deleteOne({ step: "t02" });
      },
    },
  ];
}

describe("migrator (#173)", () => {
  beforeEach(async () => {
    // El ledger de migraciones no lo resetea el preload; limpiamos las de prueba.
    await db().collection(MIGRATIONS_COLLECTION).deleteMany({ id: { $in: ["t01", "t02"] } });
    await db().collection(TEST_COLLECTION).deleteMany({});
  });

  it("aplica migraciones pendientes en orden y las registra", async () => {
    const migrations = makeTestMigrations();
    const ran = await migrateUp(db(), { migrations });
    expect(ran).toEqual(["t01", "t02"]);

    const markers = await db().collection(TEST_COLLECTION).find().toArray();
    expect(markers.map((m) => m.step).sort()).toEqual(["t01", "t02"]);
  });

  it("es idempotente: reaplicar no ejecuta nada", async () => {
    const migrations = makeTestMigrations();
    await migrateUp(db(), { migrations });
    const secondRun = await migrateUp(db(), { migrations });
    expect(secondRun).toEqual([]);

    // No se duplican los marcadores.
    const count = await db().collection(TEST_COLLECTION).countDocuments();
    expect(count).toBe(2);
  });

  it("status refleja aplicadas vs pendientes", async () => {
    const migrations = makeTestMigrations();
    await migrateUp(db(), { migrations: [migrations[0]!] });
    const status = await migrationStatus(db(), { migrations });
    expect(status.find((s) => s.id === "t01")?.applied).toBe(true);
    expect(status.find((s) => s.id === "t02")?.applied).toBe(false);
  });

  it("down revierte la última migración aplicada", async () => {
    const migrations = makeTestMigrations();
    await migrateUp(db(), { migrations });

    const reverted = await migrateDown(db(), { migrations, steps: 1 });
    expect(reverted).toEqual(["t02"]);

    const markers = await db().collection(TEST_COLLECTION).find().toArray();
    expect(markers.map((m) => m.step)).toEqual(["t01"]);

    const status = await migrationStatus(db(), { migrations });
    expect(status.find((s) => s.id === "t02")?.applied).toBe(false);
    expect(status.find((s) => s.id === "t01")?.applied).toBe(true);
  });

  it("la migración real crea índices únicos consistentes (id, clerkUserId)", async () => {
    await migrateUp(db()); // migraciones reales por defecto

    const landIndexes = await db().collection("lands").indexes();
    const idIdx = landIndexes.find((i) => i.key?.id === 1);
    expect(idIdx?.unique).toBe(true);

    const userIndexes = await db().collection("users").indexes();
    const clerkIdx = userIndexes.find((i) => i.key?.clerkUserId === 1);
    expect(clerkIdx?.unique).toBe(true);
  });
});
