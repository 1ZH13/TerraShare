import { afterEach, describe, expect, it } from "bun:test";

import { verifyApiKey } from "./auth";

describe("verifyApiKey (#234)", () => {
  const original = process.env.MCP_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.MCP_API_KEY;
    else process.env.MCP_API_KEY = original;
  });

  it("permite el acceso cuando no hay API key configurada (stdio local)", () => {
    delete process.env.MCP_API_KEY;
    expect(verifyApiKey(undefined)).toBe(true);
    expect(verifyApiKey("cualquiera")).toBe(true);
  });

  it("exige coincidencia exacta cuando hay API key configurada", () => {
    process.env.MCP_API_KEY = "secreto-123";
    expect(verifyApiKey("secreto-123")).toBe(true);
    expect(verifyApiKey("otro")).toBe(false);
    expect(verifyApiKey(undefined)).toBe(false);
  });
});
