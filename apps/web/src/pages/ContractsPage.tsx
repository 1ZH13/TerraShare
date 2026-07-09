import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/clerk-react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const statusConfig: Record<string, { label: string; color: string; bg: string; step: number }> = {
  draft: { label: "Borrador", color: "#997a00", bg: "rgba(200, 170, 0, 0.15)", step: 1 },
  pending_owner: { label: "Pendiente firma", color: "var(--river-500)", bg: "rgba(13, 111, 147, 0.12)", step: 2 },
  active: { label: "Activo", color: "var(--leaf-700)", bg: "rgba(11, 95, 55, 0.12)", step: 3 },
  completed: { label: "Completado", color: "var(--success, #059669)", bg: "rgba(11, 95, 55, 0.12)", step: 4 },
  cancelled: { label: "Cancelado", color: "var(--danger, #dc2626)", bg: "rgba(180, 40, 40, 0.12)", step: 0 },
};

const steps = ["Borrador", "Firma", "Activo", "Completado"];

export default function ContractsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const fetchContracts = async () => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const token = await getToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        else if (import.meta.env.DEV) { headers["x-dev-user-id"] = "web_dev_user"; headers["x-dev-role"] = "user"; }
        const res = await fetch(`${BASE_URL}/api/v1/contracts`, { headers });
        const json = await res.json();
        setContracts(json?.data || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, [user]);

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1>Mis Contratos</h1>
          <p>Seguimiento de contratos de alquiler</p>
        </div>
        <div className="glass-panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          Cargando contratos...
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1>Mis Contratos</h1>
        <p>Seguimiento de contratos de alquiler</p>
      </div>

      {error && (
        <div className="glass-panel" style={{ marginTop: "1.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "var(--danger, #dc2626)" }}>{error}</p>
        </div>
      )}

      {contracts.length === 0 ? (
        <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
          <p>No tienes contratos aún.</p>
          <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>Los contratos se generan cuando una solicitud es aprobada.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1.5rem" }}>
          {contracts.map((contract: any) => {
            const status = statusConfig[contract.status] || statusConfig.draft;
            return (
              <div key={contract.id} className="glass-panel">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>Contrato #{contract.id.slice(0, 8)}</h3>
                    <p style={{ margin: "0.25rem 0", opacity: 0.6, fontSize: "0.85rem" }}>
                      Solicitud: {contract.rentalRequestId?.slice(0, 8)}
                    </p>
                  </div>
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

                <div style={{ display: "flex", alignItems: "center", gap: "0", margin: "1rem 0", position: "relative" }}>
                  {steps.map((step, i) => {
                    const isActive = status.step >= i + 1;
                    const isCurrent = status.step === i + 1;
                    return (
                      <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                        <div style={{
                          width: "2rem",
                          height: "2rem",
                          borderRadius: "999px",
                          background: isActive ? "var(--leaf-700, #059669)" : "#e5e7eb",
                          color: isActive ? "white" : "#9ca3af",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          border: isCurrent ? "3px solid var(--leaf-500, #10b981)" : "none",
                          zIndex: 1,
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ fontSize: "0.7rem", marginTop: "0.25rem", opacity: isActive ? 1 : 0.5 }}>
                          {step}
                        </span>
                        {i < steps.length - 1 && (
                          <div style={{
                            position: "absolute",
                            top: "1rem",
                            left: "50%",
                            width: "100%",
                            height: "2px",
                            background: isActive ? "var(--leaf-700, #059669)" : "#e5e7eb",
                            zIndex: 0,
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                  <p style={{ margin: "0.25rem 0" }}>
                    <strong>Período:</strong> {contract.terms?.startsAt || "—"} → {contract.terms?.endsAt || "—"}
                  </p>
                  <p style={{ margin: "0.25rem 0" }}>
                    <strong>Creado:</strong> {contract.createdAt ? new Date(contract.createdAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
