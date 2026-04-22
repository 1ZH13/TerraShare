import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import {
  getAuditEvents,
  getAuthMe,
  getPendingLands,
  getUsers,
  moderateLand,
  pingAdmin,
  setUserStatus,
} from "./services/adminApi";

const TOKEN_KEY = "terrashare.admin.token";

const defaultDashboardData = {
  loading: false,
  error: "",
  lands: [],
  users: [],
  auditEvents: [],
  actionLoading: {},
};

function readStoredToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(TOKEN_KEY)?.trim() || "";
}

function persistToken(token) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

function clearPersistedToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

function RootRedirect({ status }) {
  if (status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }
  if (status === "forbidden") {
    return <Navigate to="/forbidden" replace />;
  }
  return <Navigate to="/login" replace />;
}

function GuardedRoute({ session, onRetry, children }) {
  if (session.status === "loading") {
    return <LoadingScreen />;
  }

  if (session.status === "error") {
    return <ErrorScreen errorMessage={session.error} onRetry={onRetry} />;
  }

  if (session.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  if (session.status === "forbidden") {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
}

function LoginPage({ session, token, onSubmitToken }) {
  const [tokenInput, setTokenInput] = useState(token);

  useEffect(() => {
    setTokenInput(token);
  }, [token]);

  if (session.status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  if (session.status === "forbidden") {
    return <Navigate to="/forbidden" replace />;
  }

  const submitLogin = (event) => {
    event.preventDefault();
    onSubmitToken(tokenInput);
  };

  return (
    <main className="screen login-screen">
      <div className="glow-layer" aria-hidden="true" />
      <section className="login-panel">
        <p className="eyebrow">TerraShare Administration</p>
        <h1>Acceso administrativo</h1>
        <p>
          Esta vista valida tu sesion contra los endpoints reales del backend:
          <span className="inline-code"> GET /api/v1/auth/me </span>
          y
          <span className="inline-code"> GET /api/v1/auth/admin/ping</span>.
        </p>

        <form onSubmit={submitLogin} className="token-form">
          <label htmlFor="admin-token">Token de sesion Clerk</label>
          <textarea
            id="admin-token"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Pega aqui tu bearer token"
            rows={5}
            required
          />

          <button
            className="btn btn-primary"
            type="submit"
            disabled={!tokenInput.trim() || session.status === "loading"}
          >
            {session.status === "loading" ? "Validando..." : "Validar acceso admin"}
          </button>

          {session.error ? <p className="feedback error">{session.error}</p> : null}
        </form>
      </section>
    </main>
  );
}

function ForbiddenPage({ session, onLogout }) {
  if (session.status === "authenticated") {
    return <Navigate to="/dashboard" replace />;
  }

  if (session.status === "anonymous") {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="screen state-screen">
      <section className="state-card">
        <p className="eyebrow">RBAC check</p>
        <h1>Acceso denegado</h1>
        <p>
          Tu token es valido, pero el usuario no tiene rol admin. Solicita
          elevacion de permisos antes de usar el panel.
        </p>
        {session.user ? (
          <p className="meta-row">
            Sesion actual: {session.user.email} ({session.user.role})
          </p>
        ) : null}
        <div className="button-row">
          <button className="btn btn-primary" type="button" onClick={onLogout}>
            Usar otro token
          </button>
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="screen state-screen">
      <section className="state-card">
        <p className="eyebrow">Session bootstrap</p>
        <h1>Validando permisos</h1>
        <p>Consultando sesion y rol de administrador...</p>
      </section>
    </main>
  );
}

function ErrorScreen({ errorMessage, onRetry }) {
  return (
    <main className="screen state-screen">
      <section className="state-card">
        <p className="eyebrow">Integration error</p>
        <h1>No pudimos validar la sesion</h1>
        <p>{errorMessage || "Error inesperado al consultar backend-api."}</p>
        <div className="button-row">
          <button className="btn btn-primary" type="button" onClick={onRetry}>
            Reintentar
          </button>
        </div>
      </section>
    </main>
  );
}

function AdminDashboardPage({
  user,
  dashboardData,
  onModerateLand,
  onUpdateUserStatus,
  onReloadData,
  onLogout,
}) {
  const metrics = useMemo(
    () => [
      {
        label: "Pendientes de moderacion",
        value: String(dashboardData.lands.length),
      },
      {
        label: "Usuarios bloqueados",
        value: String(dashboardData.users.filter((item) => item.status === "blocked").length),
      },
      {
        label: "Eventos audit recientes",
        value: String(dashboardData.auditEvents.length),
      },
    ],
    [dashboardData.auditEvents.length, dashboardData.lands.length, dashboardData.users],
  );

  return (
    <div className="shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">Admin control center</p>
          <h1>Panel de operaciones admin</h1>
          <p className="meta-row">
            Sesion: {user.profile.fullName} ({user.email})
          </p>
        </div>
        <button className="btn btn-ghost" type="button" onClick={onLogout}>
          Cerrar sesion
        </button>
      </header>

      <main className="panel-stack">
        {dashboardData.error ? (
          <section className="feature-card" aria-live="polite">
            <p className="feedback error">{dashboardData.error}</p>
          </section>
        ) : null}

        <section className="metric-grid" aria-label="Resumen operativo">
          {metrics.map((metric) => (
            <article key={metric.label} className="metric-card">
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="feature-grid">
          <article className="feature-card">
            <div className="card-head">
              <h2>Moderacion de publicaciones</h2>
              <span className="pill">Base issue #21</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Titulo</th>
                  <th>Propietario</th>
                  <th>Estado</th>
                  <th>Accion</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.lands.map((item) => {
                  const approveKey = `land:${item.id}:approve`;
                  const rejectKey = `land:${item.id}:reject`;
                  const isBusy =
                    dashboardData.actionLoading[approveKey] ||
                    dashboardData.actionLoading[rejectKey];

                  return (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.owner?.email || item.ownerId}</td>
                      <td>{item.status}</td>
                      <td className="action-cell">
                        <button
                          className="btn btn-mini"
                          type="button"
                          onClick={() => onModerateLand(item.id, "approve")}
                          disabled={isBusy}
                        >
                          {dashboardData.actionLoading[approveKey] ? "Aprobando..." : "Aprobar"}
                        </button>
                        <button
                          className="btn btn-mini"
                          type="button"
                          onClick={() => onModerateLand(item.id, "reject")}
                          disabled={isBusy}
                        >
                          {dashboardData.actionLoading[rejectKey] ? "Rechazando..." : "Rechazar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!dashboardData.lands.length ? (
                  <tr>
                    <td colSpan={4}>
                      {dashboardData.loading
                        ? "Cargando publicaciones pendientes..."
                        : "No hay publicaciones pendientes de moderacion."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>

          <article className="feature-card">
            <div className="card-head">
              <h2>Gestion de usuarios</h2>
              <span className="pill">Base issue #22</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Operacion</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.users.map((item) => {
                  const nextStatus = item.status === "blocked" ? "active" : "blocked";
                  const actionKey = `user:${item.id}:${nextStatus}`;
                  const isBusy = dashboardData.actionLoading[actionKey];
                  const canManage = item.role !== "admin";

                  return (
                    <tr key={item.id}>
                      <td>{item.email}</td>
                      <td>{item.role}</td>
                      <td>{item.status}</td>
                      <td>
                        <button
                          className="btn btn-mini"
                          type="button"
                          onClick={() => onUpdateUserStatus(item.id, nextStatus)}
                          disabled={!canManage || isBusy}
                        >
                          {isBusy
                            ? "Guardando..."
                            : item.status === "blocked"
                              ? "Reactivar"
                              : "Suspender"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!dashboardData.users.length ? (
                  <tr>
                    <td colSpan={4}>
                      {dashboardData.loading ? "Cargando usuarios..." : "No hay usuarios para mostrar."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </article>
        </section>

        <section className="feature-card">
          <div className="card-head">
            <h2>Auditoria basica</h2>
            <div className="button-row">
              <span className="pill">Issue #3 fase 1</span>
              <button className="btn btn-mini" type="button" onClick={onReloadData}>
                Recargar
              </button>
            </div>
          </div>
          <ul className="audit-list">
            {dashboardData.auditEvents.map((event) => (
              <li key={event.id}>
                <p>
                  <strong>{event.action}</strong> sobre <strong>{event.entity}</strong>
                </p>
                <p>
                  actor: {event.actorId || "unknown"} | fecha: {event.createdAt}
                </p>
              </li>
            ))}
            {!dashboardData.auditEvents.length ? (
              <li>
                <p>{dashboardData.loading ? "Cargando auditoria..." : "Sin eventos de auditoria."}</p>
              </li>
            ) : null}
          </ul>
        </section>
      </main>
    </div>
  );
}

function App() {
  const [token, setToken] = useState(() => readStoredToken());
  const [reloadCounter, setReloadCounter] = useState(0);
  const [dashboardReloadCounter, setDashboardReloadCounter] = useState(0);
  const [session, setSession] = useState({
    status: token ? "loading" : "anonymous",
    user: null,
    error: "",
  });
  const [dashboardData, setDashboardData] = useState(defaultDashboardData);

  useEffect(() => {
    let cancelled = false;

    const syncSession = async () => {
      if (!token) {
        setSession((current) => ({
          status: "anonymous",
          user: null,
          error: current.status === "anonymous" ? current.error : "",
        }));
        return;
      }

      setSession({
        status: "loading",
        user: null,
        error: "",
      });

      const meResult = await getAuthMe(token);
      if (cancelled) {
        return;
      }

      if (!meResult.ok) {
        clearPersistedToken();
        setToken("");
        setSession({
          status: "anonymous",
          user: null,
          error: meResult.message,
        });
        return;
      }

      const adminResult = await pingAdmin(token);
      if (cancelled) {
        return;
      }

      if (!adminResult.ok) {
        if (adminResult.status === 403) {
          setSession({
            status: "forbidden",
            user: meResult.data,
            error: adminResult.message,
          });
          return;
        }

        if (adminResult.status === 401) {
          clearPersistedToken();
          setToken("");
          setSession({
            status: "anonymous",
            user: null,
            error: adminResult.message,
          });
          return;
        }

        setSession({
          status: "error",
          user: meResult.data,
          error: adminResult.message,
        });
        return;
      }

      setSession({
        status: "authenticated",
        user: meResult.data,
        error: "",
      });
    };

    syncSession();

    return () => {
      cancelled = true;
    };
  }, [token, reloadCounter]);

  useEffect(() => {
    let cancelled = false;

    const loadDashboardData = async () => {
      if (session.status !== "authenticated" || !token) {
        return;
      }

      setDashboardData((current) => ({
        ...current,
        loading: true,
        error: "",
      }));

      const [landsResult, usersResult, auditResult] = await Promise.all([
        getPendingLands(token),
        getUsers(token),
        getAuditEvents(token),
      ]);

      if (cancelled) {
        return;
      }

      const unauthorizedResult = [landsResult, usersResult, auditResult].find(
        (result) => !result.ok && result.status === 401,
      );

      if (unauthorizedResult) {
        clearPersistedToken();
        setToken("");
        setSession({
          status: "anonymous",
          user: null,
          error: unauthorizedResult.message,
        });
        setDashboardData(defaultDashboardData);
        return;
      }

      const forbiddenResult = [landsResult, usersResult, auditResult].find(
        (result) => !result.ok && result.status === 403,
      );

      if (forbiddenResult) {
        setSession((current) => ({
          status: "forbidden",
          user: current.user,
          error: forbiddenResult.message,
        }));
        return;
      }

      const errors = [landsResult, usersResult, auditResult]
        .filter((result) => !result.ok)
        .map((result) => result.message);

      setDashboardData((current) => ({
        ...current,
        loading: false,
        error: errors.join(" | "),
        lands: landsResult.ok ? landsResult.data : [],
        users: usersResult.ok ? usersResult.data : [],
        auditEvents: auditResult.ok ? auditResult.data.slice(0, 15) : [],
      }));
    };

    loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [session.status, token, dashboardReloadCounter]);

  const submitToken = (rawToken) => {
    const nextToken = rawToken.trim();
    if (!nextToken) {
      setSession((current) => ({
        ...current,
        error: "Ingresa un token valido.",
      }));
      return;
    }

    persistToken(nextToken);
    setToken(nextToken);
  };

  const logout = () => {
    clearPersistedToken();
    setSession({
      status: "anonymous",
      user: null,
      error: "",
    });
    setDashboardData(defaultDashboardData);
    setToken("");
  };

  const retry = () => {
    setReloadCounter((value) => value + 1);
  };

  const reloadDashboardData = () => {
    setDashboardReloadCounter((value) => value + 1);
  };

  const setActionLoading = (actionKey, isLoading) => {
    setDashboardData((current) => ({
      ...current,
      actionLoading: {
        ...current.actionLoading,
        [actionKey]: isLoading,
      },
    }));
  };

  const setUnauthorizedSession = (message) => {
    clearPersistedToken();
    setToken("");
    setSession({
      status: "anonymous",
      user: null,
      error: message,
    });
    setDashboardData(defaultDashboardData);
  };

  const handleModerateLand = async (landId, decision) => {
    if (!token) {
      return;
    }

    const actionKey = `land:${landId}:${decision}`;
    setActionLoading(actionKey, true);

    const result = await moderateLand(token, landId, decision);

    setActionLoading(actionKey, false);

    if (!result.ok) {
      if (result.status === 401) {
        setUnauthorizedSession(result.message);
        return;
      }

      setDashboardData((current) => ({
        ...current,
        error: result.message,
      }));
      return;
    }

    reloadDashboardData();
  };

  const handleUpdateUserStatus = async (userId, status) => {
    if (!token) {
      return;
    }

    const actionKey = `user:${userId}:${status}`;
    setActionLoading(actionKey, true);

    const result = await setUserStatus(token, userId, status);

    setActionLoading(actionKey, false);

    if (!result.ok) {
      if (result.status === 401) {
        setUnauthorizedSession(result.message);
        return;
      }

      setDashboardData((current) => ({
        ...current,
        error: result.message,
      }));
      return;
    }

    reloadDashboardData();
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage session={session} token={token} onSubmitToken={submitToken} />}
      />
      <Route
        path="/forbidden"
        element={<ForbiddenPage session={session} onLogout={logout} />}
      />
      <Route
        path="/dashboard"
        element={
          <GuardedRoute session={session} onRetry={retry}>
            <AdminDashboardPage
              user={session.user}
              dashboardData={dashboardData}
              onModerateLand={handleModerateLand}
              onUpdateUserStatus={handleUpdateUserStatus}
              onReloadData={reloadDashboardData}
              onLogout={logout}
            />
          </GuardedRoute>
        }
      />
      <Route path="/" element={<RootRedirect status={session.status} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
