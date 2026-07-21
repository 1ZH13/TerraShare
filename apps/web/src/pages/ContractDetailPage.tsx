import { useEffect, useState } from "react";
import { shortId } from "../lib/short-id";
import { useParams } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Star, Download } from "lucide-react";
import ReviewModal from "../components/ReviewModal";
import { createReview, getReviewsByUser, downloadContractPdf, type ReviewDto } from "../services/api";

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
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [myReview, setMyReview] = useState<ReviewDto | null>(null);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  // Descarga del contrato en PDF (HU-101 / #327).
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

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

  useEffect(() => {
    if (!contract || contract.status !== "completed") return;
    const receiverId = user?.id === contract.ownerId ? contract.tenantId : contract.ownerId;
    getReviewsByUser(receiverId, contractId).then((r) => {
      setReviews(r);
      const mine = r.find((rev) => rev.senderId === user?.id);
      if (mine) setMyReview(mine);
    });
  }, [contract, user]);

  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!user || !contract) return;
    const receiverId = user.id === contract.ownerId ? contract.tenantId : contract.ownerId;
    const review = await createReview({
      contractId: contract.id,
      receiverId,
      rating,
      comment: comment || undefined,
    });
    if (review) {
      setMyReview(review);
      setReviews((prev) => [...prev, review]);
    }
  };

  const status = contract ? statusConfig[contract.status] || statusConfig.draft : null;
  const canReview = contract?.status === "completed" && user && !myReview;

  const handleDownloadPdf = async () => {
    if (!contract) return;
    setDownloading(true);
    setDownloadError("");
    try {
      await downloadContractPdf(contract.id);
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : "No se pudo descargar el PDF");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>Detalle de contrato</h1>
        <p>Contrato #{shortId(contractId)}</p>
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
            <h3 style={{ margin: 0 }}>Contrato #{shortId(contract.id)}</h3>
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
            <p style={{ margin: 0 }}><strong>Solicitud:</strong> {shortId(contract.rentalRequestId)}</p>
            <p style={{ margin: 0 }}><strong>Período:</strong> {contract.terms?.startsAt || "—"} → {contract.terms?.endsAt || "—"}</p>
            <p style={{ margin: 0 }}><strong>Creado:</strong> {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : "—"}</p>
          </div>

          {/* Descargar el contrato en PDF (HU-101 / #327). */}
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{
              marginTop: "1rem", padding: "0.5rem 1.25rem", borderRadius: "8px",
              cursor: downloading ? "default" : "pointer", fontSize: "0.9rem", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "0.5rem",
              opacity: downloading ? 0.6 : 1,
            }}
          >
            <Download size={16} /> {downloading ? "Generando…" : "Descargar PDF"}
          </button>

          {downloadError && (
            <p style={{ color: "var(--danger, #dc2626)", fontSize: "0.85rem", margin: "0.5rem 0 0" }}>
              {downloadError}
            </p>
          )}

          {canReview && (
            <button
              onClick={() => setShowReviewModal(true)}
              style={{
                marginTop: "1rem", padding: "0.5rem 1.25rem", borderRadius: "8px",
                border: "none", background: "var(--leaf-600, #059669)",
                color: "#fff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 600,
                display: "flex", alignItems: "center", gap: "0.5rem",
              }}
            >
              <Star size={16} /> Dejar reseña
            </button>
          )}

          {myReview && (
            <div style={{ marginTop: "1rem", padding: "1rem", borderRadius: "8px", background: "rgba(255,255,255,0.05)" }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>Tu reseña</p>
              <div style={{ display: "flex", gap: "0.15rem", margin: "0.35rem 0" }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={16} fill={s <= myReview.rating ? "#facc15" : "transparent"} color={s <= myReview.rating ? "#facc15" : "#555"} />
                ))}
              </div>
              {myReview.comment && (
                <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>{myReview.comment}</p>
              )}
            </div>
          )}

          {reviews.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>Reseñas recibidas</h4>
              {reviews.filter((r) => r.senderId !== user?.id).map((rev) => (
                <div key={rev.id} style={{ padding: "0.75rem", borderRadius: "8px", background: "rgba(255,255,255,0.03)", marginBottom: "0.5rem" }}>
                  <div style={{ display: "flex", gap: "0.15rem", marginBottom: "0.25rem" }}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={14} fill={s <= rev.rating ? "#facc15" : "transparent"} color={s <= rev.rating ? "#facc15" : "#555"} />
                    ))}
                  </div>
                  {rev.comment && <p style={{ margin: 0, fontSize: "0.85rem", opacity: 0.8 }}>{rev.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showReviewModal && contract && (
        <ReviewModal
          contractId={contract.id}
          receiverId={user?.id === contract.ownerId ? contract.tenantId : contract.ownerId}
          onSubmit={handleReviewSubmit}
          onClose={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
}
