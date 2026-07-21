/**
 * Ajustes de seguridad que se pueden cambiar en caliente (#362).
 *
 * Hasta ahora la exigencia de 2FA a los administradores solo se controlaba con
 * la variable `REQUIRE_ADMIN_MFA`, así que para cambiarla había que tocar el
 * entorno y reiniciar, y ninguna pantalla decía si estaba activa. El resultado
 * práctico era un 403 `MFA_REQUIRED` sin explicación y sin forma de quitarlo.
 *
 * Ahora el valor vive en Mongo y la variable de entorno queda como valor por
 * defecto para cuando nadie lo ha tocado todavía.
 */
import { AppSetting } from "../db/schemas";
import { env } from "../config/env";

export const REQUIRE_ADMIN_MFA_KEY = "security.requireAdminMfa";

/** De dónde sale el valor que está en vigor. */
export type SettingSource = "stored" | "environment";

export interface AdminMfaSetting {
  requireAdminMfa: boolean;
  source: SettingSource;
  /** Valor por defecto del entorno, para poder explicarlo en la interfaz. */
  environmentDefault: boolean;
}

/**
 * Caché breve: `requireAdmin` corre en cada petición a `/admin/*` y no merece
 * una lectura a Mongo por cada una. 10 s hace que un cambio desde el panel se
 * note casi al momento sin castigar el camino caliente.
 */
const CACHE_TTL_MS = 10_000;
let cached: { value: AdminMfaSetting; at: number } | null = null;

/** Vacía la caché. Se llama al guardar, y desde los tests. */
export function invalidateSecuritySettingsCache(): void {
  cached = null;
}

async function readStoredValue(): Promise<boolean | null> {
  try {
    const doc = await AppSetting.findOne({ key: REQUIRE_ADMIN_MFA_KEY }).lean();
    if (!doc) return null;
    return (doc as { value?: unknown }).value === true;
  } catch {
    // Si Mongo no responde, se cae al valor del entorno en vez de romper la
    // autorización: es preferible un fallo de configuración a un 500.
    return null;
  }
}

/** Ajuste en vigor, con su procedencia. */
export async function getAdminMfaSetting(): Promise<AdminMfaSetting> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  const stored = await readStoredValue();
  const value: AdminMfaSetting = stored === null
    ? { requireAdminMfa: env.requireAdminMfa, source: "environment", environmentDefault: env.requireAdminMfa }
    : { requireAdminMfa: stored, source: "stored", environmentDefault: env.requireAdminMfa };

  cached = { value, at: now };
  return value;
}

/** Atajo para el middleware: solo el booleano en vigor. */
export async function isAdminMfaRequired(): Promise<boolean> {
  return (await getAdminMfaSetting()).requireAdminMfa;
}

/** Guarda el ajuste y devuelve el estado resultante. */
export async function setAdminMfaRequired(required: boolean): Promise<AdminMfaSetting> {
  await AppSetting.updateOne(
    { key: REQUIRE_ADMIN_MFA_KEY },
    { $set: { key: REQUIRE_ADMIN_MFA_KEY, value: required } },
    { upsert: true },
  );
  invalidateSecuritySettingsCache();
  return getAdminMfaSetting();
}
