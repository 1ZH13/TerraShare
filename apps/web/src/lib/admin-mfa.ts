import type { AdminSecuritySettingsDto } from "../services/adminApi";

/**
 * Si la cuenta que pregunta está encerrada fuera del panel por la exigencia de
 * 2FA (#394).
 *
 * Se cumple cuando la exigencia está activa y el token de quien mira no trae la
 * 2FA verificada: entonces `requireAdmin` responde 403 `MFA_REQUIRED` en todas
 * las rutas `/admin/*` salvo la de ajustes de seguridad, que es la salida de
 * emergencia. Quien se lo encuentra ve todas las pantallas vacías sin que nada
 * le diga por qué ni dónde se arregla.
 *
 * Vive aparte para poder comprobarla sin montar el panel entero.
 */
export const isMfaLockout = (
  settings: Pick<AdminSecuritySettingsDto, "requireAdminMfa" | "callerMfaEnabled"> | null | undefined,
): boolean => settings?.requireAdminMfa === true && settings.callerMfaEnabled === false;
