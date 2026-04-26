import type { JWTPayload } from "jose";

import { env } from "../config/env";
import type { AppRole, AuthContextUser, UserStatus } from "../types";

type ClaimRecord = Record<string, unknown>;

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
  if (email) {
    return email.split("@")[0] || "Usuario";
  }

  return "Usuario";
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

  return "unknown@terrashare.local";
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

  return {
    id: clerkUserId,
    clerkUserId,
    email,
    role,
    status,
    profile: {
      fullName: mapFullName(claims),
      phone: mapPhone(claims),
    },
  };
}
