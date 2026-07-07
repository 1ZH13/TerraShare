import { z } from "zod";

export const envSchema = z.object({
  API_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CLERK_JWKS_URL: z.string().url("CLERK_JWKS_URL must be a valid URL"),
  CLERK_ISSUER: z.string().min(1, "CLERK_ISSUER is required"),
  ALLOW_DEV_AUTH_BYPASS: z.string().optional(),
  ADMIN_SEED_EMAIL: z.string().default("terradmin@gmail.com"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  WHATSAPP_CONTACT_ENABLED: z.string().default("false"),
  FORCE_SEED: z.string().default("false"),
});

const parsed = envSchema.parse(process.env);

export const env = {
  apiPort: parsed.API_PORT,
  clerkJwksUrl: parsed.CLERK_JWKS_URL,
  clerkIssuer: parsed.CLERK_ISSUER,
  get allowDevAuthBypass() {
    const fallback = parsed.NODE_ENV !== "production" ? "true" : "false";
    return (parsed.ALLOW_DEV_AUTH_BYPASS ?? fallback) === "true";
  },
  adminSeedEmail: parsed.ADMIN_SEED_EMAIL.toLowerCase(),
  stripeSecretKey: parsed.STRIPE_SECRET_KEY,
  stripeWebhookSecret: parsed.STRIPE_WEBHOOK_SECRET,
  whatsappContactEnabled: parsed.WHATSAPP_CONTACT_ENABLED === "true",
};
