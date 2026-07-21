import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { FIELD_STYLE, BUTTON_STYLE, PRIMARY_BUTTON_STYLE } from "./modal-styles";

interface VisitModalProps {
  landTitle: string;
  onSubmit: (proposedDate: string, proposedTime: string, message: string) => Promise<void>;
  onClose: () => void;
}

/** Fecha mínima seleccionable: hoy (no tiene sentido proponer una visita pasada). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Modal para solicitar una visita a un terreno (HU-100 / #326). El dueño
 * responde después desde /dashboard/visits.
 */
export default function VisitModal({ landTitle, onSubmit, onClose }: VisitModalProps) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!date || !time) {
      setError("Indica la fecha y la hora de la visita");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(date, time, message);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo solicitar la visita");
    } finally {
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
        aria-label="Agendar visita"
        style={{
          // `--surface` no existe: el token del sistema se llama `--ts-surface`.
          // Sin definir, el modal caía al azul marino de reserva, que no pega
          // con la paleta verde en ningún tema (#363).
          background: "var(--ts-surface)",
          color: "var(--ts-text)",
          border: "1px solid var(--ts-border)",
          borderRadius: "12px", padding: "2rem",
          maxWidth: "460px", width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>Agendar visita</h2>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.85rem", opacity: 0.7 }}>
          Propón una fecha y hora para visitar «{landTitle}». El dueño podrá confirmarla,
          reprogramarla o rechazarla.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
          <label style={{ flex: 1, fontSize: "0.85rem" }}>
            Fecha
            <input
              type="date"
              value={date}
              min={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              style={FIELD_STYLE}
            />
          </label>
          <label style={{ flex: 1, fontSize: "0.85rem" }}>
            Hora
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={FIELD_STYLE}
            />
          </label>
        </div>

        <textarea
          placeholder="Mensaje para el dueño (opcional)…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          style={{ ...FIELD_STYLE, marginTop: 0, resize: "vertical" }}
        />

        {error && (
          <p style={{ color: "#f87171", fontSize: "0.85rem", margin: "0.75rem 0 0" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button
            type="button"
            onClick={onClose}
            style={BUTTON_STYLE}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !date || !time}
            style={{
              ...PRIMARY_BUTTON_STYLE,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting || !date || !time ? 0.6 : 1,
            }}
          >
            <CalendarClock size={16} />
            {submitting ? "Enviando…" : "Solicitar visita"}
          </button>
        </div>
      </div>
    </div>
  );
}
