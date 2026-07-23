import { describe, expect, it } from "bun:test";
import { accentInsensitiveRegex, escapeRegex } from "./text-search";

describe("accentInsensitiveRegex", () => {
  it("encuentra el dato con tilde escribiendo sin ella (#392)", () => {
    // El caso reportado: «Chiriqui» devolvía 0 y «Chiriquí» devolvía 3.
    expect(accentInsensitiveRegex("Chiriqui", { exact: true }).test("Chiriquí")).toBe(true);
    expect(accentInsensitiveRegex("Cocle", { exact: true }).test("Coclé")).toBe(true);
    expect(accentInsensitiveRegex("Darien", { exact: true }).test("Darién")).toBe(true);
    expect(accentInsensitiveRegex("Panama Oeste", { exact: true }).test("Panamá Oeste")).toBe(true);
  });

  it("funciona también al revés: con tilde encuentra el dato sin ella", () => {
    // Los terrenos viejos se guardaron como «Cocle» antes de normalizarse.
    expect(accentInsensitiveRegex("Coclé", { exact: true }).test("Cocle")).toBe(true);
  });

  it("sigue ignorando mayúsculas", () => {
    expect(accentInsensitiveRegex("CHIRIQUI", { exact: true }).test("Chiriquí")).toBe(true);
    expect(accentInsensitiveRegex("chiriquí", { exact: true }).test("CHIRIQUI")).toBe(true);
  });

  it("cubre la eñe, que aparece en varios distritos", () => {
    expect(accentInsensitiveRegex("Canazas", { exact: true }).test("Cañazas")).toBe(true);
    expect(accentInsensitiveRegex("Ngabe-Bugle", { exact: true }).test("Ngäbe-Buglé")).toBe(true);
  });

  it("no ensancha la búsqueda más de la cuenta", () => {
    // Tolerar tildes no debe convertir la búsqueda en un comodín.
    expect(accentInsensitiveRegex("Cocle", { exact: true }).test("Colón")).toBe(false);
    expect(accentInsensitiveRegex("Herrera", { exact: true }).test("Veraguas")).toBe(false);
  });

  it("busca subcadenas cuando no se pide coincidencia exacta", () => {
    expect(accentInsensitiveRegex("boque").test("Finca en Boquete")).toBe(true);
    expect(accentInsensitiveRegex("panama").test("Vista a Panamá Oeste")).toBe(true);
    expect(accentInsensitiveRegex("xyz").test("Finca en Boquete")).toBe(false);
  });

  it("trata los caracteres especiales como texto, no como patrón", () => {
    // Sin escapar, un «.» buscado por el usuario emparejaría cualquier cosa.
    expect(accentInsensitiveRegex("a.c", { exact: true }).test("abc")).toBe(false);
    expect(accentInsensitiveRegex("a.c", { exact: true }).test("a.c")).toBe(true);
    expect(accentInsensitiveRegex("(", { exact: true }).test("(")).toBe(true);
  });

  it("ignora los espacios de sobra en el término", () => {
    expect(accentInsensitiveRegex("  Chiriqui  ", { exact: true }).test("Chiriquí")).toBe(true);
  });
});

describe("escapeRegex", () => {
  it("neutraliza los caracteres con significado", () => {
    expect(escapeRegex("a+b")).toBe("a\\+b");
    expect(escapeRegex("[x]")).toBe("\\[x\\]");
  });
});
