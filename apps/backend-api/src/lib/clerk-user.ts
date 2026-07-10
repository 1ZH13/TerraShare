import type { JWTPayload } from "jose";

import { env } from "../config/env";
import { getClerkUserProfile } from "./clerk-backend";
import type { AppRole, AuthContextUser, UserStatus } from "../types";

type ClaimRecord = Record<string, unknown>;

/** Valores que devuelve el mapeo cuando el token no trae email/nombre. */
export const FALLBACK_EMAIL = "unknown@terrashare.local";
export const FALLBACK_NAME = "Usuario";

function readClaim(claims: ClaimRecord, key: string): unknown {
  return claims[key];
}

function readPublicMetadata(claims: ClaimRecord, key: string): unknown {
  const metadata = claims.public_metadata;
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }
  return (metadata as ClaimRecord)[key];
}

function mapRole(value: unknown): AppRole {
  if (value === "admin") return "admin";
  return "user";
}

function mapStatus(value: unknown): UserStatus {
  return value === "blocked" ? "blocked" : "active";
}

function mapFullName(claims: ClaimRecord): string {
  const directFullName = readClaim(claims, "full_name");
  if (typeof directFullName === "string" && directFullName.trim()) {
    return directFullName.trim();
  }

  const givenName = readClaim(claims, "given_name");
  const familyName = readClaim(claims, "family_name");
  const builtName = [givenName, familyName]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(" ")
    .trim();

  if (builtName) {
    return builtName;
  }

  const email = mapEmail(claims);
  if (email && email !== FALLBACK_EMAIL) {
    return email.split("@")[0] || FALLBACK_NAME;
  }

  return FALLBACK_NAME;
}

function mapEmail(claims: ClaimRecord): string {
  const directEmail = readClaim(claims, "email");
  if (typeof directEmail === "string" && directEmail.trim()) {
    return directEmail.trim();
  }

  const fallbackEmail = readClaim(claims, "email_address");
  if (typeof fallbackEmail === "string" && fallbackEmail.trim()) {
    return fallbackEmail.trim();
  }

  return FALLBACK_EMAIL;
}

function mapPhone(claims: ClaimRecord): string | undefined {
  const directPhone = readClaim(claims, "phone_number");
  if (typeof directPhone === "string" && directPhone.trim()) {
    return directPhone.trim();
  }

  const metadataPhone = readPublicMetadata(claims, "phone");
  if (typeof metadataPhone === "string" && metadataPhone.trim()) {
    return metadataPhone.trim();
  }

  return undefined;
}

export function mapClerkClaimsToAuthUser(payload: JWTPayload): AuthContextUser {
  const claims = payload as ClaimRecord;
  const clerkUserId = typeof claims.sub === "string" ? claims.sub : "unknown_sub";
  const email = mapEmail(claims).toLowerCase();
  const explicitRole = readClaim(claims, "role") ?? readPublicMetadata(claims, "role");
  const role = email === env.adminSeedEmail ? "admin" : mapRole(explicitRole);
  const status = mapStatus(readPublicMetadata(claims, "status"));
  const mfaVerified = readClaim(claims, "mfa_verified") === true;

  return {
    id: clerkUserId,
    clerkUserId,
    email,
    role,
    status,
    mfaVerified,
    profile: {
      fullName: mapFullName(claims),
      phone: mapPhone(claims),
    },
  };
}

/**
 * Igual que {@link mapClerkClaimsToAuthUser}, pero cuando el token no trae
 * `email`/`name`/`role` (caso del token de sesión por defecto de Clerk)
 * enriquece el usuario con un fetch a la Clerk Backend API usando el `sub`
 * (issues #132 y #262).
 *
 * El perfil obtenido se superpone sobre los claims y se re-mapea, de modo que
 * la lógica de rol (admin por email semilla o por `publicMetadata.role`) vuelve
 * a evaluarse con los datos reales. Si Clerk no está configurado o el fetch
 * falla, degrada al mapeo puro.
 */
export async function resolveClerkAuthUser(
  payload: JWTPayload,
): Promise<AuthContextUser> {
  const base = mapClerkClaimsToAuthUser(payload);
  const claims = payload as ClaimRecord;

  const needsEmail = base.email === FALLBACK_EMAIL;
  const needsName = base.profile.fullName === FALLBACK_NAME;
  // Sin claim de rol no podemos saber si es admin: el token de sesión por
  // defecto de Clerk no incluye `public_metadata` (#262).
  const hasRoleClaim =
    readClaim(claims, "role") !== undefined || readPublicMetadata(claims, "role") !== undefined;

  if (!needsEmail && !needsName && hasRoleClaim) {
    return base;
  }

  const profile = await getClerkUserProfile(base.clerkUserId);
  if (!profile) {
    return base;
  }

  const enrichedClaims: ClaimRecord = { ...claims };
  if (needsEmail && profile.email) {
    enrichedClaims.email = profile.email;
  }
  if (needsName && profile.fullName) {
    enrichedClaims.full_name = profile.fullName;
  }
  if (!base.profile.phone && profile.phone) {
    enrichedClaims.phone_number = profile.phone;
  }
  if (!hasRoleClaim && profile.role) {
    const metadata = (claims.public_metadata as ClaimRecord | undefined) ?? {};
    enrichedClaims.public_metadata = { ...metadata, role: profile.role };
  }
  // El 2FA real de Clerk sustituye al claim `mfa_verified`, que el token de
  // sesión tampoco emite: sin esto la exigencia de MFA para admins era inerte.
  if (readClaim(claims, "mfa_verified") === undefined && profile.twoFactorEnabled !== undefined) {
    enrichedClaims.mfa_verified = profile.twoFactorEnabled;
  }

  return mapClerkClaimsToAuthUser(enrichedClaims as JWTPayload);
}
