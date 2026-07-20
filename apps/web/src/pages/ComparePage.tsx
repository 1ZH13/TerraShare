import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { LandDto } from "@terrashare/shared";
import {
  ArrowLeft,
  Columns2,
  ImageIcon,
  MapPin,
  Sprout,
  X,
} from "lucide-react";
import { getLandById, photoSrc } from "../services/api";
import { useCompareLands } from "../hooks/useCompareLands";
import EmptyState from "../components/EmptyState";
import "./compare.css";

const USE_LABELS: Record<string, string> = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Mixto",
  otro: "Otro",
};

function formatUse(use?: string): string {
  if (!use) return "—";
  return USE_LABELS[use] ?? use;
}

function formatUses(uses?: string[]): string {
  if (!uses?.length) return "—";
  return uses.map((u) => formatUse(u)).join(", ");
}

function formatAvailable(iso?: string): string {
  if (!iso) return "Ahora";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Ahora";
  return d.toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" });
}

function formatPrice(land: LandDto): string {
  const monthly = land.priceRule?.pricePerMonth;
  if (typeof monthly === "number") {
    return `$${monthly.toLocaleString("es-PA")}/mes`;
  }
  if (typeof land.salePrice === "number") {
    return `$${land.salePrice.toLocaleString("es-PA")}`;
  }
  return "A consultar";
}

function formatLocation(land: LandDto): string {
  const parts = [land.location?.province, land.location?.district].filter(Boolean);
  return parts.length ? parts.join(" · ") : "—";
}

type LoadState = "loading" | "ready" | "error";

export default function ComparePage() {
  const { ids, remove, clear, max } = useCompareLands();
  const [lands, setLands] = useState<LandDto[]>([]);
  const [status, setStatus] = useState<LoadState>("loading");

  useEffect(() => {
    if (ids.length === 0) {
      setLands([]);
      setStatus("ready");
      return;
    }

    let active = true;
    setStatus("loading");

    Promise.all(ids.map((id) => getLandById(id)))
      .then((results) => {
        if (!active) return;
        // Solo los que siguen existiendo; si un id murió, lo quitamos de la lista.
        const found = results.filter((l): l is LandDto => l != null);
        const foundIds = new Set(found.map((l) => l.id));
        for (const id of ids) {
          if (!foundIds.has(id)) remove(id);
        }
        setLands(found);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("Error cargando comparación:", err);
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
    // remove es estable; ids es la dependencia real.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload when ids change
  }, [ids.join(",")]);

  const rows: { label: string; value: (land: LandDto) => string }[] = [
    { label: "Precio", value: formatPrice },
    { label: "Área", value: (l) => (typeof l.area === "number" ? `${l.area} ha` : "—") },
    { label: "Provincia / distrito", value: formatLocation },
    { label: "Usos permitidos", value: (l) => formatUses(l.allowedUses) },
    {
      label: "Disponibilidad",
      value: (l) => formatAvailable(l.availability?.availableFrom),
    },
  ];

  return (
    <div className="cmp">
      <nav className="cmp-nav">
        <Link to="/catalog" className="cmp-nav__back">
          <ArrowLeft size={17} /> Catálogo
        </Link>
        <span className="cmp-nav__brand">
          <span className="cmp-nav__brand-mark">
            <Sprout size={22} strokeWidth={1.8} />
          </span>
          <span className="cmp-nav__brand-name">TerraShare</span>
        </span>
        <span className="cmp-nav__meta">
          {ids.length}/{max} terrenos
        </span>
      </nav>

      <main id="contenido" className="cmp-wrap">
        <header className="cmp-header">
          <div>
            <h1 className="cmp-title">Comparar terrenos</h1>
            <p className="cmp-lead">
              Hasta {max} terrenos lado a lado. La selección se guarda en este navegador.
            </p>
          </div>
          {ids.length > 0 && (
            <button type="button" className="cmp-clear" onClick={clear}>
              Vaciar lista
            </button>
          )}
        </header>

        {status === "loading" ? (
          <div className="cmp-state">Cargando comparación…</div>
        ) : status === "error" ? (
          <div className="cmp-state cmp-state--error">
            No pudimos cargar los terrenos. Vuelve a intentarlo.
          </div>
        ) : lands.length === 0 ? (
          <EmptyState
            icon={Columns2}
            title="Nada que comparar todavía"
            description="Añade hasta 3 terrenos desde el catálogo o la ficha de detalle."
            action={{ label: "Ir al catálogo", to: "/catalog" }}
          />
        ) : (
          <div className="cmp-table-wrap">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th scope="col" className="cmp-table__attr">
                    Atributo
                  </th>
                  {lands.map((land) => (
                    <th key={land.id} scope="col" className="cmp-table__col">
                      <div className="cmp-colhead">
                        <div className="cmp-colhead__thumb">
                          {land.photos?.[0] ? (
                            <img
                              src={photoSrc(land.photos[0])}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <ImageIcon size={22} strokeWidth={1.5} aria-hidden="true" />
                          )}
                        </div>
                        <div className="cmp-colhead__body">
                          <Link
                            to="/lands/$id"
                            params={{ id: land.id }}
                            className="cmp-colhead__title"
                          >
                            {land.title}
                          </Link>
                          <span className="cmp-colhead__loc">
                            <MapPin size={12} /> {formatLocation(land)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="cmp-colhead__remove"
                          aria-label={`Quitar ${land.title} de la comparación`}
                          onClick={() => remove(land.id)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="cmp-table__attr">
                      {row.label}
                    </th>
                    {lands.map((land) => (
                      <td key={land.id}>{row.value(land)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lands.length > 0 && lands.length < max && (
          <p className="cmp-hint">
            Puedes añadir {max - lands.length} terreno{max - lands.length === 1 ? "" : "s"} más desde el{" "}
            <Link to="/catalog">catálogo</Link>.
          </p>
        )}
      </main>
    </div>
  );
}
