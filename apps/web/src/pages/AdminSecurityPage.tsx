import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2, KeyRound, TriangleAlert } from "lucide-react";

import {
  getSecuritySettings,
  setRequireAdminMfa,
  type AdminSecuritySettingsDto,
} from "../services/adminApi";
import "./admin.css";

/**
 * Panel de seguridad (#362).
 *
 * La exigencia de 2FA para administradores existía desde HU-37, pero solo se
 * gobernaba con la variable `REQUIRE_ADMIN_MFA` y ninguna pantalla decía si
 * estaba activa: quien se topaba con el 403 `MFA_REQUIRED` no tenía forma de
 * saber por qué ni de quitarlo. Esta pantalla lo muestra, lo explica y permite
 * cambiarlo sin reiniciar el servicio.
 */
export default function AdminSecurityPage() {
  const [settings, setSettings] = useState<AdminSecuritySettingsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSecuritySettings()
      .then((res) => {
        if (active) setSettings(res.data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggle = async () => {
    if (!settings || saving) return;

    // Activarla sin 2FA en la propia cuenta cierra el resto del panel al
    // instante. El aviso de abajo solo salía DESPUÉS de encerrarse; aquí se
    // avisa antes, que es cuando sirve de algo (#394).
    if (!settings.requireAdminMfa && !settings.callerMfaEnabled) {
      const go = window.confirm(
        "Tu cuenta no tiene 2FA configurada.\n\n" +
          "Si activas la exigencia ahora, el resto del panel dejará de responderte " +
          "hasta que la configures. Podrás volver aquí para desactivarla.\n\n" +
          "¿Activarla de todos modos?",
      );
      if (!go) return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await setRequireAdminMfa(!settings.requireAdminMfa);
      setSettings(res.data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const required = settings?.requireAdminMfa ?? false;
  // Encenderla sin 2FA en la propia cuenta cierra el resto del panel. Esta
  // pantalla sigue accesible a propósito, para poder desandarlo.
  const wouldLockOut = required && settings?.callerMfaEnabled === false;

  return (
    <div className="adm-page">
      <h1 className="adm-title">Seguridad</h1>
      <p className="adm-sub">Controles de acceso al panel de administración.</p>

      {error ? <div className="adm-empty adm-empty--error">{error}</div> : null}

      {loading ? (
        <div className="adm-empty">Cargando ajustes de seguridad…</div>
      ) : !settings ? (
        <div className="adm-empty">No se pudieron cargar los ajustes.</div>
      ) : (
        <div className="adm-sec">
          <section className="adm-panel">
            <div className="adm-sec__head">
              <span className={`adm-sec__icon ${required ? "is-on" : "is-off"}`}>
                {required ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
              </span>
              <div>
                <h2 className="adm-panel__title">Exigir 2FA a los administradores</h2>
                <p className="adm-sec__text">
                  Con la exigencia activa, cualquier cuenta con rol admin necesita verificación
                  en dos pasos configurada en Clerk para usar el panel. Sin ella, la API responde{" "}
                  <code>403 MFA_REQUIRED</code> en todas las rutas <code>/admin/*</code>.
                </p>
              </div>
            </div>

            <div className="adm-sec__row">
              <div className="adm-sec__state">
                <span className={`adm-badge ${required ? "adm-badge--green" : "adm-badge--muted"}`}>
                  {required ? "Exigida" : "No exigida"}
                </span>
                <span className="adm-sec__origin">
                  {settings.source === "stored"
                    ? "Fijado desde este panel."
                    : `Valor por defecto del entorno (REQUIRE_ADMIN_MFA = ${settings.environmentDefault}).`}
                </span>
              </div>

              <button
                type="button"
                className={`adm-pill ${required ? "" : "adm-pill--cta"}`}
                onClick={toggle}
                disabled={saving}
              >
                {saving ? <Loader2 size={15} className="adm-spin" /> : null}
                {required ? "Desactivar" : "Activar"}
              </button>
            </div>

            {!required && settings.callerMfaEnabled === false ? (
              <p className="adm-sec__warn">
                <TriangleAlert size={16} />
                <span>
                  Tu cuenta no tiene 2FA configurada. Si activas la exigencia ahora, el resto
                  del panel dejará de responderte hasta que la configures. Podrás volver aquí
                  para desactivarla.
                </span>
              </p>
            ) : null}

            {wouldLockOut ? (
              <p className="adm-sec__warn">
                <TriangleAlert size={16} />
                <span>
                  Tu cuenta no tiene 2FA configurada, así que el resto del panel te está
                  rechazando. Esta pantalla sigue accesible para que puedas desactivar la
                  exigencia o configurar la 2FA en tu perfil.
                </span>
              </p>
            ) : null}
          </section>

          <section className="adm-panel">
            <div className="adm-sec__head">
              <span className={`adm-sec__icon ${settings.callerMfaEnabled ? "is-on" : "is-off"}`}>
                <KeyRound size={20} />
              </span>
              <div>
                <h2 className="adm-panel__title">Tu cuenta</h2>
                <p className="adm-sec__text">
                  {settings.callerMfaEnabled
                    ? "Tienes la verificación en dos pasos activa en Clerk."
                    : "No tienes verificación en dos pasos activa en Clerk."}
                </p>
              </div>
            </div>

            {!settings.callerMfaEnabled ? (
              <ol className="adm-sec__steps">
                <li>Abre <strong>Mi perfil</strong> y entra a tu cuenta de Clerk.</li>
                <li>En <strong>Security</strong>, añade un método en dos pasos (app de códigos o SMS).</li>
                {/* El dato no viaja en el token: el backend lo pregunta a Clerk y
                    guarda la respuesta 5 minutos. Reiniciar sesión no vacía esa
                    caché, así que decirlo era engañoso (#406). */}
                <li>Espera unos minutos: el servidor recuerda tu perfil de Clerk hasta 5 minutos.</li>
              </ol>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
