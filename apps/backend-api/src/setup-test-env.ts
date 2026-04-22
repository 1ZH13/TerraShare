process.env.ALLOW_DEV_AUTH_BYPASS = "true";
process.env.CLERK_JWKS_URL = process.env.CLERK_JWKS_URL ?? "https://example.test/.well-known/jwks.json";
process.env.CLERK_ISSUER = process.env.CLERK_ISSUER ?? "https://example.test";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_placeholder";
process.env.WHATSAPP_CONTACT_ENABLED = process.env.WHATSAPP_CONTACT_ENABLED ?? "false";
