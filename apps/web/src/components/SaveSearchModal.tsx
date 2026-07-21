import { useState } from "react";
import { BookmarkPlus } from "lucide-react";

import { FIELD_STYLE, BUTTON_STYLE, PRIMARY_BUTTON_STYLE } from "./modal-styles";

interface SaveSearchModalProps {
  /** Resumen legible de los filtros que se van a guardar. */
  summary: string;
  /** Nombre sugerido, derivado de los propios filtros. */
  suggestedName: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Pone nombre a la búsqueda antes de guardarla (HU-99 / #368).
 *
 * Muestra el resumen de lo que se guarda porque, una vez creada, la búsqueda
 * genera avisos por correo: conviene que el usuario vea con qué criterios se
 * está suscribiendo, no solo que ponga un nombre a ciegas.
 */
export default function SaveSearchModal({ summary, suggestedName, onSubmit, onClose }: SaveSearchModalProps) {
  const [name, setName] = useState(suggestedName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Ponle un nombre para reconocerla después");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la búsqueda");
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Guardar búsqueda"
        style={{
          background: "var(--ts-surface)",
          color: "var(--ts-text)",
          border: "1px solid var(--ts-border)",
          borderRadius: "12px", padding: "2rem",
          maxWidth: "460px", width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>Guardar búsqueda</h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.85rem", opacity: 0.75, lineHeight: 1.5 }}>
          Te avisaremos por correo cuando se publique un terreno que encaje.
        </p>

        <p
          style={{
            margin: "0 0 1.25rem", padding: "0.75rem",
            borderRadius: "8px", background: "var(--ts-bg)",
            border: "1px solid var(--ts-border)",
            fontSize: "0.85rem", lineHeight: 1.5,
          }}
        >
          <strong style={{ display: "block", marginBottom: "0.25rem" }}>Criterios</strong>
          {summary}
        </p>

        <label style={{ fontSize: "0.85rem" }}>
          Nombre
          <input
            type="text"
            value={name}
            maxLength={60}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            style={FIELD_STYLE}
          />
        </label>

        {error && (
          <p style={{ color: "var(--ts-clay)", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button type="button" onClick={onClose} style={BUTTON_STYLE}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
            style={{
              ...PRIMARY_BUTTON_STYLE,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting || !name.trim() ? 0.6 : 1,
            }}
          >
            <BookmarkPlus size={16} />
            {submitting ? "Guardando…" : "Guardar búsqueda"}
          </button>
        </div>
      </div>
    </div>
  );
}
