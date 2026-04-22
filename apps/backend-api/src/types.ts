export type AppRole = "user" | "admin";

export type UserStatus = "active" | "blocked";

export interface AuthContextUser {
  id: string;
  clerkUserId: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  profile: {
    fullName: string;
    phone?: string;
  };
}

export interface AppVariables {
  requestId: string;
  authUser: AuthContextUser;
}

export interface AppEnv {
  Variables: AppVariables;
}

export interface Env {
  API_PORT?: string;
  API_BASE_URL?: string;
  MONGODB_URI?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_JWKS_URL?: string;
  CLERK_ISSUER?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  WHATSAPP_CONTACT_ENABLED?: string;
  ALLOW_DEV_AUTH_BYPASS?: string;
}
