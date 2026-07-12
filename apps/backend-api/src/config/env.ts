import { z } from "zod";

export const envSchema = z.object({
  API_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.string().default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  CLERK_JWKS_URL: z.string().url("CLERK_JWKS_URL must be a valid URL"),
  CLERK_ISSUER: z.string().min(1, "CLERK_ISSUER is required"),
  ALLOW_DEV_AUTH_BYPASS: z.string().optional(),
  REQUIRE_ADMIN_MFA: z.string().optional(),
  ADMIN_SEED_EMAIL: z.string().default("terradmin@gmail.com"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Comisión de plataforma en basis points (100 bps = 1%). Default 5%. (HU-41 #159)
  STRIPE_PLATFORM_FEE_BPS: z.coerce.number().int().min(0).max(10000).default(500),
  CLERK_SECRET_KEY: z.string().optional(),
  WHATSAPP_CONTACT_ENABLED: z.string().default("false"),
  FORCE_SEED: z.string().default("false"),
  // Respaldos cifrados de MongoDB (HU-56 #174). La clave (32 bytes en hex o
  // base64) se valida en el momento de uso, no al arrancar, para que la API
  // pueda iniciar aunque los respaldos no estén configurados todavía.
  BACKUP_ENCRYPTION_KEY: z.string().optional(),
  BACKUP_DIR: z.string().optional(),
});

const parsed = envSchema.parse(process.env);

const BASE_CORS_ALLOW_HEADERS = [
  "Content-Type",
  "Authorization",
  "x-request-id",
  "stripe-signature",
  "Idempotency-Key",
];

const DEV_CORS_ALLOW_HEADERS = ["x-dev-role", "x-dev-user-id"];

const LOCALHOST_PATTERN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const env = {
  apiPort: parsed.API_PORT,
  clerkJwksUrl: parsed.CLERK_JWKS_URL,
  clerkIssuer: parsed.CLERK_ISSUER,
  get allowDevAuthBypass() {
    const fallback = process.env.NODE_ENV !== "production" ? "true" : "false";
    return (process.env.ALLOW_DEV_AUTH_BYPASS ?? fallback) === "true";
  },
  /**
   * Exige 2FA para los endpoints de admin. En producción va activo por defecto;
   * fuera de producción se apaga salvo que se pida explícitamente, porque las
   * cuentas admin locales rara vez tienen 2FA configurado en Clerk (#262).
   */
  get requireAdminMfa() {
    const fallback = process.env.NODE_ENV === "production" ? "true" : "false";
    return (process.env.REQUIRE_ADMIN_MFA ?? fallback) === "true";
  },
  adminSeedEmail: parsed.ADMIN_SEED_EMAIL.toLowerCase(),
  clerkSecretKey: parsed.CLERK_SECRET_KEY,
  get clerkBackendConfigured() {
    return !!process.env.CLERK_SECRET_KEY;
  },
  stripeSecretKey: parsed.STRIPE_SECRET_KEY,
  stripeWebhookSecret: parsed.STRIPE_WEBHOOK_SECRET,
  platformFeeBps: parsed.STRIPE_PLATFORM_FEE_BPS,
  whatsappContactEnabled: parsed.WHATSAPP_CONTACT_ENABLED === "true",
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
  get corsAllowedOrigins(): string[] {
    const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
    return raw
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0);
  },
  get stripeConfigured() {
    return !!process.env.STRIPE_SECRET_KEY;
  },
  /** Clave de cifrado de respaldos (hex de 64 chars o base64 de 32 bytes). #174 */
  get backupEncryptionKey(): string | undefined {
    return process.env.BACKUP_ENCRYPTION_KEY;
  },
  /** Directorio donde se escriben los respaldos cifrados. #174 */
  get backupDir(): string {
    return process.env.BACKUP_DIR ?? "./backups";
  },
  get backupConfigured() {
    return !!process.env.BACKUP_ENCRYPTION_KEY;
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
