import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ImageIcon, MapPin, X } from "lucide-react";
import type { LandDto } from "@terrashare/shared";
import { getLandById, photoSrc } from "../services/api";
import { useCompare } from "../hooks/useCompare";

export default function ComparePage() {
  const { compareIds, removeLand, clear } = useCompare();
  const [lands, setLands] = useState<LandDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (compareIds.length === 0) {
      setLands([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(compareIds.map((id) => getLandById(id)))
      .then((results) => {
        if (!active) return;
        setLands(results.filter((l): l is LandDto => l !== null));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading lands for comparison", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [compareIds]);

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        Cargando comparador...
      </div>
    );
  }

  if (lands.length === 0) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-200)" }}>
        <div style={{ marginBottom: "1rem" }}>No hay terrenos seleccionados para comparar.</div>
        <Link to="/catalog" className="btn btn-primary" style={{ padding: "12px 24px", background: "var(--ts-brand)", color: "black", borderRadius: "999px", textDecoration: "none", fontWeight: 600 }}>
          Ir al catálogo
        </Link>
      </div>
    );
  }

  const allFeatures = Array.from(new Set(lands.flatMap((l) => l.features ?? [])));

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <div>
          <Link to="/catalog" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-200)", textDecoration: "none", marginBottom: "1rem" }}>
            <ArrowLeft size={16} /> Volver al catálogo
          </Link>
          <h1 style={{ margin: 0 }}>Comparador de Terrenos</h1>
        </div>
        <button
          onClick={clear}
          className="btn"
          style={{ background: "rgba(255,255,255,0.1)", border: "none", padding: "8px 16px", borderRadius: "8px", color: "white", cursor: "pointer" }}
        >
          Limpiar comparador
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${lands.length}, 1fr)`, gap: "1rem", overflowX: "auto" }}>
        {lands.map((land) => {
          const price = land.priceRule?.pricePerMonth;
          return (
            <div key={land.id} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ position: "relative", height: "200px", background: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {land.photos?.[0] ? (
                  <img src={photoSrc(land.photos[0])} alt={land.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ImageIcon size={48} opacity={0.5} />
                )}
                <button
                  onClick={() => removeLand(land.id)}
                  style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", cursor: "pointer" }}
                  title="Quitar"
                >
                  <X size={16} />
                </button>
              </div>
              <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
                <div>
                  <h3 style={{ margin: "0 0 0.5rem 0" }}>{land.title}</h3>
                  <div style={{ color: "var(--ts-brand)", fontSize: "1.25rem", fontWeight: 600 }}>
                    {typeof price === "number" ? `$${price.toLocaleString()} / mes` : "Consultar precio"}
                  </div>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-200)", fontSize: "0.9rem" }}>
                  <MapPin size={16} /> {land.location?.province}, {land.location?.district}
                </div>

                <div style={{ background: "rgba(255,255,255,0.05)", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.9rem" }}>
                    <div><strong style={{ opacity: 0.7 }}>Área:</strong><br/>{land.area} ha</div>
                    <div><strong style={{ opacity: 0.7 }}>Uso principal:</strong><br/>{land.allowedUses?.[0] ?? "—"}</div>
                    <div><strong style={{ opacity: 0.7 }}>Operación:</strong><br/>{land.operation ?? "—"}</div>
                    <div><strong style={{ opacity: 0.7 }}>Agua:</strong><br/>{land.water ?? "—"}</div>
                  </div>
                </div>

                <div style={{ marginTop: "auto" }}>
                  <Link to="/lands/$id" params={{ id: land.id }} style={{ display: "block", textAlign: "center", background: "white", color: "black", padding: "10px", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
                    Ver detalles completos
                  </Link>
                </div>
              </div>

              {allFeatures.length > 0 && (
                <div style={{ padding: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", opacity: 0.7 }}>Características</h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                    {allFeatures.map(feat => {
                      const hasFeat = land.features?.includes(feat);
                      return (
                        <li key={feat} style={{ display: "flex", alignItems: "center", gap: "0.5rem", opacity: hasFeat ? 1 : 0.3 }}>
                          {hasFeat ? <Check size={16} color="var(--success)" /> : <X size={16} />}
                          {feat}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
