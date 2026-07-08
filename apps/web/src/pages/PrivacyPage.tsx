import { useState } from "react";
import { useAuth, useUser } from "@clerk/tanstack-react-start";
import { useTranslation } from "react-i18next";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function PrivacyPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportData, setExportData] = useState<any>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState("");

  const buildHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    else if (import.meta.env.DEV) { headers["x-dev-user-id"] = "web_dev_user"; headers["x-dev-role"] = "user"; }
    return headers;
  };

  const handleExport = async () => {
    setExporting(true);
    setMsg("");
    try {
      const headers = await buildHeaders();
      const res = await fetch(`${BASE_URL}/api/v1/privacy/me/data-export`, { headers });
      const data = await res.json();
      setExportData(data?.data || data);
      setMsg("Datos exportados correctamente");
    } catch {
      setMsg("Error al exportar datos");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setMsg("");
    try {
      const headers = await buildHeaders();
      const res = await fetch(`${BASE_URL}/api/v1/privacy/me`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setMsg("Cuenta anonimizada correctamente");
        setConfirmDelete(false);
      } else {
        setMsg("Error al eliminar cuenta");
      }
    } catch {
      setMsg("Error al eliminar cuenta");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>{t("privacy.title")}</h1>
        <p>{t("privacy.subtitle")}</p>
      </div>

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem" }}>{t("privacy.export_title")}</h3>
        <p style={{ margin: "0 0 1rem", opacity: 0.7, fontSize: "0.9rem" }}>
          {t("privacy.export_desc")}
        </p>
        <button className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? "Exportando..." : t("privacy.export_button")}
        </button>
        {exportData && (
          <div style={{ marginTop: "1rem" }}>
            <details>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Ver datos exportados</summary>
              <pre style={{
                marginTop: "0.5rem",
                padding: "1rem",
                background: "rgba(0,0,0,0.05)",
                borderRadius: "0.5rem",
                fontSize: "0.8rem",
                overflow: "auto",
                maxHeight: "300px",
              }}>
                {JSON.stringify(exportData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      <div className="glass-panel" style={{ marginTop: "1.5rem", border: "1px solid rgba(239,68,68,0.3)" }}>
        <h3 style={{ margin: "0 0 0.5rem", color: "var(--danger)" }}>{t("privacy.delete_title")}</h3>
        <p style={{ margin: "0 0 1rem", opacity: 0.7, fontSize: "0.9rem" }}>
          {t("privacy.delete_desc")}
        </p>
        {!confirmDelete ? (
          <button className="btn btn-ghost" style={{ borderColor: "var(--danger)", color: "var(--danger)" }} onClick={() => setConfirmDelete(true)}>
            {t("privacy.delete_button")}
          </button>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>¿Estás seguro?</span>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancelar
            </button>
            <button className="btn btn-primary" style={{ background: "var(--danger)" }} onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Sí, eliminar"}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <div className="glass-panel" style={{ marginTop: "1rem" }}>
          <p>{msg}</p>
        </div>
      )}

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem" }}>{t("privacy.retention_title")}</h3>
        <ul style={{ margin: 0, paddingLeft: "1.5rem", opacity: 0.8 }}>
          <li>Tus datos de perfil se mantienen mientras tu cuenta esté activa.</li>
          <li>Los terrenos publicados se conservan según su estado.</li>
          <li>Las solicitudes y pagos se mantienen por razones legales (5 años).</li>
          <li>Al eliminar tu cuenta, tus datos personales se anonimizan.</li>
        </ul>
      </div>
    </div>
  );
}
