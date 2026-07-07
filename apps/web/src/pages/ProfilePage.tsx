import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";
import { KeyRound, LogOut, Camera } from "lucide-react";
import { getMe, updateMyProfile } from "../services/api";
import "./profile.css";

const MODE_STORAGE_KEY = "terrashare-mode";

export default function ProfilePage() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  const userName =
    user?.fullName ||
    user?.firstName ||
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "Usuario";
  const userEmail = user?.emailAddresses?.[0]?.emailAddress || "No disponible";
  const userImage = user?.imageUrl;
  const initials = userName
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("es-PA", { month: "short", year: "numeric" })
    : "—";

  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");

  // Preferencias. El modo se persiste en localStorage (igual que AppLayout).
  const [mode, setMode] = useState<"busco" | "ofrezco">(() =>
    typeof window !== "undefined" && window.localStorage.getItem(MODE_STORAGE_KEY) === "ofrezco"
      ? "ofrezco"
      : "busco",
  );
  // TODO(#136): sin backend para estas preferencias; estado local por ahora.
  const [emailNotif, setEmailNotif] = useState(true);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => {
        if (active && me?.profile?.phone) setPhone(me.profile.phone);
      })
      .catch(() => {
        /* ignore — phone stays empty */
      });
    return () => {
      active = false;
    };
  }, []);

  const changeMode = (next: "busco" | "ofrezco") => {
    setMode(next);
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  };

  const handleSavePhone = async () => {
    setSavingPhone(true);
    setPhoneMsg("");
    try {
      await updateMyProfile({ phone: phone.trim() });
      setPhoneMsg("Cambios guardados");
    } catch (err) {
      setPhoneMsg(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSignOut = () => signOut({ redirectUrl: "/" });

  return (
    <div className="pf">
      <h1 className="pf-title">Mi perfil</h1>
      <p className="pf-sub">Administra tus datos y preferencias.</p>

      {/* identidad */}
      <div className="pf-identity">
        {userImage ? (
          <img className="pf-avatar" src={userImage} alt={userName} />
        ) : (
          <span className="pf-avatar" aria-hidden="true">
            {initials}
          </span>
        )}
        <div className="pf-identity__body">
          <div className="pf-identity__name-row">
            <span className="pf-identity__name">{userName}</span>
            <span className="pf-identity__badge">Usuario</span>
          </div>
          <div className="pf-identity__meta">
            {userEmail} · Miembro desde {memberSince}
          </div>
        </div>
        <button type="button" className="pf-obtn" onClick={() => openUserProfile()}>
          <Camera size={16} /> Cambiar foto
        </button>
      </div>

      {/* datos personales */}
      <div className="pf-card">
        <div className="pf-card__title">Datos personales</div>
        <div className="pf-grid">
          <div className="pf-field">
            <label className="pf-label">Nombre completo</label>
            <div className="pf-value">{userName}</div>
          </div>
          <div className="pf-field">
            <label className="pf-label">
              Correo <span>(no editable)</span>
            </label>
            <div className="pf-value pf-value--muted">{userEmail}</div>
          </div>
          <div className="pf-field">
            <label className="pf-label" htmlFor="pf-phone">
              Teléfono / WhatsApp
            </label>
            <input
              id="pf-phone"
              className="pf-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+507 6000-0000"
            />
          </div>
          <div className="pf-field">
            <label className="pf-label">Miembro desde</label>
            <div className="pf-value pf-value--muted">{memberSince}</div>
          </div>
        </div>
        <div className="pf-save-row">
          {phoneMsg && <span className="pf-save-msg">{phoneMsg}</span>}
          <button type="button" className="pf-save" onClick={handleSavePhone} disabled={savingPhone}>
            {savingPhone ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* preferencias */}
      <div className="pf-card">
        <div className="pf-card__title" style={{ marginBottom: "6px" }}>
          Preferencias
        </div>
        <div className="pf-pref">
          <div>
            <div className="pf-pref__label">Modo al iniciar</div>
            <div className="pf-pref__hint">Qué vista ves al entrar</div>
          </div>
          <div className="pf-seg" role="tablist" aria-label="Modo al iniciar">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "busco"}
              className={`pf-seg__btn ${mode === "busco" ? "is-active" : ""}`}
              onClick={() => changeMode("busco")}
            >
              Busco
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "ofrezco"}
              className={`pf-seg__btn ${mode === "ofrezco" ? "is-active" : ""}`}
              onClick={() => changeMode("ofrezco")}
            >
              Ofrezco
            </button>
          </div>
        </div>
        <div className="pf-pref">
          <div>
            <div className="pf-pref__label">Notificaciones por correo</div>
            <div className="pf-pref__hint">Solicitudes, mensajes y estados</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailNotif}
            aria-label="Notificaciones por correo"
            className={`pf-toggle ${emailNotif ? "is-on" : ""}`}
            onClick={() => setEmailNotif((v) => !v)}
          >
            <span className="pf-toggle__knob" />
          </button>
        </div>
        <div className="pf-pref">
          <div>
            <div className="pf-pref__label">Mostrar mi teléfono en el chat</div>
            <div className="pf-pref__hint">Para contacto por WhatsApp</div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={showPhone}
            aria-label="Mostrar mi teléfono en el chat"
            className={`pf-toggle ${showPhone ? "is-on" : ""}`}
            onClick={() => setShowPhone((v) => !v)}
          >
            <span className="pf-toggle__knob" />
          </button>
        </div>
      </div>

      {/* cuenta */}
      <div className="pf-card" style={{ marginBottom: 0 }}>
        <div className="pf-card__title" style={{ marginBottom: "14px" }}>
          Cuenta
        </div>
        <div className="pf-account-actions">
          <button type="button" className="pf-obtn" onClick={() => openUserProfile()}>
            <KeyRound size={16} /> Cambiar contraseña
          </button>
          <button type="button" className="pf-obtn" onClick={handleSignOut}>
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
        {/* TODO(#137): la eliminación de cuenta se gestiona por ahora vía Clerk. */}
        <div className="pf-danger">
          <div>
            <div className="pf-danger__title">Eliminar cuenta</div>
            <div className="pf-danger__hint">Esta acción no se puede deshacer.</div>
          </div>
          <button type="button" className="pf-danger__btn" onClick={() => openUserProfile()}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
