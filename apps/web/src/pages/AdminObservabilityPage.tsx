import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/tanstack-react-start";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

interface Metrics {
  requests: { total: number; errors: number };
  responseTimeP99: number;
}

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime?: number;
  checks?: Record<string, boolean>;
}

interface LiveStatus {
  status: string;
}

export default function AdminObservabilityPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [live, setLive] = useState<LiveStatus | null>(null);
  const [ready, setReady] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const buildHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    else if (import.meta.env.DEV) { headers["x-dev-role"] = "admin"; headers["x-dev-user-id"] = "web_dev_admin"; }
    return headers;
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const headers = await buildHeaders();
      const [metricsRes, healthRes, liveRes, readyRes] = await Promise.allSettled([
        fetch(`${BASE_URL}/api/v1/metrics`, { headers }).then((r) => r.json()),
        fetch(`${BASE_URL}/api/v1/health`, { headers }).then((r) => r.json()),
        fetch(`${BASE_URL}/api/v1/health/live`, { headers }).then((r) => r.json()),
        fetch(`${BASE_URL}/api/v1/health/ready`, { headers }).then((r) => r.json()),
      ]);

      if (metricsRes.status === "fulfilled") {
        const raw = metricsRes.value?.data || metricsRes.value;
        setMetrics(raw?.metrics || raw);
      }
      if (healthRes.status === "fulfilled") setHealth(healthRes.value?.data || healthRes.value);
      if (liveRes.status === "fulfilled") setLive(liveRes.value?.data || liveRes.value);
      if (readyRes.status === "fulfilled") setReady(readyRes.value?.data || readyRes.value);
    } catch {
      setError("Error fetching observability data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const errorRate = metrics
    ? metrics.requests.total > 0
      ? ((metrics.requests.errors / metrics.requests.total) * 100).toFixed(1)
      : "0.0"
    : "—";

  return (
    <div>
      <div className="section-header">
        <h1>Observabilidad</h1>
        <p>Métricas, salud del sistema y estado en tiempo real</p>
      </div>

      {loading && <div style={{ marginTop: "1.5rem", textAlign: "center", opacity: 0.6 }}>Cargando...</div>}
      {error && <div style={{ marginTop: "1.5rem", color: "var(--danger)" }}>{error}</div>}

      <div className="stats-grid" style={{ marginTop: "1.5rem" }}>
        <div className="glass-card">
          <div className="stat-value" style={{ color: "var(--leaf-700)" }}>{metrics?.requests.total ?? "—"}</div>
          <div className="stat-label">Requests totales</div>
        </div>
        <div className="glass-card">
          <div className="stat-value" style={{ color: "var(--danger)" }}>{errorRate}%</div>
          <div className="stat-label">Tasa de errores</div>
        </div>
        <div className="glass-card">
          <div className="stat-value" style={{ color: "var(--river-500)" }}>{metrics?.responseTimeP99 ?? "—"}ms</div>
          <div className="stat-label">P99 latencia</div>
        </div>
        <div className="glass-card">
          <div className="stat-value" style={{ color: health?.status === "ok" ? "var(--leaf-700)" : "var(--danger)" }}>
            {health?.status === "ok" ? "✓" : "✗"}
          </div>
          <div className="stat-label">Health status</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem" }}>Sondas de salud</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div className="glass-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", color: live?.status === "alive" ? "var(--leaf-700)" : "var(--danger)" }}>
              {live?.status === "alive" ? "●" : "○"}
            </div>
            <div style={{ fontWeight: 600 }}>Liveness</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>{live?.status || "Unknown"}</div>
          </div>
          <div className="glass-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", color: ready?.status === "ready" ? "var(--leaf-700)" : "var(--danger)" }}>
              {ready?.status === "ready" ? "●" : "○"}
            </div>
            <div style={{ fontWeight: 600 }}>Readiness</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>{ready?.status || "Unknown"}</div>
          </div>
          <div className="glass-card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", color: health?.status === "ok" ? "var(--leaf-700)" : "var(--danger)" }}>
              {health?.status === "ok" ? "●" : "○"}
            </div>
            <div style={{ fontWeight: 600 }}>Health</div>
            <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>{health?.status || "Unknown"}</div>
          </div>
        </div>
      </div>

      {health?.checks && (
        <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem" }}>Dependencias</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {Object.entries(health.checks).map(([key, ok]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{key}</span>
                <span style={{ color: ok ? "var(--leaf-700)" : "var(--danger)", fontWeight: 600 }}>
                  {ok ? "✓ OK" : "✗ FAIL"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <h3 style={{ margin: "0 0 0.5rem" }}>Información del sistema</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.9rem" }}>
          <div><strong>Uptime:</strong> {health?.uptime ? `${Math.floor(health.uptime / 60)}m` : "—"}</div>
          <div><strong>Última actualización:</strong> {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : "—"}</div>
        </div>
      </div>
    </div>
  );
}
