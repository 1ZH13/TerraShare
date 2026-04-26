import type { Env } from "../types";

function getEnv(name: keyof Env): string | undefined {
  return process.env[name];
}

function requireEnv(name: keyof Env): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  apiPort: Number(getEnv("API_PORT") ?? 3000),
  get clerkJwksUrl() {
    return requireEnv("CLERK_JWKS_URL");
  },
  get clerkIssuer() {
    return requireEnv("CLERK_ISSUER");
  },
  get allowDevAuthBypass() {
    const fallback = process.env.NODE_ENV !== "production" ? "true" : "false";
    return (getEnv("ALLOW_DEV_AUTH_BYPASS") ?? fallback) === "true";
  },
  get adminSeedEmail() {
    return (getEnv("ADMIN_SEED_EMAIL") ?? "terradmin@gmail.com").toLowerCase();
  },
  get stripeSecretKey() {
    return getEnv("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return getEnv("STRIPE_WEBHOOK_SECRET");
  },
  get whatsappContactEnabled() {
    return (getEnv("WHATSAPP_CONTACT_ENABLED") ?? "false") === "true";
  },
};
