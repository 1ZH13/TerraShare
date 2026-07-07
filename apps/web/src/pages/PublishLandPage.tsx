import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { CreateLandDto, LandUse } from "@terrashare/shared";
import { X, Sprout, ArrowLeft, ArrowRight, Check, MapPin, Info, CloudUpload } from "lucide-react";
import { createLand } from "../services/api";
import "./publish.css";

type Operation = "alquiler" | "venta" | "ambas";
type Currency = "USD" | "PAB";

const STEP_LABELS = ["Datos", "Ubicación", "Precio", "Fotos"];
const STEP_TITLES = ["1 · Datos del terreno", "2 · Ubicación", "3 · Precio y disponibilidad", "4 · Fotos"];

const USES: { value: LandUse; label: string }[] = [
  { value: "agricultura", label: "Agricultura" },
  { value: "ganaderia", label: "Ganadería" },
  { value: "forestal", label: "Forestal" },
  { value: "acuicultura", label: "Acuicultura" },
  { value: "mixto", label: "Mixto" },
];

interface Form {
  title: string;
  description: string;
  area: string;
  operation: Operation;
  uses: LandUse[];
  province: string;
  district: string;
  corregimiento: string;
  addressLine: string;
  currency: Currency;
  pricePerMonth: string;
  salePrice: string;
  availableFrom: string;
  availableTo: string;
}

const EMPTY: Form = {
  title: "",
  description: "",
  area: "",
  operation: "alquiler",
  uses: [],
  province: "",
  district: "",
  corregimiento: "",
  addressLine: "",
  currency: "USD",
  pricePerMonth: "",
  salePrice: "",
  availableFrom: "",
  availableTo: "",
};

