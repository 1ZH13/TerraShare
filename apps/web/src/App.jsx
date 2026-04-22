import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { api } from "./services/api";
import { setTokenFn as setAdminTokenFn } from "./services/adminApi";

const statusLabels = {
  draft: "Borrador",
  pending_owner: "Pendiente del propietario",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  pending_payment: "Pendiente de pago",
  paid: "Pagada",
};

const buildLoginRedirect = (targetPath) => `/login?next=${encodeURIComponent(targetPath)}`;

const buildCurrentUser = (sessionUser) => {
  if (!sessionUser) {
    return null;
  }

  return {
    id: sessionUser.id,
    email: sessionUser.email,
    role: sessionUser.role,
    profile: {
      fullName: sessionUser.name,
    },
  };
};

function Toast({ toast, onClose }) {
  if (!toast) {
    return null;
  }

  return (
    <aside className={`toast toast-${toast.type}`} role="status" aria-live="polite">
      <div>
        <strong>{toast.type === "error" ? "Error" : "Listo"}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" className="text-button" onClick={onClose}>
        Cerrar
      </button>
    </aside>
  );
}

function ProductLayout({ currentUser, onLogout, children }) {
  const location = useLocation();

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu" aria-label="Navegacion principal">
          <NavLink to="/catalog" className={({ isActive }) => (isActive ? "active" : "")}>Catalogo</NavLink>
          {currentUser ? (
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>Dashboard</NavLink>
          ) : null}
          {currentUser ? (
            <NavLink to="/my-requests" className={({ isActive }) => (isActive ? "active" : "")}>Mis solicitudes</NavLink>
          ) : null}
          {currentUser?.role === "owner" ? (
            <NavLink to="/owner/requests" className={({ isActive }) => (isActive ? "active" : "")}>Gestion propietario</NavLink>
          ) : null}
        </nav>

        <div className="auth-actions">
          {currentUser ? (
            <>
              <p className="session-chip">
                {currentUser.profile.fullName} · {currentUser.role}
              </p>
              <button type="button" className="button ghost-button" onClick={onLogout}>
                Cerrar sesion
              </button>
            </>
          ) : (
            <>
              <Link className="button ghost-button" to={buildLoginRedirect(location.pathname)}>
                Iniciar sesion
              </Link>
              <Link className="button primary-button" to={`/register?next=${encodeURIComponent(location.pathname)}`}>
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

function ProtectedRoute({ currentUser, children }) {
  const location = useLocation();

  if (!currentUser) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginRedirect(next)} replace />;
  }

  return children;
}

function OwnerRoute({ currentUser, children }) {
  if (!currentUser) {
    return <Navigate to={buildLoginRedirect("/owner/requests")} replace />;
  }

  if (currentUser.role !== "owner") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function DashboardPage({ currentUser }) {
  return (
    <section className="panel reveal">
      <header className="section-header compact">
        <p className="kicker">Bienvenido</p>
        <h1>Mi dashboard</h1>
        <p>
          {currentUser.profile.fullName} · {currentUser.email}
        </p>
      </header>

      <div className="cards-grid" style={{ marginTop: "1rem" }}>
        <article className="land-card">
          <h3>Explorar catalogo</h3>
          <p>Busca terrenos por uso, ubicacion y precio.</p>
          <Link to="/catalog" className="btn btn-ghost" style={{ marginTop: "0.5rem" }}>
            Abrir catalogo
          </Link>
        </article>
        <article className="land-card">
          <h3>Mis solicitudes</h3>
          <p>Revisa el estado de tus solicitudes enviadas.</p>
          <Link to="/my-requests" className="btn btn-ghost" style={{ marginTop: "0.5rem" }}>
            Ver solicitudes
          </Link>
        </article>
        {currentUser.role === "owner" ? (
          <article className="land-card">
            <h3>Gestion propietario</h3>
            <p>Aprueba o rechaza solicitudes pendientes de tus terrenos.</p>
            <Link to="/owner/requests" className="btn btn-ghost" style={{ marginTop: "0.5rem" }}>
              Abrir bandeja
            </Link>
          </article>
        ) : null}
      </div>
    </section>
  );
}

function CatalogPage({ currentUser }) {
  const [filters, setFilters] = useState({ type: "all", location: "", maxPrice: "", availableOn: "" });
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const rows = await api.listLands(filters);
        if (active) {
          setLands(rows);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [filters]);

  return (
    <section className="panel reveal">
      <header className="section-header">
        <p className="kicker">Experiencia principal</p>
        <h1>Catalogo de terrenos</h1>
        <p>
          Descubre oportunidades por tipo, precio y disponibilidad. La vista de mapa
          se planifica para siguientes issues; por ahora el enfoque es listado y reserva completa.
        </p>
      </header>

      <div className="filters-grid">
        <label>
          Tipo de terreno
          <select
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
          >
            <option value="all">Todos</option>
            <option value="Agricultura">Agricultura</option>
            <option value="Ganaderia">Ganaderia</option>
            <option value="Mixto">Mixto</option>
          </select>
        </label>

        <label>
          Ubicacion
          <input
            type="text"
            placeholder="Ejemplo: Chiriqui"
            value={filters.location}
            onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
          />
        </label>

        <label>
          Precio maximo (USD)
          <input
            type="number"
            min="1"
            placeholder="Ejemplo: 500"
            value={filters.maxPrice}
            onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
          />
        </label>

        <label>
          Disponible en fecha
          <input
            type="date"
            value={filters.availableOn}
            onChange={(event) => setFilters((prev) => ({ ...prev, availableOn: event.target.value }))}
          />
        </label>
      </div>

      {loading ? <p className="muted">Cargando terrenos...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && lands.length === 0 ? <p className="muted">No hay resultados con esos filtros.</p> : null}

      <div className="cards-grid">
        {lands.map((land) => {
          const reserveTarget = `/reserve/${land.id}`;
          const reserveHref = currentUser ? reserveTarget : buildLoginRedirect(reserveTarget);

          return (
            <article className="land-card" key={land.id}>
              <p className="card-badge">{land.type}</p>
              <h2>{land.name}</h2>
              <p>
                {land.province} · {land.district}
              </p>
              <p>{land.summary}</p>
              <dl>
                <div>
                  <dt>Precio</dt>
                  <dd>${land.monthlyPrice}/mes</dd>
                </div>
                <div>
                  <dt>Area</dt>
                  <dd>{land.areaHectares} ha</dd>
                </div>
                <div>
                  <dt>Disponibilidad</dt>
                  <dd>{land.availableFrom} - {land.availableTo}</dd>
                </div>
              </dl>

              <div className="card-actions">
                <Link to={`/lands/${land.id}`} className="button ghost-button">
                  Ver detalle
                </Link>
                <Link to={reserveHref} className="button primary-button">
                  {currentUser ? "Reservar ahora" : "Inicia sesion para reservar"}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LandDetailPage({ currentUser }) {
  const { landId } = useParams();
  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const rawLand = await api.getLandById(landId);
        if (active) {
          setLand(rawLand);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [landId]);

  if (loading) {
    return (
      <section className="panel reveal">
        <p className="muted">Cargando detalle...</p>
      </section>
    );
  }

  if (error || !land) {
    return (
      <section className="panel reveal">
        <p className="error-text">{error || "Terreno no disponible."}</p>
        <Link to="/catalog" className="button ghost-button inline-button">
          Volver al catalogo
        </Link>
      </section>
    );
  }

  const reserveTarget = `/reserve/${land.id}`;
  const reserveHref = currentUser ? reserveTarget : buildLoginRedirect(reserveTarget);

  return (
    <section className="panel reveal">
      <header className="section-header compact">
        <p className="kicker">Detalle del terreno</p>
        <h1>{land.name}</h1>
        <p>
          {land.province} · {land.district}
        </p>
      </header>

      <div className="detail-grid">
        <article className="detail-card">
          <h2>Condiciones principales</h2>
          <ul>
            <li>Precio base: ${land.monthlyPrice}/mes</li>
            <li>Area: {land.areaHectares} hectareas</li>
            <li>Fuente de agua: {land.waterSource}</li>
            <li>Disponibilidad: {land.availableFrom} - {land.availableTo}</li>
            <li>Usos permitidos: {land.allowedUses.join(", ")}</li>
          </ul>
          <p>{land.summary}</p>
        </article>

        <aside className="detail-card accent-card">
          <h2>Siguiente paso</h2>
          <p>
            Para reservar debes indicar periodo y uso propuesto. El propietario puede aprobar o rechazar directamente en su bandeja de solicitudes.
          </p>
          <Link to={reserveHref} className="button primary-button">
            {currentUser ? "Ir a reserva" : "Inicia sesion para reservar"}
          </Link>
        </aside>
      </div>
    </section>
  );
}

function ReservePage({ currentUser, setToast }) {
  const navigate = useNavigate();
  const { landId } = useParams();
  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ startDate: "", endDate: "", intendedUse: "", message: "" });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const rawLand = await api.getLandById(landId);
        if (active) {
          setLand(rawLand);
        }
      } catch (loadError) {
        if (active) {
          setToast({ type: "error", message: loadError.message });
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [landId, setToast]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const rawRequest = await api.createRentalRequest({
        tenantId: currentUser.id,
        landId,
        startDate: form.startDate,
        endDate: form.endDate,
        intendedUse: form.intendedUse,
        message: form.message,
      });

      setToast({
        type: "success",
        message: `Solicitud enviada (${rawRequest?.id ?? "OK"}). Espera la decision del propietario.`,
      });
      navigate(`/my-requests?created=${rawRequest?.id ?? ""}`, { replace: true });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="panel reveal">
        <p className="muted">Preparando formulario de reserva...</p>
      </section>
    );
  }

  if (!land) {
    return (
      <section className="panel reveal">
        <p className="error-text">No se encontro el terreno para reservar.</p>
      </section>
    );
  }

  return (
    <section className="panel reveal">
      <header className="section-header compact">
        <p className="kicker">Reserva</p>
        <h1>Solicitar alquiler</h1>
        <p>
          {land.name} · {land.province}
        </p>
      </header>

      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="split-grid">
          <label>
            Fecha de inicio
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
              required
            />
          </label>

          <label>
            Fecha de fin
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
              required
            />
          </label>
        </div>

        <label>
          Uso propuesto
          <input
            type="text"
            value={form.intendedUse}
            onChange={(event) => setForm((prev) => ({ ...prev, intendedUse: event.target.value }))}
            placeholder="Ejemplo: cultivo de cacao"
            required
          />
        </label>

        <label>
          Mensaje para el propietario
          <textarea
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            placeholder="Cuenta detalles operativos o tiempos de inicio"
            rows={4}
          />
        </label>

        <button type="submit" className="button primary-button" disabled={submitting}>
          {submitting ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>
    </section>
  );
}

function MyRequestsPage({ currentUser }) {
  const [searchParams] = useSearchParams();
  const createdId = searchParams.get("created");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const rows = await api.listTenantRequests(currentUser.id);
        if (active) {
          setRequests(rows);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [currentUser.id]);

  return (
    <section className="panel reveal">
      <header className="section-header compact">
        <p className="kicker">Seguimiento</p>
        <h1>Mis solicitudes</h1>
        <p>Revisa estados y fechas de tus solicitudes enviadas.</p>
      </header>

      {loading ? <p className="muted">Cargando solicitudes...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && requests.length === 0 ? <p className="muted">Aun no has enviado solicitudes de alquiler.</p> : null}

      <div className="request-list">
        {requests.map((item) => (
          <article className={`request-item ${createdId === item.id ? "request-highlight" : ""}`} key={item.id}>
            <div className="request-top">
              <h2>{item.landName}</h2>
              <span className={`status-pill status-${item.status}`}>{statusLabels[item.status] || item.status}</span>
            </div>
            <p className="muted">ID: {item.id}</p>
            <p>Periodo: {item.startDate} - {item.endDate}</p>
            <p>Uso: {item.intendedUse}</p>
            <p>Actualizado: {item.updatedAt}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OwnerRequestsPage({ currentUser, setToast }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const rows = await api.listOwnerRequests(currentUser.id);
      setRequests(rows);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  const handleDecision = async (requestId, status) => {
    setBusyRequestId(requestId);

    try {
      const updated = await api.updateRentalRequestStatus({ ownerId: currentUser.id, requestId, status });
      setRequests((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setToast({ type: "success", message: `Solicitud ${updated.id} actualizada a ${statusLabels[updated.status]}.` });
    } catch (updateError) {
      setToast({ type: "error", message: updateError.message });
    } finally {
      setBusyRequestId("");
    }
  };

  return (
    <section className="panel reveal">
      <header className="section-header compact">
        <p className="kicker">Gestion propietario</p>
        <h1>Bandeja de solicitudes</h1>
        <p>Desde aqui puedes aprobar o rechazar solicitudes pendientes de tus terrenos.</p>
      </header>

      {loading ? <p className="muted">Cargando bandeja...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && requests.length === 0 ? <p className="muted">No tienes solicitudes asociadas por ahora.</p> : null}

      <div className="request-list">
        {requests.map((item) => {
          const isPending = item.status === "pending_owner";
          const isBusy = busyRequestId === item.id;

          return (
            <article className="request-item" key={item.id}>
              <div className="request-top">
                <h2>{item.landName}</h2>
                <span className={`status-pill status-${item.status}`}>{statusLabels[item.status] || item.status}</span>
              </div>
              <p className="muted">Solicitud: {item.id}</p>
              <p>
                Arrendatario: {item.tenantName} ({item.tenantEmail})
              </p>
              <p>Periodo: {item.startDate} - {item.endDate}</p>
              <p>Uso propuesto: {item.intendedUse}</p>
              <p>Actualizado: {item.updatedAt}</p>

              {isPending ? (
                <div className="inline-actions">
                  <button type="button" className="button success-button" disabled={isBusy} onClick={() => handleDecision(item.id, "approved")}>Aprobar</button>
                  <button type="button" className="button danger-button" disabled={isBusy} onClick={() => handleDecision(item.id, "rejected")}>Rechazar</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AdminRoute({ children }) {
  const { isLoaded } = useUser();
  const { isSignedIn, user } = useUser();

  if (!isLoaded) {
    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.publicMetadata?.role;
  if (userRole !== "admin") {
    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <h1>Acceso denegado</h1>
          <p>No tienes permisos de administrador.</p>
          <Link to="/dashboard" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
            Volver al dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

function AdminLayout({ children, onSignOut }) {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <Link to="/dashboard/admin" className="brand">TerraShare Admin</Link>
        <nav>
          <Link to="/dashboard/admin" className={currentPath === "/dashboard/admin" ? "active" : ""}>Dashboard</Link>
          <Link to="/dashboard/admin/users" className={currentPath === "/dashboard/admin/users" ? "active" : ""}>Usuarios</Link>
          <Link to="/dashboard/admin/lands" className={currentPath === "/dashboard/admin/lands" ? "active" : ""}>Terrenos</Link>
        </nav>
        <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
          <button className="btn btn-ghost" onClick={onSignOut} style={{ width: "100%", color: "white", borderColor: "rgba(255,255,255,0.3)" }}>
            Cerrar sesion
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

function AdminDashboardPage() {
  const [counts, setCounts] = useState({ total: 0, active: 0, blocked: 0, lands: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;

    user.getToken().then((token) => setAdminTokenFn(() => token));
    import("./services/adminApi").then(({ listAdminUsers, listAdminLands }) => {
      Promise.all([
        listAdminUsers({}).then((response) => response.data?.items ?? []),
        listAdminLands({ status: "draft" }).then((response) => response.data?.items ?? []),
      ]).then(([users, landsDraft]) => {
        setCounts({
          total: users.length,
          active: users.filter((item) => item.status === "active").length,
          blocked: users.filter((item) => item.status === "blocked").length,
          lands: landsDraft.length,
        });
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [user]);

  return (
    <div>
      <div className="section-header">
        <h1>Panel de Administracion</h1>
        <p>Gestion de usuarios y plataforma</p>
      </div>
      <div className="stats-grid" style={{ marginTop: "1.5rem" }}>
        <div className="stat-card"><h3>Total usuarios</h3><p>{loading ? "..." : counts.total}</p></div>
        <div className="stat-card"><h3>Activos</h3><p>{loading ? "..." : counts.active}</p></div>
        <div className="stat-card"><h3>Bloqueados</h3><p>{loading ? "..." : counts.blocked}</p></div>
        <div className="stat-card"><h3>Terrenos pendientes</h3><p>{loading ? "..." : counts.lands}</p></div>
      </div>
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <h2>Resumen rapido</h2>
        <p style={{ opacity: 0.7 }}>Usa el menu lateral para gestionar usuarios y moderar terrenos.</p>
      </div>
    </div>
  );
}

function App() {
  const { signOut } = useClerk();
  const [toast, setToast] = useState(null);
  const [sessionUser, setSessionUser] = useState(() => api.getSessionUser());
  const currentUser = buildCurrentUser(sessionUser);

  const handleLogin = async (form) => {
    const user = await api.login(form);
    setSessionUser(user);
    return user;
  };

  const handleRegister = async (form) => {
    const user = await api.register(form);
    setSessionUser(user);
    return user;
  };

  const handleProductLogout = () => {
    api.logout();
    setSessionUser(null);
    setToast({ type: "success", message: "Sesion cerrada." });
  };

  const handleAdminLogout = async () => {
    await signOut();
  };

  return (
    <>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/catalog" element={
          <ProductLayout currentUser={currentUser} onLogout={handleProductLogout}>
            <CatalogPage currentUser={currentUser} />
          </ProductLayout>
        } />
        <Route path="/lands/:landId" element={
          <ProductLayout currentUser={currentUser} onLogout={handleProductLogout}>
            <LandDetailPage currentUser={currentUser} />
          </ProductLayout>
        } />
        <Route path="/login" element={
          <ProductLayout currentUser={currentUser} onLogout={handleProductLogout}>
            <Login user={currentUser} onLogin={handleLogin} setToast={setToast} />
          </ProductLayout>
        } />
        <Route path="/register" element={
          <ProductLayout currentUser={currentUser} onLogout={handleProductLogout}>
            <Register user={currentUser} onRegister={handleRegister} setToast={setToast} />
          </ProductLayout>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute currentUser={currentUser}>
            <ProductLayout currentUser={currentUser} onLogout={handleProductLogout}>
              <DashboardPage currentUser={currentUser} />
            </ProductLayout>
          </ProtectedRoute>
        } />
        <Route path="/reserve/:landId" element={
          <ProtectedRoute currentUser={currentUser}>
            <ProductLayout currentUser={currentUser} onLogout={handleProductLogout}>
              <ReservePage currentUser={currentUser} setToast={setToast} />
            </ProductLayout>
          </ProtectedRoute>
        } />
        <Route path="/my-requests" element={
          <ProtectedRoute currentUser={currentUser}>
            <ProductLayout currentUser={currentUser} onLogout={handleProductLogout}>
              <MyRequestsPage currentUser={currentUser} />
            </ProductLayout>
          </ProtectedRoute>
        } />
        <Route path="/owner/requests" element={
          <OwnerRoute currentUser={currentUser}>
            <ProductLayout currentUser={currentUser} onLogout={handleProductLogout}>
              <OwnerRequestsPage currentUser={currentUser} setToast={setToast} />
            </ProductLayout>
          </OwnerRoute>
        } />
        <Route path="/dashboard/admin" element={
          <AdminRoute>
            <AdminLayout onSignOut={handleAdminLogout}>
              <AdminDashboardPage />
            </AdminLayout>
          </AdminRoute>
        } />
        <Route path="/dashboard/admin/users" element={
          <AdminRoute>
            <AdminLayout onSignOut={handleAdminLogout}>
              <AdminUsersPage />
            </AdminLayout>
          </AdminRoute>
        } />
        <Route path="/dashboard/admin/lands" element={
          <AdminRoute>
            <AdminLayout onSignOut={handleAdminLogout}>
              <AdminLandsPage />
            </AdminLayout>
          </AdminRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
