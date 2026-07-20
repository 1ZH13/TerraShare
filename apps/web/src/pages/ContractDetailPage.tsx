import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Star } from "lucide-react";
import { api } from "../services/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Borrador", color: "#997a00", bg: "rgba(200, 170, 0, 0.15)" },
  pending_owner: { label: "Pendiente firma", color: "var(--river-500)", bg: "rgba(13, 111, 147, 0.12)" },
  active: { label: "Activo", color: "var(--leaf-700)", bg: "rgba(11, 95, 55, 0.12)" },
  completed: { label: "Completado", color: "var(--success, #059669)", bg: "rgba(11, 95, 55, 0.12)" },
  cancelled: { label: "Cancelado", color: "var(--danger, #dc2626)", bg: "rgba(180, 40, 40, 0.12)" },
};

export default function ContractDetailPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const params = useParams({ strict: false }) as { id?: string };
  const contractId = params.id;
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewState, setReviewState] = useState<"idle" | "sending" | "success" | "error">("idle");

  useEffect(() => {
    if (!user || !contractId) return;
    const fetchContract = async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        else if (import.meta.env.DEV) { headers["x-dev-user-id"] = "web_dev_user"; headers["x-dev-role"] = "user"; }
        const res = await fetch(`${BASE_URL}/api/v1/contracts/${contractId}`, { headers });
        if (!res.ok) { setError("No se encontró el contrato"); return; }
        const json = await res.json();
        setContract(json?.data || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [user, contractId]);

  const status = contract ? statusConfig[contract.status] || statusConfig.draft : null;

  const handleSubmitReview = async () => {
    if (!contractId || rating === 0) return;
    setReviewState("sending");
    try {
      await api.createReview({ contractId, rating, comment });
      setReviewState("success");
    } catch (e: any) {
      if (e.message && e.message.includes("already reviewed")) {
        setReviewState("success");
      } else {
        setReviewState("error");
      }
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>Detalle de contrato</h1>
        <p>Contrato #{contractId?.slice(0, 8)}</p>
      </div>

      {loading && (
        <div className="glass-panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          Cargando contrato...
        </div>
      )}

      {error && (
        <div className="glass-panel" style={{ marginTop: "1.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "var(--danger, #dc2626)" }}>{error}</p>
        </div>
      )}

      {contract && status && (
        <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
            <h3 style={{ margin: 0 }}>Contrato #{contract.id?.slice(0, 8)}</h3>
            <span style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              background: status.bg,
              color: status.color,
              fontWeight: 600,
              fontSize: "0.85rem",
            }}>
              {status.label}
            </span>
          </div>
          <div style={{ fontSize: "0.9rem", opacity: 0.75, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <p style={{ margin: 0 }}><strong>Solicitud:</strong> {contract.rentalRequestId?.slice(0, 8) || "—"}</p>
            <p style={{ margin: 0 }}><strong>Período:</strong> {contract.terms?.startsAt || "—"} → {contract.terms?.endsAt || "—"}</p>
            <p style={{ margin: 0 }}><strong>Creado:</strong> {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : "—"}</p>
          </div>
        </div>
      )}

      {contract?.status === "completed" && (
        <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
          <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Dejar una reseña</h3>
          {reviewState === "success" ? (
            <p style={{ color: "var(--success)", fontWeight: 500, margin: 0 }}>¡Gracias por tu reseña!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.8 }}>Califica tu experiencia con el usuario.</p>
              <div style={{ display: "flex", gap: "4px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                      color: (hoverRating || rating) >= star ? "var(--ts-brand)" : "rgba(255,255,255,0.2)",
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star fill={(hoverRating || rating) >= star ? "currentColor" : "none"} size={28} />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe un comentario (opcional)..."
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.2)",
                  color: "inherit",
                  fontFamily: "inherit",
                }}
              />
              {reviewState === "error" && (
                <p style={{ color: "var(--danger)", margin: 0, fontSize: "0.85rem" }}>Hubo un error al enviar la reseña. Inténtalo de nuevo.</p>
              )}
              <button
                onClick={handleSubmitReview}
                disabled={rating === 0 || reviewState === "sending"}
                className="btn btn-primary"
                style={{ alignSelf: "flex-start", padding: "0.5rem 1.5rem", borderRadius: "8px", background: "var(--ts-brand)", color: "black", fontWeight: 600, border: "none", cursor: "pointer", opacity: (rating === 0 || reviewState === "sending") ? 0.5 : 1 }}
              >
                {reviewState === "sending" ? "Enviando..." : "Enviar reseña"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
