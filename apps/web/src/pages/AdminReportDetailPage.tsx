import { useEffect, useState } from "react";
import { useParams, Link } from "@tanstack/react-router";
import { ArrowLeft, Flag } from "lucide-react";
import { getAdminReport, updateReportStatus } from "../services/adminApi";
import type { AdminReportDetail, ReportStatus } from "../services/adminApi";
import { REASON_LABELS, STATUS_BADGE, STATUS_LABELS, TARGET_LABELS } from "./reportLabels";
import "./admin.css";

function formatDate(value?: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-PA", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminReportDetailPage() {
  const { id } = useParams({ strict: false });
  const [report, setReport] = useState<AdminReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    getAdminReport(id)
      .then((res) => {
        setReport(res.data);
        setNote(res.data?.resolutionNote ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [id]);

  const transition = async (next: ReportStatus) => {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const res = await updateReportStatus(id, next, note.trim() || undefined);
      setReport(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <BackLink />
        <div className="adm-empty">Cargando…</div>
      </>
    );
  }

  if (error || !report) {
    return (
      <>
        <BackLink />
        <div className="adm-empty adm-empty--error">{error || "No se encontró el reporte."}</div>
      </>
    );
  }

  const isClosed = report.status === "resolved" || report.status === "dismissed";

  return (
    <>
      <BackLink />

      <div className="adm-rep__head">
        <div className="adm-rep__title">
          <span className="adm-user__avatar" aria-hidden="true">
            <Flag size={16} />
          </span>
          <div>
            <h1 className="adm-title" style={{ margin: 0 }}>{report.targetLabel}</h1>
            <p className="adm-sub" style={{ margin: 0 }}>
              {TARGET_LABELS[report.targetType]} · Reporte #{report.id.slice(-6)}
            </p>
          </div>
        </div>
        <span className={`adm-badge ${STATUS_BADGE[report.status]}`}>{STATUS_LABELS[report.status]}</span>
      </div>

      <div className="adm-rep__grid">
        <section className="adm-panel">
          <h2 className="adm-panel__title">Detalle del reporte</h2>
          <dl className="adm-rep__dl">
            <div>
              <dt>Motivo</dt>
              <dd>{REASON_LABELS[report.reason]}</dd>
            </div>
            <div>
              <dt>Descripción</dt>
              <dd>{report.description || "Sin descripción adicional."}</dd>
            </div>
            <div>
              <dt>Elemento reportado</dt>
              <dd>{report.targetLabel} <span className="adm-cell--muted">({report.targetId})</span></dd>
            </div>
            <div>
              <dt>Reportado por</dt>
              <dd>{report.reporterName || report.reporterEmail}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{formatDate(report.createdAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="adm-panel">
          <h2 className="adm-panel__title">Moderación</h2>
          <label className="adm-rep__label" htmlFor="rep-note">Nota de resolución (opcional)</label>
          <textarea
            id="rep-note"
            className="adm-rep__note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explica la decisión tomada…"
            rows={4}
          />
          <div className="adm-rep__actions">
            <button
              type="button"
              className="adm-act"
              disabled={saving || report.status === "reviewing"}
              onClick={() => transition("reviewing")}
            >
              En revisión
            </button>
            <button
              type="button"
              className="adm-act adm-rep__cta"
              disabled={saving}
              onClick={() => transition("resolved")}
            >
              Resolver
            </button>
            <button
              type="button"
              className="adm-act adm-act--danger"
              disabled={saving}
              onClick={() => transition("dismissed")}
            >
              Descartar
            </button>
          </div>
          {isClosed && report.resolutionNote && (
            <p className="adm-rep__resolved">Resolución: {report.resolutionNote}</p>
          )}
        </section>
      </div>
    </>
  );
}

function BackLink() {
  return (
    <Link to="/dashboard/admin/reports" className="adm-act" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
      <ArrowLeft size={15} /> Volver a reportes
    </Link>
  );
}