export default function PublishLandPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };
  const toggleUse = (u: LandUse) =>
    setForm((prev) => ({
      ...prev,
      uses: prev.uses.includes(u) ? prev.uses.filter((x) => x !== u) : [...prev.uses, u],
    }));

  const sellsRent = form.operation === "alquiler" || form.operation === "ambas";
  const sellsSale = form.operation === "venta" || form.operation === "ambas";

  const validate = (): string => {
    if (step === 1) {
      if (!form.title.trim()) return "Escribe un título para la publicación.";
      if (!(Number(form.area) > 0)) return "Indica el área en hectáreas.";
      if (form.uses.length === 0) return "Selecciona al menos un uso permitido.";
    }
    if (step === 2) {
      if (!form.province.trim()) return "Indica la provincia.";
      if (!form.district.trim()) return "Indica el distrito.";
    }
    if (step === 3 && sellsRent && !(Number(form.pricePerMonth) > 0)) {
      return "Indica el precio de alquiler mensual.";
    }
    return "";
  };

  const next = () => {
    const err = validate();
    if (err) return setError(err);
    setStep((s) => Math.min(4, s + 1));
  };
  const prev = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  const publish = async () => {
    setSubmitting(true);
    setError("");
    try {
      // Nota: operación/precio de venta (#140) y fotos (#148) aún no se persisten
      // en el backend; se envía lo que soporta CreateLandDto.
      const dto: CreateLandDto = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        area: Number(form.area),
        allowedUses: form.uses,
        location: {
          province: form.province.trim(),
          district: form.district.trim(),
          corregimiento: form.corregimiento.trim() || undefined,
          addressLine: form.addressLine.trim() || undefined,
        },
        availability: {
          availableFrom: form.availableFrom || undefined,
          availableTo: form.availableTo || undefined,
        },
        priceRule: {
          currency: form.currency,
          pricePerMonth: Number(form.pricePerMonth) || 0,
        },
      };
      await createLand(dto);
      navigate({ to: "/dashboard/lands", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar el terreno.");
      setSubmitting(false);
    }
  };

  const pct = `${(step / 4) * 100}%`;

  return (
    <div className="pub">
      <div className="pub-nav">
        <Link to="/dashboard/lands" className="pub-nav__cancel">
          <X size={17} /> Cancelar
        </Link>
        <span className="pub-nav__brand">
          <span className="pub-nav__brand-mark">
            <Sprout size={22} strokeWidth={1.8} />
          </span>
          <span className="pub-nav__brand-name">Publicar terreno</span>
        </span>
        <span className="pub-nav__step">Paso {step} de 4</span>
      </div>

      <div className="pub-wrap">
        <div className="pub-progress">
          <div className="pub-progress__fill" style={{ width: pct }} />
        </div>
        <div className="pub-steps">
          {STEP_LABELS.map((label, i) => (
            <span key={label} className={i + 1 === step ? "is-active" : ""}>
              {label}
            </span>
          ))}
        </div>

        <h1 className="pub-title">Paso {STEP_TITLES[step - 1]}</h1>

        <div className="pub-card">
          {step === 1 && (
            <div className="pub-step">
              <label className="pub-label">Título de la publicación</label>
              <input
                className="pub-input"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Ej. Finca El Tamarindo"
              />
              <label className="pub-label pub-label--mt">Descripción</label>
              <textarea
                className="pub-input"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe el terreno, agua, acceso, suelo…"
              />
              <div className="pub-grid-loc">
                <div>
                  <label className="pub-label">Área (hectáreas)</label>
                  <input
                    className="pub-input"
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.area}
                    onChange={(e) => set("area", e.target.value)}
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="pub-label">Tipo de operación</label>
                  <div className="pub-seg">
                    {(["alquiler", "venta", "ambas"] as Operation[]).map((op) => (
                      <button
                        key={op}
                        type="button"
                        className={`pub-seg__btn ${form.operation === op ? "is-active" : ""}`}
                        onClick={() => set("operation", op)}
                      >
                        {op === "alquiler" ? "Alquiler" : op === "venta" ? "Venta" : "Ambas"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <label className="pub-label pub-label--mt">Usos permitidos</label>
              <div className="pub-chips">
                {USES.map((u) => {
                  const on = form.uses.includes(u.value);
                  return (
                    <button
                      key={u.value}
                      type="button"
                      className={`pub-chip ${on ? "is-active" : ""}`}
                      onClick={() => toggleUse(u.value)}
                    >
                      {on && <Check size={14} />} {u.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pub-step">
              <div className="pub-grid2" style={{ marginTop: 0 }}>
                <div>
                  <label className="pub-label">Provincia</label>
                  <input className="pub-input" value={form.province} onChange={(e) => set("province", e.target.value)} placeholder="Los Santos" />
                </div>
                <div>
                  <label className="pub-label">Distrito</label>
                  <input className="pub-input" value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="Guararé" />
                </div>
              </div>
              <label className="pub-label pub-label--mt">
                Corregimiento <span>(opcional)</span>
              </label>
              <input className="pub-input" value={form.corregimiento} onChange={(e) => set("corregimiento", e.target.value)} placeholder="El Espinal" />
              <label className="pub-label pub-label--mt">Dirección / referencia</label>
              <input className="pub-input" value={form.addressLine} onChange={(e) => set("addressLine", e.target.value)} placeholder="Sector, camino principal…" />
              <p className="pub-hint">
                <MapPin size={14} /> Podrás afinar la ubicación exacta en el mapa más adelante.
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="pub-step">
              {sellsRent && (
                <div className="pub-grid2" style={{ marginTop: 0 }}>
                  <div>
                    <label className="pub-label">Precio de alquiler</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        className="pub-input"
                        type="number"
                        min={0}
                        value={form.pricePerMonth}
                        onChange={(e) => set("pricePerMonth", e.target.value)}
                        placeholder="420"
                      />
                      <div className="pub-seg pub-seg--sm">
                        {(["USD", "PAB"] as Currency[]).map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={`pub-seg__btn ${form.currency === c ? "is-active" : ""}`}
                            onClick={() => set("currency", c)}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="pub-price-suffix">por mes</span>
                  </div>
                  {sellsSale && (
                    <div>
                      <label className="pub-label">Precio de venta</label>
                      <input className="pub-input" type="number" min={0} value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="48000" />
                      <span className="pub-price-suffix">precio total</span>
                    </div>
                  )}
                </div>
              )}
              {!sellsRent && sellsSale && (
                <div>
                  <label className="pub-label">Precio de venta</label>
                  <input className="pub-input" type="number" min={0} value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="48000" />
                  <span className="pub-price-suffix">precio total</span>
                </div>
              )}

              <div className="pub-subtitle">
                Disponibilidad <span>(para alquiler)</span>
              </div>
              <div className="pub-grid2" style={{ marginTop: 0 }}>
                <div>
                  <label className="pub-label">Disponible desde</label>
                  <input className="pub-input" type="date" value={form.availableFrom} onChange={(e) => set("availableFrom", e.target.value)} />
                </div>
                <div>
                  <label className="pub-label">
                    Hasta <span>(opcional)</span>
                  </label>
                  <input className="pub-input" type="date" value={form.availableTo} onChange={(e) => set("availableTo", e.target.value)} />
                </div>
              </div>
              <p className="pub-hint">
                <Info size={14} /> Panamá opera en USD/PAB con paridad 1:1.
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="pub-step">
              <div style={{ fontFamily: "var(--ts-font-serif)", fontSize: "19px", fontWeight: 600 }}>Fotos del terreno</div>
              <p style={{ color: "var(--ts-sage-2)", fontSize: "14px", margin: "3px 0 18px" }}>
                Sube hasta 10 fotos. La primera será la portada.
              </p>
              {/* TODO(#148): la subida de fotos aún no tiene backend; se publica sin fotos. */}
              <div className="pub-drop">
                <CloudUpload size={34} strokeWidth={1.6} />
                <div className="pub-drop__main">
                  Carga de fotos <b>próximamente</b>
                </div>
                <div className="pub-drop__sub">Podrás añadirlas al editar tu publicación (pendiente #148).</div>
              </div>
              <div className="pub-note">
                <Check size={20} />
                <div>
                  Tu publicación quedará <b>visible en el catálogo</b>. Podrás pausarla o editarla cuando
                  quieras.
                </div>
              </div>
            </div>
          )}

          {error && <p className="pub-error">{error}</p>}
        </div>

        <div className="pub-foot">
          {step > 1 ? (
            <button type="button" className="pub-back" onClick={prev}>
              <ArrowLeft size={16} /> Atrás
            </button>
          ) : (
            <Link to="/dashboard/lands" className="pub-back">
              <ArrowLeft size={16} /> Atrás
            </Link>
          )}

          {step < 4 ? (
            <button type="button" className="pub-next" onClick={next}>
              Continuar <ArrowRight size={17} />
            </button>
          ) : (
            <button type="button" className="pub-next pub-next--publish" onClick={publish} disabled={submitting}>
              <Check size={17} /> {submitting ? "Publicando…" : "Publicar terreno"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
