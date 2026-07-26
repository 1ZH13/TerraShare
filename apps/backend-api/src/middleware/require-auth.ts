import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";

import { env } from "../config/env";
import { failure } from "../lib/api-response";
import type { AuthContextUser } from "../types";
import { resolveClerkAuthUser } from "../lib/clerk-user";
import { getStore } from "../store/in-memory-db";
import { isAdminMfaRequired } from "../lib/security-settings";
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

    // Hidrata el perfil persistido en Mongo de vuelta al usuario en memoria. El
    // token de Clerk NO trae teléfono, provincia ni preferencia Busco/Ofrezco, así
    // que sin esto `/auth/me` (y cualquier consumidor de `authUser`) los ve vacíos
    // aunque el usuario los guardó en el onboarding o el seed los puso (#460).
    // Mongo es la fuente de verdad de esos campos; solo rellenamos los ausentes en
    // memoria, sin pisar `fullName`/`email` que sí vienen frescos de Clerk.
    const persisted = await User.findOne({ clerkUserId: user.clerkUserId })
      .select("profile")
      .lean();
    const p = persisted?.profile as
      | { phone?: string; province?: string; marketPreference?: "busco" | "ofrezco" }
      | undefined;
    if (p) {
      const profile = { ...user.profile };
      if (profile.phone === undefined && p.phone !== undefined) profile.phone = p.phone;
      if (profile.province === undefined && p.province !== undefined) profile.province = p.province;
      if (profile.marketPreference === undefined && p.marketPreference !== undefined) {
        profile.marketPreference = p.marketPreference;
      }
      user.profile = profile;
      getStore().users.set(user.id, user);
    }
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

export function upsertAuthUser(authUser: AuthContextUser) {
  const store = getStore();
  const existing = store.users.get(authUser.id);

  if (!existing) {
    store.users.set(authUser.id, authUser);
    return authUser;
  }

  // Un claim ausente llega como `undefined`; si lo dejáramos entrar en el spread
  // pisaría lo que el usuario guardó. El token de Clerk no trae teléfono,
  // provincia ni preferencia Busco/Ofrezco, así que para esos campos la fuente de
  // verdad es el store/Mongo, no los claims: filtramos las claves `undefined`
  // antes de fusionar para no borrar el perfil en cada petición (#426).
  const incomingProfile = Object.fromEntries(
    Object.entries(authUser.profile).filter(([, value]) => value !== undefined),
  ) as Partial<AuthContextUser["profile"]>;

  const merged: AuthContextUser = {
    ...existing,
    ...authUser,
    profile: {
      ...existing.profile,
      ...incomingProfile,
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

/**
 * Solo comprueba el rol, **sin** la exigencia de 2FA.
 *
 * Es la salida de emergencia del panel de seguridad (#362): si la exigencia
 * está activa y el admin no tiene 2FA en su cuenta, todas las rutas `/admin/*`
 * le responden 403 — incluida la que serviría para desactivarla. Sin esta
 * excepción, encender el interruptor sin 2FA configurado deja la cuenta fuera
 * de su propio panel y solo se puede arreglar tocando la base a mano.
 */
export const requireAdminRoleOnly: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authUser = c.get("authUser");
  if (!authUser || authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Admin role required");
  }
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authUser = c.get("authUser");
  if (!authUser || authUser.role !== "admin") {
    return failure(c, 403, "FORBIDDEN", "Admin role required");
  }

  const hasDevHeader = Boolean(c.req.header("x-dev-user-id") || c.req.header("x-dev-role"));
  const isDevBypass = hasDevHeader && env.allowDevAuthBypass;
  // El ajuste guardado manda sobre `REQUIRE_ADMIN_MFA`, para poder cambiarlo
  // desde el panel sin reiniciar el servicio.
  if (!isDevBypass && (await isAdminMfaRequired()) && authUser.mfaVerified !== true) {
    return failure(c, 403, "MFA_REQUIRED", "Admin must have MFA enabled");
  }

  await next();
};