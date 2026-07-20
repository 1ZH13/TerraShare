import { useEffect, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Download } from "lucide-react";
import jsPDF from "jspdf";

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

  const generatePDF = () => {
    if (!contract) return;
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(22);
    doc.text("Contrato TerraShare", 20, 20);

    // Detalles
    doc.setFontSize(12);
    doc.text(`ID de Contrato: ${contract.id}`, 20, 35);
    doc.text(`ID de Solicitud: ${contract.rentalRequestId}`, 20, 45);
    doc.text(`Estado: ${contract.status.toUpperCase()}`, 20, 55);
    
    doc.setFontSize(16);
    doc.text("Términos del Contrato", 20, 75);
    doc.setFontSize(12);
    doc.text(`Fecha de inicio: ${contract.terms?.startsAt || "—"}`, 20, 85);
    doc.text(`Fecha de fin: ${contract.terms?.endsAt || "—"}`, 20, 95);

    doc.setFontSize(10);
    const splitSummary = doc.splitTextToSize(contract.terms?.summary || "No hay resumen.", 170);
    doc.text(splitSummary, 20, 110);
    
    doc.save(`contrato-${contract.id.slice(0, 8)}.pdf`);
  };

  const status = contract ? statusConfig[contract.status] || statusConfig.draft : null;

  return (
    <div>
      <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Detalle de contrato</h1>
          <p>Contrato #{contractId?.slice(0, 8)}</p>
        </div>
        {contract && (
          <button onClick={generatePDF} className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Download size={18} /> Exportar a PDF
          </button>
        )}
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
    </div>
  );
}
