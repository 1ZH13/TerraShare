export type AppRole = "user" | "admin";

export type UserStatus = "active" | "blocked";

/** Preferencia de lado del mercado en el modelo de cuenta única (#137). */
export type MarketPreference = "busco" | "ofrezco";

export interface AuthContextUser {
  id: string;
  clerkUserId: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  mfaVerified?: boolean;
  profile: {
    fullName: string;
    phone?: string;
    province?: string;
    marketPreference?: MarketPreference;
  };
}

export interface AppVariables {
  requestId: string;
  traceId: string;
  authUser: AuthContextUser;
}

export interface AppEnv {
  Variables: AppVariables;
}

export interface Env {
  API_PORT?: string;
  CLERK_JWKS_URL?: string;
  CLERK_ISSUER?: string;
  ALLOW_DEV_AUTH_BYPASS?: string;
  ADMIN_SEED_EMAIL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  WHATSAPP_CONTACT_ENABLED?: string;
  CORS_ALLOWED_ORIGINS?: string;
}
