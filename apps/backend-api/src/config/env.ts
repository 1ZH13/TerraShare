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
  apiBaseUrl: getEnv("API_BASE_URL") ?? "http://localhost:3000",
  mongodbUri: getEnv("MONGODB_URI") ?? "mongodb://localhost:27017/terrashare",
  get clerkSecretKey() {
    return getEnv("CLERK_SECRET_KEY");
  },
  get clerkJwksUrl() {
    return requireEnv("CLERK_JWKS_URL");
  },
  get clerkIssuer() {
    return requireEnv("CLERK_ISSUER");
  },
  get stripeSecretKey() {
    return getEnv("STRIPE_SECRET_KEY");
  },
  get stripeWebhookSecret() {
    return getEnv("STRIPE_WEBHOOK_SECRET");
  },
  get whatsappContactEnabled() {
    return (getEnv("WHATSAPP_CONTACT_ENABLED") ?? "true") === "true";
  },
  get allowDevAuthBypass() {
    return (getEnv("ALLOW_DEV_AUTH_BYPASS") ?? "false") === "true";
  },
};
