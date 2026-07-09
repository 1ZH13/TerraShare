import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";

import { env } from "../config/env";
import { failure } from "../lib/api-response";
import type { AuthContextUser } from "../types";
import { resolveClerkAuthUser } from "../lib/clerk-user";
import { getStore } from "../store/in-memory-db";
import { User } from "../db/schemas";
import type { AppEnv } from "../types";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

// Usuarios ya sincronizados a Mongo en este proceso: evita un write por request.
const mongoSyncedUsers = new Set<string>();

/**
 * Asegura que el usuario autenticado por Clerk exista en la colección `users`
 * de Mongo para que aparezca en el panel admin (#137, D-4). Usa $setOnInsert
 * para no pisar datos de onboarding (provincia/preferencia) en logins futuros.
 */
export async function ensureUserInMongo(user: AuthContextUser): Promise<void> {
  if (mongoSyncedUsers.has(user.clerkUserId)) return;
  mongoSyncedUsers.add(user.clerkUserId);
  try {
    await User.updateOne(
      { clerkUserId: user.clerkUserId },
      {
        $setOnInsert: {
          clerkUserId: user.clerkUserId,
          email: user.email,
          role: user.role,
          status: user.status,
          profile: { fullName: user.profile.fullName, phone: user.profile.phone },
        },
      },
      { upsert: true },
    );
  } catch {
    // No romper la auth si Mongo falla; se reintenta en el próximo proceso.
    mongoSyncedUsers.delete(user.clerkUserId);
  }
}

/** Limpia la caché de sincronización a Mongo (solo para tests). */
export function __resetMongoUserSync(): void {
  mongoSyncedUsers.clear();
}

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(env.clerkJwksUrl));
  }
  return jwks;
}

function getBearerToken(authorizationHeader: string | undefined): string | undefined {
  if (!authorizationHeader) {
    return undefined;
  }
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return undefined;
  }
  return token;
}

function upsertAuthUser(authUser: AuthContextUser) {
  const store = getStore();
  const existing = store.users.get(authUser.id);

  if (!existing) {
    store.users.set(authUser.id, authUser);
    return authUser;
  }

  const merged: AuthContextUser = {
    ...existing,
    ...authUser,
    profile: {
      ...existing.profile,
      ...authUser.profile,
    },
    role: authUser.role === "admin" ? "admin" : existing.role,
    status: existing.status,
  };

  store.users.set(authUser.id, merged);
  return merged;
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const roleHeader = c.req.header("x-dev-role");
  const userIdHeader = c.req.header("x-dev-user-id");
  if ((roleHeader || userIdHeader) && env.allowDevAuthBypass) {
    const devUser: AuthContextUser = {
      id: userIdHeader ?? "dev_user",
      clerkUserId: userIdHeader ?? "dev_user",
      email: "dev@example.com",
      role: (roleHeader === "admin" ? "admin" : "user") as "user" | "admin",
      status: "active",
      profile: { fullName: "Developer" },
    };

    const persistedDevUser = upsertAuthUser(devUser);
    if (persistedDevUser.status !== "active") {
      return failure(c, 403, "FORBIDDEN", "User is blocked");
    }

    c.set("authUser", persistedDevUser);
    await next();
    return;
  }

  const token = getBearerToken(c.req.header("authorization"));
  if (!token) {
    return failure(c, 401, "UNAUTHORIZED", "Missing or invalid bearer token");
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: env.clerkIssuer,
      algorithms: ["RS256"],
    });

    const authUser = await resolveClerkAuthUser(payload);
    const persistedUser = upsertAuthUser(authUser);

    if (persistedUser.status !== "active") {
      return failure(c, 403, "FORBIDDEN", "User is blocked");
    }

    // D-4: registrar al usuario real de Clerk en Mongo (aparece en admin).
    await ensureUserInMongo(persistedUser);

    c.set("authUser", persistedUser);
    await next();
  } catch {
    return failure(c, 401, "UNAUTHORIZED", "Invalid or expired token");
  }
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authUser = c.get("authUser");
  if (!authUser || authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Admin role required");
  }

  const isDevBypass = Boolean(c.req.header("x-dev-user-id") && env.allowDevAuthBypass);
  if (!isDevBypass && authUser.mfaVerified !== true) {
    return failure(c, 403, "MFA_REQUIRED", "Admin must have MFA enabled");
  }

  await next();
};