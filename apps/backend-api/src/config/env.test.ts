import { describe, expect, it } from "bun:test";

import { envSchema } from "../config/env";

describe("env validation", () => {
  it("lanza error si falta CLERK_JWKS_URL", () => {
    expect(() =>
      envSchema.parse({
        MONGODB_URI: "mongodb://localhost:27017/test",
        CLERK_ISSUER: "https://example.test",
      }),
    ).toThrow();
  });

  it("lanza error si MONGODB_URI es string vacío", () => {
    expect(() =>
      envSchema.parse({
        MONGODB_URI: "",
        CLERK_JWKS_URL: "https://example.test/.well-known/jwks.json",
        CLERK_ISSUER: "https://example.test",
      }),
    ).toThrow();
  });

  it("accepta env válido mínimo", () => {
    const result = envSchema.parse({
      MONGODB_URI: "mongodb://localhost:27017/test",
      CLERK_JWKS_URL: "https://example.test/.well-known/jwks.json",
      CLERK_ISSUER: "https://example.test",
    });
    expect(result.MONGODB_URI).toBe("mongodb://localhost:27017/test");
    expect(result.API_PORT).toBe(3000); // default
  });

  it("usa defaults para vars opcionales", () => {
    const result = envSchema.parse({
      MONGODB_URI: "mongodb://localhost:27017/test",
      CLERK_JWKS_URL: "https://example.test/.well-known/jwks.json",
      CLERK_ISSUER: "https://example.test",
    });
    expect(result.ALLOW_DEV_AUTH_BYPASS).toBeUndefined();
    expect(result.WHATSAPP_CONTACT_ENABLED).toBe("false");
    expect(result.ADMIN_SEED_EMAIL).toBe("terradmin@gmail.com");
  });

  it("allowDevAuthBypass es true en desarrollo por defecto", () => {
    const { env } = require("../config/env");
    expect(env.allowDevAuthBypass).toBe(true);
  });

  it("STRIPE_SECRET_KEY es opcional", () => {
    const result = envSchema.parse({
      MONGODB_URI: "mongodb://localhost:27017/test",
      CLERK_JWKS_URL: "https://example.test/.well-known/jwks.json",
      CLERK_ISSUER: "https://example.test",
    });
    expect(result.STRIPE_SECRET_KEY).toBeUndefined();
  });
});
