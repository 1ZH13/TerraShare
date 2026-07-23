import { describe, expect, it } from "bun:test";
import { PANAMA_TERRITORIES, canonicalTerritory } from "./panama";
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
