import { useEffect, useState } from "react";
import { DatabaseBackup, ShieldCheck, ShieldAlert, RefreshCw, Loader2 } from "lucide-react";
import type { BackupRecordDto } from "@terrashare/shared";
import { createBackup, listBackups, verifyBackup } from "../services/adminApi";
import "./admin.css";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-PA", { dateStyle: "medium", timeStyle: "short" });
}

const VERIFY_BADGE: Record<string, string> = {
  passed: "adm-badge--green",
  failed: "adm-badge--red",
  pending: "adm-badge--muted",
};

const VERIFY_LABEL: Record<string, string> = {
  passed: "Verificado",
  failed: "Falló",
  pending: "Sin verificar",
};

export default function AdminBackupsPage() {
  const [items, setItems] = useState<BackupRecordDto[]>([]);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>(""); // "create" | `verify:<id>`
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    listBackups()
      .then((res) => {
        setItems(res.data.items);
        setLastBackupAt(res.data.lastBackupAt);
        setLastVerifiedAt(res.data.lastVerifiedAt);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = () => {
    setBusy("create");
    setError("");
    createBackup()
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo crear el respaldo"))
      .finally(() => setBusy(""));
  };

  const handleVerify = (id: string) => {
    setBusy(`verify:${id}`);
    setError("");
    verifyBackup(id)
      .then(() => load())
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudo verificar el respaldo"))
      .finally(() => setBusy(""));
  };

  const verifiedCount = items.filter((b) => b.verifyStatus === "passed").length;

  return (
    <>
      <div className="adm-toolbar" style={{ justifyContent: "space-between" }}>
        <div>
          <h1 className="adm-title">Respaldos y restauración</h1>
          <p className="adm-sub">
            Respaldos cifrados (AES-256-GCM) de la base de datos y restauración probada por ciclo.
          </p>
        </div>
        <button
          type="button"
          className="adm-pill adm-pill--cta"
          onClick={handleCreate}
          disabled={busy === "create"}
        >
          {busy === "create" ? <Loader2 size={15} className="adm-spin" /> : <DatabaseBackup size={15} />}
          {busy === "create" ? "Creando…" : "Crear respaldo"}
        </button>
      </div>

      {error ? <div className="adm-empty adm-empty--error">{error}</div> : null}

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat__value">{items.length}</div>
          <div className="adm-stat__label">Respaldos</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__value">{verifiedCount}</div>
          <div className="adm-stat__label">Verificados</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__value" style={{ fontSize: 15 }}>{formatDate(lastBackupAt)}</div>
          <div className="adm-stat__label">Último respaldo</div>
        </div>
        <div className={`adm-stat ${lastVerifiedAt ? "" : "adm-stat--dark"}`}>
          <div className="adm-stat__value" style={{ fontSize: 15 }}>{formatDate(lastVerifiedAt)}</div>
          <div className="adm-stat__label">Última verificación</div>
        </div>
      </div>

      <div className="adm-table">
        <div
          className="adm-trow adm-trow--head"
          style={{ gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.4fr 1fr" }}
        >
          <span>Respaldo</span>
          <span>Tamaño</span>
          <span>Colecciones</span>
          <span>Creado</span>
          <span>Restauración</span>
          <span></span>
        </div>

        {loading && items.length === 0 ? (
          <div className="adm-empty">Cargando…</div>
        ) : items.length === 0 ? (
          <div className="adm-empty">
            Aún no hay respaldos. Crea el primero o programa el cron (<code>bun scripts/backup.ts create</code>).
          </div>
        ) : (
          items.map((b) => {
            const totalDocs = b.collections.reduce((sum, c) => sum + c.count, 0);
            const verifying = busy === `verify:${b.id}`;
            return (
              <div
                key={b.id}
                className="adm-trow"
                style={{ gridTemplateColumns: "2fr 1fr 1fr 1.2fr 1.4fr 1fr" }}
              >
                <span className="adm-cell--strong" style={{ fontSize: 12, wordBreak: "break-all" }}>
                  {b.fileName}
                </span>
                <span>{formatBytes(b.sizeBytes)}</span>
                <span className="adm-cell--muted">
                  {b.collections.length} · {totalDocs} docs
                </span>
                <span className="adm-cell--muted" style={{ fontSize: 12 }}>{formatDate(b.createdAt)}</span>
                <span>
                  <span className={`adm-badge ${VERIFY_BADGE[b.verifyStatus] ?? "adm-badge--muted"}`}>
                    {b.verifyStatus === "passed" ? (
                      <ShieldCheck size={13} style={{ verticalAlign: "-2px" }} />
                    ) : b.verifyStatus === "failed" ? (
                      <ShieldAlert size={13} style={{ verticalAlign: "-2px" }} />
                    ) : null}{" "}
                    {VERIFY_LABEL[b.verifyStatus] ?? b.verifyStatus}
                  </span>
                  {b.lastVerifiedAt ? (
                    <div className="adm-cell--muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {formatDate(b.lastVerifiedAt)}
                    </div>
                  ) : null}
                </span>
                <span>
                  <button
                    type="button"
                    className="adm-pill"
                    onClick={() => handleVerify(b.id)}
                    disabled={verifying}
                  >
                    {verifying ? <Loader2 size={13} className="adm-spin" /> : <RefreshCw size={13} />}
                    {verifying ? "Verificando…" : "Verificar"}
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
