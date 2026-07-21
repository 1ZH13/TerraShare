import { useState } from "react";
import { Star } from "lucide-react";

interface ReviewModalProps {
  contractId: string;
  receiverId: string;
  onSubmit: (rating: number, comment: string) => Promise<void>;
  onClose: () => void;
}

export default function ReviewModal({ contractId, receiverId, onSubmit, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError("Selecciona una calificación del 1 al 5");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(rating, comment);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al enviar reseña");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          // Mismo caso que en VisitModal: `--surface` no existe, el token es
          // `--ts-surface`, y sin él salía un azul marino ajeno al tema (#363).
          background: "var(--ts-surface)",
          color: "var(--ts-text)",
          border: "1px solid var(--ts-border)",
          borderRadius: "12px", padding: "2rem",
          maxWidth: "480px", width: "90%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem" }}>Dejar reseña</h2>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.85rem", opacity: 0.7 }}>
          Califica tu experiencia con esta parte del contrato.
        </p>

        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1rem" }}>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "0.25rem",
              }}
            >
              <Star
                size={32}
                fill={s <= (hovered || rating) ? "#facc15" : "transparent"}
                color={s <= (hovered || rating) ? "#facc15" : "#555"}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        <textarea
          placeholder="Comentario opcional..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "0.75rem", borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.05)",
            color: "inherit", fontFamily: "inherit", fontSize: "0.9rem",
            resize: "vertical",
          }}
        />

        {error && (
          <p style={{ color: "var(--danger, #dc2626)", fontSize: "0.85rem", margin: "0.5rem 0" }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem", borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)", background: "transparent",
              color: "inherit", cursor: "pointer", fontSize: "0.9rem",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || rating < 1}
            style={{
              padding: "0.5rem 1.5rem", borderRadius: "8px",
              border: "none", background: "var(--leaf-600, #059669)",
              color: "#fff", cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting || rating < 1 ? 0.6 : 1,
              fontSize: "0.9rem", fontWeight: 600,
            }}
          >
            {submitting ? "Enviando..." : "Enviar reseña"}
          </button>
        </div>
      </div>
    </div>
  );
}
