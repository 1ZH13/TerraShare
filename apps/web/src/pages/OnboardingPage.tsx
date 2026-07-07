import { useId, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button, Card, Field, Input } from "../components/ui";
import { PANAMA_PROVINCES } from "../data/panama-provinces";
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
  const phoneId = useId();
  const provinceId = useId();

  const [phone, setPhone] = useState("");
  const [province, setProvince] = useState("");
  const [preference, setPreference] = useState<Preference>("busco");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO(#137): persistir teléfono, provincia y preferencia inicial (Busco/
    // Ofrezco) en el perfil del usuario. Hoy no hay endpoint para provincia ni
    // preferencia; se capturan en el estado de la UI (phone/province/preference)
    // y solo se usan para elegir la vista inicial.
    navigate({ to: preference === "ofrezco" ? "/dashboard/lands" : "/catalog" });
  };

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

          <Button type="submit" block>
            Empezar
          </Button>
        </form>
      </Card>
    </div>
  );
}
