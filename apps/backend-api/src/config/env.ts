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

const BASE_CORS_ALLOW_HEADERS = [
  "Content-Type",
  "Authorization",
  "x-request-id",
  "stripe-signature",
];

const DEV_CORS_ALLOW_HEADERS = ["x-dev-role", "x-dev-user-id"];

const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

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
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get corsAllowedOrigins(): string[] {
    const raw = getEnv("CORS_ALLOWED_ORIGINS") ?? "";
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  },
  get stripeConfigured() {
    return !!getEnv("STRIPE_SECRET_KEY");
  },
};

export function resolveCorsOrigin(origin: string): string | null {
  if (!origin) return null;
  if (env.corsAllowedOrigins.includes(origin)) return origin;
  if (!env.isProduction && LOCALHOST_PATTERN.test(origin)) return origin;
  return null;
}

export function corsAllowHeaders(): string[] {
  const headers = [...BASE_CORS_ALLOW_HEADERS];
  if (env.allowDevAuthBypass) {
    headers.push(...DEV_CORS_ALLOW_HEADERS);
  }
  return headers;
}
