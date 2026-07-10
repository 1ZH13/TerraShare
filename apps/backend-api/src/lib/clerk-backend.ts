import { createClerkClient, type ClerkClient } from "@clerk/backend";

import { env } from "../config/env";

/**
 * Perfil enriquecido que devuelve la Clerk Backend API.
 * Todos los campos son opcionales: el token de sesión por defecto de Clerk no
 * incluye email/nombre, así que los resolvemos aquí (issue #132, Opción B).
 *
 * El token tampoco incluye `public_metadata` ni el estado de 2FA, así que el rol
 * y `twoFactorEnabled` también se resuelven aquí; sin esto el backend nunca veía
 * como admin a un usuario que sí lo es en Clerk (issue #262).
 */
export interface ClerkUserProfile {
  email?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  twoFactorEnabled?: boolean;
}

interface CacheEntry {
  value: ClerkUserProfile | null;
  expiresAt: number;
}

// TTL de la caché: 5 minutos. Evita pegarle a la Clerk API en cada request.
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, CacheEntry>();

let client: ClerkClient | undefined;
let testClient: ClerkClient | undefined;

function getClient(): ClerkClient | undefined {
  if (testClient) {
    return testClient;
  }
  if (!env.clerkBackendConfigured || !env.clerkSecretKey) {
    return undefined;
  }
  if (!client) {
    client = createClerkClient({ secretKey: env.clerkSecretKey });
  }
  return client;
}

function readCache(userId: string): ClerkUserProfile | null | undefined {
  const entry = cache.get(userId);
  if (!entry) {
    return undefined;
  }
  if (entry.expiresAt <= Date.now()) {
    cache.delete(userId);
    return undefined;
  }
  return entry.value;
}

/**
 * Obtiene el perfil del usuario desde la Clerk Backend API usando el `sub` del
 * token. Devuelve `null` si Clerk no está configurado o si la llamada falla,
 * para degradar con elegancia sin romper la autenticación.
 */
export async function getClerkUserProfile(
  userId: string,
): Promise<ClerkUserProfile | null> {
  const cached = readCache(userId);
  if (cached !== undefined) {
    return cached;
  }

  const clerk = getClient();
  if (!clerk) {
    return null;
  }

  try {
    const user = await clerk.users.getUser(userId);
    const metadataRole = (user.publicMetadata as Record<string, unknown> | undefined)?.role;
    const profile: ClerkUserProfile = {
      email: user.primaryEmailAddress?.emailAddress ?? undefined,
      fullName: user.fullName?.trim() || undefined,
      phone: user.primaryPhoneNumber?.phoneNumber ?? undefined,
      role: typeof metadataRole === "string" ? metadataRole : undefined,
      twoFactorEnabled: user.twoFactorEnabled === true,
    };
    cache.set(userId, { value: profile, expiresAt: Date.now() + CACHE_TTL_MS });
    return profile;
  } catch {
    // No cacheamos los fallos: puede ser transitorio y no queremos quemar 5 min.
    return null;
  }
}

/** Limpia la caché en memoria (solo para tests). */
export function __clearClerkUserProfileCache(): void {
  cache.clear();
}

/** Inyecta un cliente Clerk falso y limpia la caché (solo para tests). */
export function __setClerkClientForTests(fake: ClerkClient | undefined): void {
  testClient = fake;
  cache.clear();
}
