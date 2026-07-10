import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import "./admin.css";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/** GET /api/v1/metrics — ver `middleware/metrics.ts#getMetrics`. */
interface Metrics {
  totalRequests?: number;
  totalErrors?: number;
  averageLatency?: number;
  requestsByPath?: Record<string, number>;
}

/** GET /api/v1/health */
interface Health {
  status?: string;
  service?: string;
  version?: string;
  timestamp?: string;
  uptime?: number;
}

/** GET /api/v1/health/live */
interface Live {
  status?: string;
}

/** GET /api/v1/health/ready — `checks` son strings ("ok" | "fail" | "not_configured"). */
interface Ready {
  status?: string;
  checks?: Record<string, string>;
  timestamp?: string;
}

const CHECK_LABELS: Record<string, string> = {
  database: "Base de datos",
  stripe: "Stripe",
};

function formatUptime(seconds?: number): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return "—";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function Probe({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="adm-probe">
      <span className={`adm-probe__dot ${ok ? "is-ok" : "is-bad"}`} aria-hidden="true" />
      <div>
        <div className="adm-probe__label">{label}</div>
        <div className="adm-probe__value">{value}</div>
      </div>
    </div>
  );
}

export default function AdminObservabilityPage() {
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [live, setLive] = useState<Live | null>(null);
  const [ready, setReady] = useState<Ready | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const buildHeaders = async (): Promise<Record<string, string>> => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = await getToken().catch(() => null);
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else if (import.meta.env.DEV) {
        headers["x-dev-role"] = "admin";
        headers["x-dev-user-id"] = "web_dev_admin";
      }
      return headers;
    };

    // Desenvuelve `{ ok, data }` y devuelve null si la respuesta no fue exitosa,
    // para que un 401/403 se muestre como error y no como pantalla vacía.
    const fetchJson = async <T,>(path: string, headers: Record<string, string>): Promise<T | null> => {
      const res = await fetch(`${BASE_URL}${path}`, { headers });
      const body = await res.json().catch(() => null);
      if (!res.ok || body?.ok === false) return null;
      return (body?.data ?? body) as T;
    };

    const fetchData = async () => {
      try {
        const headers = await buildHeaders();
        const [m, h, l, r] = await Promise.all([
          fetchJson<Metrics>("/api/v1/metrics", headers).catch(() => null),
          fetchJson<Health>("/api/v1/health", headers).catch(() => null),
          fetchJson<Live>("/api/v1/health/live", headers).catch(() => null),
          fetchJson<Ready>("/api/v1/health/ready", headers).catch(() => null),
        ]);
        if (!active) return;

        setMetrics(m);
        setHealth(h);
        setLive(l);
        setReady(r);
        // `/metrics` exige rol admin: si no llega, avisamos en vez de mostrar ceros.
        setError(m ? "" : "No pudimos cargar las métricas. Verifica que tu cuenta tenga permisos de admin.");
      } catch {
        if (active) setError("No pudimos cargar los datos de observabilidad.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [getToken]);

  const totalRequests = metrics?.totalRequests ?? 0;
  const totalErrors = metrics?.totalErrors ?? 0;
  const errorRate = metrics
    ? totalRequests > 0
      ? ((totalErrors / totalRequests) * 100).toFixed(1)
      : "0.0"
    : "—";
  const avgLatency =
    typeof metrics?.averageLatency === "number" ? `${Math.round(metrics.averageLatency)}ms` : "—";

  const healthOk = health?.status === "ok";
  const liveOk = live?.status === "ok";
  const readyOk = ready?.status === "ok";
  const checks = Object.entries(ready?.checks ?? {});

  return (
    <>
      <h1 className="adm-title">Observabilidad</h1>
      <p className="adm-sub">Métricas, salud del sistema y estado en tiempo real.</p>

      {loading && <div className="adm-empty">Cargando…</div>}
      {error && <div className="adm-empty adm-empty--error">{error}</div>}

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat__value">{metrics ? totalRequests : "—"}</div>
          <div className="adm-stat__label">Solicitudes totales</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__value">{errorRate}{metrics ? "%" : ""}</div>
          <div className="adm-stat__label">Tasa de errores</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat__value">{avgLatency}</div>
          <div className="adm-stat__label">Latencia media</div>
        </div>
        <div className="adm-stat adm-stat--dark">
          <div className="adm-stat__value">{health ? (healthOk ? "OK" : "Falla") : "—"}</div>
          <div className="adm-stat__label">Estado del servicio</div>
        </div>
      </div>

      <div className="adm-row">
        <section className="adm-panel">
          <h2 className="adm-panel__title">Sondas de salud</h2>
          <div className="adm-probes">
            <Probe label="Liveness" value={live?.status ?? "desconocido"} ok={liveOk} />
            <Probe label="Readiness" value={ready?.status ?? "desconocido"} ok={readyOk} />
            <Probe label="Health" value={health?.status ?? "desconocido"} ok={healthOk} />
          </div>

          {checks.length > 0 && (
            <>
              <h3 className="adm-panel__title" style={{ fontSize: 15, marginTop: 22 }}>Dependencias</h3>
              <div className="adm-deps">
                {checks.map(([key, value]) => (
                  <div key={key} className="adm-deps__row">
                    <span>{CHECK_LABELS[key] ?? key}</span>
                    <span className={`adm-badge ${value === "ok" ? "adm-badge--green" : "adm-badge--amber"}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="adm-panel">
          <h2 className="adm-panel__title">Información del sistema</h2>
          <div className="adm-deps">
            <div className="adm-deps__row">
              <span>Servicio</span>
              <span className="adm-cell--muted">{health?.service ?? "—"}</span>
            </div>
            <div className="adm-deps__row">
              <span>Versión</span>
              <span className="adm-cell--muted">{health?.version ?? "—"}</span>
            </div>
            <div className="adm-deps__row">
              <span>Uptime</span>
              <span className="adm-cell--muted">{formatUptime(health?.uptime)}</span>
            </div>
            <div className="adm-deps__row">
              <span>Última actualización</span>
              <span className="adm-cell--muted">
                {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString("es-PA") : "—"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
