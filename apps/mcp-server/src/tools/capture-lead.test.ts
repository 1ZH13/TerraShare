import { describe, expect, it } from "bun:test";
import { captureLead } from "./capture-lead";

describe("capture_lead tool (HU-88 #203)", () => {
  it("captura un nuevo lead correctamente", async () => {
    const result = await captureLead({
      email: "nuevo@example.com",
      source: "landing",
    });
    expect(result).toBeDefined();
    expect((result as { email: string }).email).toBe("nuevo@example.com");
    expect((result as { source: string }).source).toBe("landing");
    expect((result as { id: string }).id).toBeDefined();
  });

  it("captura lead con source app-web", async () => {
    const result = await captureLead({
      email: "app@example.com",
      source: "app-web",
    });
    expect((result as { source: string }).source).toBe("app-web");
  });

  it("lanza error si el email ya existe", async () => {
    await expect(
      captureLead({
        email: "dup@example.com",
        source: "app-web",
      })
    ).rejects.toThrow("Ya existe un lead con este email");
  });

  it("lanza error si el email es inválido", async () => {
    await expect(
      captureLead({
        email: "invalid-email",
        source: "landing",
      })
    ).rejects.toThrow();
  });

  it("no expone campos internos de Mongo", async () => {
    const result = await captureLead({
      email: "test2@example.com",
      source: "landing",
    });
    const lead = result as Record<string, unknown>;
    expect(lead).not.toHaveProperty("_id");
    expect(lead).not.toHaveProperty("__v");
  });

  it("asigna createdAt automáticamente", async () => {
    const before = new Date().toISOString();
    const result = await captureLead({
      email: "test3@example.com",
      source: "landing",
    });
    const createdAt = (result as { createdAt: Date }).createdAt;
    expect(new Date(createdAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
  });
});
