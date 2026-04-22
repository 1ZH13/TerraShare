import { useEffect, useMemo, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams
} from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { api as apiReal, setTokenFn } from "./services/api";
import Login from "./components/Login";
import Register from "./components/Register";

const statusLabels = {
  draft: "Borrador",
  pending_owner: "Pendiente del propietario",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  pending_payment: "Pendiente de pago",
  paid: "Pagada"
};

const formatDate = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

const formatDateTime = (value) =>
  new Date(value).toLocaleString("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

const buildLoginRedirect = (targetPath) =>
  `/login?next=${encodeURIComponent(targetPath)}`;

function ProtectedRoute({ user, children }) {
  const location = useLocation();

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={buildLoginRedirect(next)} replace />;
  }

  return children;
}

function OwnerRoute({ user, children }) {
  if (!user) {
    return <Navigate to={buildLoginRedirect("/owner/requests")} replace />;
  }

  if (user.role !== "owner") {
    return <Navigate to="/" replace />;
  }

  return children;
}

function StatusPill({ status }) {
  return <span className={`status-pill status-${status}`}>{statusLabels[status] || status}</span>;
}

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

function CatalogPage({ user }) {
  const [filters, setFilters] = useState({
    type: "all",
    location: "",
    maxPrice: "",
    availableOn: ""
  });
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const rawLands = await apiReal.listLands(filters);
        if (active) {
          setLands(rawLands.map(adaptLand));
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
          se planifica para siguientes issues; por ahora el enfoque es listado y
          reserva completa.
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
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, location: event.target.value }))
            }
          />
        </label>

        <label>
          Precio maximo (USD)
          <input
            type="number"
            min="1"
            placeholder="Ejemplo: 500"
            value={filters.maxPrice}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))
            }
          />
        </label>

        <label>
          Disponible en fecha
          <input
            type="date"
            value={filters.availableOn}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, availableOn: event.target.value }))
            }
          />
        </label>
      </div>

      {loading ? <p className="muted">Cargando terrenos...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && lands.length === 0 ? (
        <p className="muted">No hay resultados con esos filtros.</p>
      ) : null}

      <div className="cards-grid">
        {lands.map((land) => {
          const reserveTarget = `/reserve/${land.id}`;
          const reserveHref = user ? reserveTarget : buildLoginRedirect(reserveTarget);

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
                  <dd>
                    {formatDate(land.availableFrom)} - {formatDate(land.availableTo)}
                  </dd>
                </div>
              </dl>

              <div className="card-actions">
                <Link to={`/lands/${land.id}`} className="button ghost-button">
                  Ver detalle
                </Link>
                <Link to={reserveHref} className="button primary-button">
                  {user ? "Reservar ahora" : "Inicia sesion para reservar"}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function LandDetailPage({ user }) {
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
        const rawLand = await apiReal.getLandById(landId);
        if (active) {
          setLand(adaptLand(rawLand));
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
        <Link to="/" className="button ghost-button inline-button">
          Volver al catalogo
        </Link>
      </section>
    );
  }

  const reserveTarget = `/reserve/${land.id}`;

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
            <li>
              Disponibilidad: {formatDate(land.availableFrom)} - {formatDate(land.availableTo)}
            </li>
            <li>Usos permitidos: {land.allowedUses.join(", ")}</li>
          </ul>
          <p>{land.summary}</p>
        </article>

        <aside className="detail-card accent-card">
          <h2>Siguiente paso</h2>
          <p>
            Para reservar debes indicar periodo y uso propuesto. El propietario puede
            aprobar o rechazar directamente en su bandeja de solicitudes.
          </p>
          <Link
            to={user ? reserveTarget : buildLoginRedirect(reserveTarget)}
            className="button primary-button"
          >
            {user ? "Ir a reserva" : "Inicia sesion para reservar"}
          </Link>
        </aside>
      </div>
    </section>
  );
}

function LoginPage({ user, onLogin, setToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);

  if (user) {
    return <Navigate to={nextPath} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onLogin(form);
      setToast({ type: "success", message: "Sesion iniciada correctamente." });
      navigate(nextPath, { replace: true });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel slim-panel reveal">
      <header className="section-header compact">
        <p className="kicker">Acceso</p>
        <h1>Iniciar sesion</h1>
        <p>Usa una cuenta semilla o crea una cuenta nueva desde registro.</p>
      </header>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Correo
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>

        <label>
          Contrasena
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            required
          />
        </label>

        <button type="submit" className="button primary-button" disabled={submitting}>
          {submitting ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="muted top-gap">
        Cuenta arrendatario: tenant@terrashare.test / 123456
        <br />
        Cuenta propietario: owner@terrashare.test / 123456
      </p>
    </section>
  );
}

function RegisterPage({ user, onRegister, setToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);

  if (user) {
    return <Navigate to={nextPath} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onRegister(form);
      setToast({
        type: "success",
        message: "Cuenta creada. Ya puedes enviar solicitudes de alquiler."
      });
      navigate(nextPath, { replace: true });
    } catch (error) {
      setToast({ type: "error", message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel slim-panel reveal">
      <header className="section-header compact">
        <p className="kicker">Registro</p>
        <h1>Crear cuenta de arrendatario</h1>
        <p>El registro en este MVP mockeado crea usuarios de rol tenant.</p>
      </header>

      <form className="form-grid" onSubmit={handleSubmit}>
        <label>
          Nombre completo
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
        </label>

        <label>
          Correo
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            required
          />
        </label>

        <label>
          Contrasena
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            required
            minLength={6}
          />
        </label>

        <button type="submit" className="button primary-button" disabled={submitting}>
          {submitting ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </section>
  );
}

function ReservePage({ user, setToast }) {
  const navigate = useNavigate();
  const { landId } = useParams();
  const [land, setLand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    intendedUse: "",
    message: ""
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const rawLand = await apiReal.getLandById(landId);
        if (active) {
          setLand(adaptLand(rawLand));
        }
      } catch (error) {
        if (active) {
          setToast({ type: "error", message: error.message });
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
      const rawRequest = await apiReal.createRentalRequest({
        landId,
        period: {
          startDate: form.startDate,
          endDate: form.endDate
        },
        intendedUse: form.intendedUse,
        notes: form.message
      });
      const request = rawRequest ? adaptRentalRequest(rawRequest, { landName: land?.name }) : null;

      setToast({
        type: "success",
        message: `Solicitud enviada (${rawRequest?.id ?? "OK"}). Espera la decision del propietario.`
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
              onChange={(event) =>
                setForm((prev) => ({ ...prev, startDate: event.target.value }))
              }
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
            onChange={(event) =>
              setForm((prev) => ({ ...prev, intendedUse: event.target.value }))
            }
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

function MyRequestsPage({ user }) {
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
        const rawRequests = await apiReal.listRentalRequests({ tenantId: user.id });
        if (active) {
          setRequests(rawRequests.map((r) => adaptRentalRequest(r)));
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
  }, [user.id]);

  return (
    <section className="panel reveal">
      <header className="section-header compact">
        <p className="kicker">Seguimiento</p>
        <h1>Mis solicitudes</h1>
        <p>Revisa estados y fechas de tus solicitudes enviadas.</p>
      </header>

      {loading ? <p className="muted">Cargando solicitudes...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && requests.length === 0 ? (
        <p className="muted">Aun no has enviado solicitudes de alquiler.</p>
      ) : null}

      <div className="request-list">
        {requests.map((item) => (
          <article
            className={`request-item ${createdId === item.id ? "request-highlight" : ""}`}
            key={item.id}
          >
            <div className="request-top">
              <h2>{item.landName}</h2>
              <StatusPill status={item.status} />
            </div>
            <p className="muted">ID: {item.id}</p>
            <p>
              Periodo: {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </p>
            <p>Uso: {item.intendedUse}</p>
            <p>Actualizado: {formatDateTime(item.updatedAt)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function OwnerRequestsPage({ user, setToast }) {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [busyRequestId, setBusyRequestId] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const rawRequests = await apiReal.listRentalRequests({ ownerId: user.id });
      const enrichedRequests = await Promise.all(
        rawRequests.map(async (r) => {
          try {
            const land = await apiReal.getLandById(r.landId);
            return adaptRentalRequest(r, {
              landName: land?.name,
              monthlyPrice: land?.priceRule?.pricePerMonth,
              landType: land?.allowedUses?.[0]
            });
          } catch {
            return adaptRentalRequest(r);
          }
        })
      );
      setRequests(enrichedRequests);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const handleDecision = async (requestId, status) => {
    setBusyRequestId(requestId);

    try {
      const updated = await apiReal.updateRentalRequestStatus(requestId, status);

      setRequests((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item))
      );
      setToast({
        type: "success",
        message: `Solicitud ${updated.id} actualizada a ${statusLabels[updated.status]}.`
      });
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
        <p>
          Desde aqui puedes aprobar o rechazar solicitudes pendientes de tus
          terrenos.
        </p>
      </header>

      {loading ? <p className="muted">Cargando bandeja...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      {!loading && !error && requests.length === 0 ? (
        <p className="muted">No tienes solicitudes asociadas por ahora.</p>
      ) : null}

      <div className="request-list">
        {requests.map((item) => {
          const isPending = item.status === "pending_owner";
          const isBusy = busyRequestId === item.id;

          return (
            <article className="request-item" key={item.id}>
              <div className="request-top">
                <h2>{item.landName}</h2>
                <StatusPill status={item.status} />
              </div>
              <p className="muted">Solicitud: {item.id}</p>
              <p>
                Arrendatario: {item.tenantName} ({item.tenantEmail})
              </p>
              <p>
                Periodo: {formatDate(item.startDate)} - {formatDate(item.endDate)}
              </p>
              <p>Uso propuesto: {item.intendedUse}</p>
              <p>Actualizado: {formatDateTime(item.updatedAt)}</p>

              {isPending ? (
                <div className="inline-actions">
                  <button
                    type="button"
                    className="button success-button"
                    disabled={isBusy}
                    onClick={() =>
                      handleDecision(item.id, "approved")
                    }
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    className="button danger-button"
                    disabled={isBusy}
                    onClick={() =>
                      handleDecision(item.id, "rejected")
                    }
                  >
                    Rechazar
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function App() {
  const { user, isLoaded, openSignIn, openSignUp, signOut } = useClerk();
  const { isSignedIn } = useUser();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Inyectar Clerk token en el cliente de API
    if (isSignedIn && user) {
      user.getToken().then((token) => setTokenFn(() => token)).catch(() => setTokenFn(() => null));
    } else {
      setTokenFn(() => null);
    }
  }, [isSignedIn, user]);

  useEffect(() => {
    if (isSignedIn) {
      setToast({ type: "success", message: "Bienvenido!" });
    }
  }, [isSignedIn]);

  const handleLogout = async () => {
    await signOut();
    setToast({ type: "success", message: "Sesion cerrada." });
  };

  const currentUser = isSignedIn ? { 
    id: user?.id, 
    email: user?.primaryEmailAddress?.emailAddress,
    role: user?.publicMetadata?.role || "user",
    profile: { fullName: user?.fullName }
  } : null;

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <header className="top-nav">
        <Link to="/" className="brand">
          TerraShare App
        </Link>

        <nav className="menu" aria-label="Navegacion principal">
          <NavLink to="/" end>
            Catalogo
          </NavLink>
          {user ? <NavLink to="/my-requests">Mis solicitudes</NavLink> : null}
          {user?.role === "owner" ? (
            <NavLink to="/owner/requests">Gestion propietario</NavLink>
          ) : null}
        </nav>

        <div className="auth-actions">
          {isSignedIn && currentUser ? (
            <>
              <p className="session-chip">
                {currentUser.profile.fullName} · {currentUser.role}
              </p>
              <button type="button" className="button ghost-button" onClick={handleLogout}>
                Cerrar sesion
              </button>
            </>
          ) : (
            <>
              <Link className="button ghost-button" to="/login">
                Iniciar sesion
              </Link>
              <Link className="button primary-button" to="/register">
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </header>

      <Toast toast={toast} onClose={() => setToast(null)} />

      <main>
        <Routes>
          <Route path="/" element={<CatalogPage user={currentUser} />} />
          <Route path="/lands/:landId" element={<LandDetailPage user={currentUser} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/reserve/:landId"
            element={
              isSignedIn ? (
                <ReservePage user={currentUser} setToast={setToast} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/my-requests"
            element={
              isSignedIn ? (
                <MyRequestsPage user={currentUser} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/owner/requests"
            element={
              currentUser?.role === "owner" ? (
                <OwnerRequestsPage user={currentUser} setToast={setToast} />
              ) : isSignedIn ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
