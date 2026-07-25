import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import { Button, Card, Field, Input } from "../components/ui";
import { PANAMA_PROVINCES } from "@terrashare/shared";
import { getMe, updateMyProfile } from "../services/api";
import "./auth.css";

type Preference = "busco" | "ofrezco";

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path d="M9 3v15M15 6v15" />
    </svg>
  );
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const phoneId = useId();
  const provinceId = useId();

  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [preference, setPreference] = useState<Preference>("busco");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Mientras comprobamos si el alta ya está hecha no pintamos el formulario, para
  // no mostrarlo un instante a quien ya lo completó y va a ser redirigido (#432).
  const [checking, setChecking] = useState(true);

  // Guarda de onboarding completado (#432): quien ya eligió Busco/Ofrezco no debe
  // ver este formulario otra vez —p. ej. al pulsar «atrás»—; se le lleva al panel.
  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setChecking(false);
      return;
    }
    let active = true;
    getMe()
      .then((me) => {
        if (!active) return;
        if (me?.profile?.marketPreference) {
          navigate({ to: "/dashboard", replace: true });
        } else {
          setChecking(false);
        }
      })
      .catch(() => active && setChecking(false));
    return () => {
      active = false;
    };
  }, [isLoaded, user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Persiste teléfono, provincia y preferencia inicial (Busco/Ofrezco) en el
      // perfil del usuario vía PATCH /auth/profile (#137).
      await updateMyProfile({
        phone: phone || undefined,
        province: province || undefined,
        marketPreference: preference,
      });
      // `replace` para que /onboarding no quede en el historial: sin esto, el
      // primer «atrás» tras registrarse volvía al onboarding y de ahí rebotaba
      // por /register (#432).
      navigate({ to: preference === "ofrezco" ? "/dashboard/lands" : "/catalog", replace: true });
    } catch {
      setError("No se pudo guardar tu información. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (checking) {
    return (
      <div className="au-shell">
        <Card className="au-onb">
          <p className="au-onb__sub">Cargando…</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="au-shell">
      <Card className="au-onb">
        <span className="au-onb__eyebrow">Un paso más</span>
        <h1 className="ts-title au-onb__title">Cuéntanos de ti</h1>
        <p className="au-onb__sub">Ya casi está. Con estos datos personalizamos tu experiencia.</p>

        <form className="au-onb__form" onSubmit={handleSubmit}>
          <Field label="Teléfono / WhatsApp" htmlFor={phoneId} hint="Para coordinar visitas y solicitudes.">
            <Input
              id={phoneId}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+507 6000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>

          <Field label="Provincia" htmlFor={provinceId}>
            <select
              id={provinceId}
              className="au-select"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {PANAMA_PROVINCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <div>
            <span className="au-fieldlabel" id="pref-label">
              ¿Qué te trae a TerraShare?
            </span>
            <div className="au-pref" role="radiogroup" aria-labelledby="pref-label">
              <button
                type="button"
                role="radio"
                aria-checked={preference === "busco"}
                className={`au-pref__opt ${preference === "busco" ? "is-active" : ""}`}
                onClick={() => setPreference("busco")}
              >
                <SearchIcon />
                Busco tierra
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={preference === "ofrezco"}
                className={`au-pref__opt ${preference === "ofrezco" ? "is-active" : ""}`}
                onClick={() => setPreference("ofrezco")}
              >
                <MapIcon />
                Ofrezco tierra
              </button>
            </div>
            <p className="au-onb__hint">
              Puedes hacer ambas cosas; esto solo define tu vista inicial.
            </p>
          </div>

          {error ? (
            <p className="au-onb__error" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" block disabled={saving}>
            {saving ? "Guardando…" : "Empezar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
