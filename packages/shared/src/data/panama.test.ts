import { describe, expect, it } from "bun:test";
import {
  PANAMA_DISTRICTS,
  PANAMA_TERRITORIES,
  canonicalTerritory,
  districtsOf,
} from "./panama";
import { CreateLandSchema } from "../schemas/lands";

describe("canonicalTerritory", () => {
  it("acepta el nombre oficial tal cual", () => {
    expect(canonicalTerritory("Chiriquí")).toBe("Chiriquí");
    expect(canonicalTerritory("Panamá Oeste")).toBe("Panamá Oeste");
  });

  it("normaliza lo escrito sin tildes, en minúsculas o con espacios de sobra", () => {
    // Quien teclea desde un móvil no debería quedarse sin publicar.
    expect(canonicalTerritory("chiriqui")).toBe("Chiriquí");
    expect(canonicalTerritory("PANAMA OESTE")).toBe("Panamá Oeste");
    expect(canonicalTerritory("  cocle  ")).toBe("Coclé");
  });

  it("incluye Panamá Oeste y las comarcas, que faltaban (#391)", () => {
    expect(PANAMA_TERRITORIES).toContain("Panamá Oeste");
    expect(canonicalTerritory("Guna Yala")).toBe("Guna Yala");
    expect(canonicalTerritory("Ngäbe-Buglé")).toBe("Ngäbe-Buglé");
  });

  it("rechaza lo que no existe", () => {
    // Los tres valores reales que entraron en producción por el texto libre.
    expect(canonicalTerritory("f")).toBeUndefined();
    expect(canonicalTerritory("fffff")).toBeUndefined();
    expect(canonicalTerritory("fsfasfsfs")).toBeUndefined();
    expect(canonicalTerritory("")).toBeUndefined();
    expect(canonicalTerritory(null)).toBeUndefined();
  });
});

describe("CreateLandSchema · provincia", () => {
  const base = {
    title: "Finca de prueba",
    area: 1,
    allowedUses: ["ganaderia" as const],
    priceRule: { currency: "USD" as const, pricePerMonth: 10 },
  };

  it("rechaza una provincia inventada (#391)", () => {
    const res = CreateLandSchema.safeParse({
      ...base,
      location: { province: "fffff", district: "Guararé" },
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toBe("Provincia no reconocida");
    }
  });

  it("guarda la forma canónica aunque se escriba sin tilde", () => {
    const res = CreateLandSchema.safeParse({
      ...base,
      location: { province: "los santos", district: "Guararé" },
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.location.province).toBe("Los Santos");
    }
  });
});

describe("PANAMA_DISTRICTS", () => {
  it("cubre los 14 territorios, cada uno con al menos un distrito", () => {
    for (const t of PANAMA_TERRITORIES) {
      expect(PANAMA_DISTRICTS[t]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("suma un número de distritos cercano al oficial (~82)", () => {
    // Salvaguarda contra un borrado accidental de media lista: el país tiene
    // ~82 distritos (IGN 2024). No se fija el número exacto porque las comarcas
    // se cuentan de forma irregular y por eso el formulario ofrece «Otro».
    const total = Object.values(PANAMA_DISTRICTS).reduce((n, ds) => n + ds.length, 0);
    expect(total).toBeGreaterThanOrEqual(80);
    expect(total).toBeLessThanOrEqual(90);
  });

  it("no repite distritos dentro de una misma provincia", () => {
    for (const ds of Object.values(PANAMA_DISTRICTS)) {
      expect(new Set(ds).size).toBe(ds.length);
    }
  });
});

describe("districtsOf", () => {
  it("devuelve los distritos del territorio, tolerando tildes y mayúsculas", () => {
    expect(districtsOf("Los Santos")).toContain("Guararé");
    expect(districtsOf("los santos")).toContain("Guararé"); // sin mayúscula inicial
    expect(districtsOf("chiriqui")).toContain("Boquete"); // sin tilde
  });

  it("devuelve lista vacía para lo desconocido o vacío", () => {
    expect(districtsOf("fffff")).toEqual([]);
    expect(districtsOf("")).toEqual([]);
    expect(districtsOf(null)).toEqual([]);
  });
});
