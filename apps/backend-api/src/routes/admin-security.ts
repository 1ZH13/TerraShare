import { Hono } from "hono";

import { failure, success } from "../lib/api-response";
import { requireAuth, requireAdminRoleOnly } from "../middleware/require-auth";
import { getAdminMfaSetting, setAdminMfaRequired } from "../lib/security-settings";
import { createAuditEvent as createAudit } from "../store/audit";
import type { AppEnv } from "../types";

export const adminSecurityRoutes = new Hono<AppEnv>();

/**
 * Panel de seguridad (#362).
 *
 * Estas dos rutas usan `requireAdminRoleOnly` **a propósito**: son la salida de
 * emergencia. Si se exige 2FA y el admin no la tiene configurada en Clerk,
 * `requireAdmin` le devuelve 403 en todo `/admin/*`; si eso incluyera esta
 * pantalla, encender el interruptor sin 2FA dejaría la cuenta encerrada fuera
 * de su propio panel, sin forma de volver atrás salvo editando la base a mano.
 */

adminSecurityRoutes.get("/admin/security-settings", requireAuth, requireAdminRoleOnly, async (c) => {
  const authUser = c.get("authUser");
  const setting = await getAdminMfaSetting();

  return success(c, {
    ...setting,
    /** Si la cuenta que pregunta tiene 2FA activa en Clerk. */
    callerMfaEnabled: authUser.mfaVerified === true,
  });
});

adminSecurityRoutes.patch("/admin/security-settings", requireAuth, requireAdminRoleOnly, async (c) => {
  const authUser = c.get("authUser");
  const body: { requireAdminMfa?: unknown } = await c.req
    .json<{ requireAdminMfa?: unknown }>()
    .catch(() => ({}));

  if (typeof body.requireAdminMfa !== "boolean") {
    return failure(c, 400, "VALIDATION_ERROR", "requireAdminMfa must be a boolean");
  }

  const setting = await setAdminMfaRequired(body.requireAdminMfa);

  // Cambiar quién puede entrar al panel es justo lo que una bitácora debe
  // registrar, así que queda en auditoría con el valor nuevo.
  await createAudit({
    actor: authUser,
    entity: "user",
    action: "status_changed",
    entityId: "security.requireAdminMfa",
    metadata: { requireAdminMfa: setting.requireAdminMfa },
  });

  return success(c, {
    ...setting,
    callerMfaEnabled: authUser.mfaVerified === true,
  });
});
