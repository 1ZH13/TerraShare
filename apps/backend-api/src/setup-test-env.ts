process.env.ALLOW_DEV_AUTH_BYPASS = "true";
process.env.CLERK_JWKS_URL = process.env.CLERK_JWKS_URL ?? "https://example.test/.well-known/jwks.json";
process.env.CLERK_ISSUER = process.env.CLERK_ISSUER ?? "https://example.test";
