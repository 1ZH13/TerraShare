import { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import LandingPage from "./pages/LandingPage";
import CatalogPage from "./pages/CatalogPage";
import LandDetailPage from "./pages/LandDetailPage";
import ReservePage from "./pages/ReservePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import PaymentButton from "./components/PaymentButton";
import AdminLandsPage from "./pages/AdminLandsPage";
import MyLandsPage from "./pages/MyLandsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import Login from "./components/Login";
import Register from "./components/Register";
import UserDashboardLayout from "./components/UserDashboardLayout";
import PublicHeader from "./components/PublicHeader";
import { getAdminSummary, listAdminRentalRequests, setTokenFn as setAdminTokenFn } from "./services/adminApi";
import { useClerkToken } from "./hooks/useClerkToken";
import { isAdminUser } from "./components/authDisplay";

function ProtectedRoute({ children }) {
  const { openSignIn } = useClerk();
  const { isSignedIn, user } = useUser();
  const location = useLocation();

  if (!isSignedIn) {
    return (
      <div className="page-shell">
        <nav className="glass-nav">
          <a href="/" className="brand">TerraShare</a>
          <nav className="menu">
            <a href="/catalog">Terrenos</a>
          </nav>
        </nav>
        <div className="glass-panel" style={{ textAlign: "center", padding: "3rem", marginTop: "2rem" }}>
          <h1>Requiere inicio de sesion</h1>
          <p>Para acceder a esta seccion necesitas estar logueado.</p>
          <button className="btn btn-primary" style={{ marginTop: "1rem" }} onClick={() => openSignIn({ redirectUrl: location.pathname })}>
            Iniciar sesion
          </button>
        </div>
      </div>
    );
  }

  return children;
}

function AdminRoute({ children }) {
  const { isLoaded } = useClerk();
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
    if (import.meta.env.DEV) {
      return children;
    }
    return <Navigate to="/login" replace />;
  }

  if (import.meta.env.DEV) {
    return children;
  }

  if (!isAdminUser(user)) {
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
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <Link to="/dashboard/admin" className="brand">TerraShare Admin</Link>
        <nav>
          <Link to="/dashboard/admin">Dashboard</Link>
          <Link to="/dashboard/admin/users">Usuarios</Link>
          <Link to="/dashboard/admin/lands">Terrenos</Link>
        </nav>
        <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
          <button className="btn btn-ghost" onClick={onSignOut} style={{ width: "100%", color: "white", borderColor: "rgba(255,255,255,0.3)" }}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}

function DashboardPage() {
  const { user } = useUser();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!user || !user.getToken) {
        setLoading(false);
        return;
      }
      try {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const token = await user.getToken();
        const res = await fetch(`${BASE_URL}/api/v1/rental-requests/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data?.data) {
          setRequests(data.data);
        }
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchRequests();
    else setLoading(false);
  }, [user]);

  const statusLabels = {
    draft: "Borrador",
    pending_owner: "Pendiente dueño",
    approved: "Aprobada",
    rejected: "Rechazada",
    pending_payment: "Pago pendiente",
    paid: "Pagada",
  };

  const statusColors = {
    draft: "status-draft",
    pending_owner: "status-pending",
    approved: "status-active",
    rejected: "status-blocked",
    pending_payment: "status-pending",
    paid: "status-active",
  };

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1>Mi Dashboard</h1>
          <p>Gestiona tus solicitudes y terrenos</p>
        </div>
        <div className="panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          <p>Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1>Mi Dashboard</h1>
        <p>Gestiona tus solicitudes y terrenos</p>
      </div>

      {requests.length === 0 ? (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <p>No tienes solicitudes de alquiler.</p>
          <Link to="/catalog" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Explorar terrenos
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
          {requests.map((req) => (
            <div key={req.id} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h3>Solicitud #{req.id.slice(0, 8)}</h3>
                  <p style={{ opacity: 0.7 }}>
                    Terreno: {req.landId} · Uso: {req.intendedUse}
                  </p>
                  <p style={{ opacity: 0.7 }}>
                    Período: {req.period?.startDate} → {req.period?.endDate}
                  </p>
                </div>
                <span className={`status-badge ${statusColors[req.status] || ""}`}>
                  {statusLabels[req.status] || req.status}
                </span>
              </div>

              {req.status === "pending_payment" && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <PaymentButton rentalRequest={req} />
                </div>
              )}
              {req.status === "paid" && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.1)", color: "#48bb78" }}>
                  ✓ Pago confirmado
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminDashboardPage() {
  const { user } = useUser();
  const [summary, setSummary] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestFilter, setRequestFilter] = useState("all");
  const tokenReady = useClerkToken(setAdminTokenFn);

  useEffect(() => {
    if (!tokenReady) return;

    let active = true;
    setLoading(true);
    setError("");

    Promise.all([
      getAdminSummary(),
      listAdminRentalRequests(requestFilter === "all" ? {} : { status: requestFilter }),
    ])
      .then(([summaryRes, requestsRes]) => {
        if (!active) return;
        setSummary(summaryRes.data ?? null);
        setRequests(requestsRes.data?.items ?? []);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tokenReady, requestFilter]);

  const adminName = user?.firstName || user?.fullName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Admin";

  return (
    <div>
      <div className="section-header">
        <h1>Panel de Administración</h1>
        <p>Bienvenido, {adminName}. Revisa métricas y solicitudes pendientes.</p>
      </div>
      {loading && <p className="muted" style={{ marginTop: "1rem" }}>Cargando resumen admin...</p>}
      {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}

      <div className="stats-grid" style={{ marginTop: "1.5rem" }}>
        <div className="glass-card" style={{ textAlign: "center" }}><h3>Usuarios</h3><p>{summary?.users.total ?? "—"}</p></div>
        <div className="glass-card" style={{ textAlign: "center" }}><h3>Terrenos</h3><p>{summary?.lands.total ?? "—"}</p></div>
        <div className="glass-card" style={{ textAlign: "center" }}><h3>Solicitudes</h3><p>{summary?.requests.total ?? "—"}</p></div>
        <div className="glass-card" style={{ textAlign: "center" }}><h3>Pendientes</h3><p>{summary?.requests.pendingOwner ?? "—"}</p></div>
      </div>

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>Solicitudes recientes</h2>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {["all", "pending_owner", "approved", "rejected", "paid"].map((f) => (
              <button
                key={f}
                className={`filter-chip ${requestFilter === f ? "active" : ""}`}
                onClick={() => setRequestFilter(f)}
              >
                {f === "all" ? "Todas" : f === "pending_owner" ? "Pendientes" : f === "approved" ? "Aprobadas" : f === "rejected" ? "Rechazadas" : "Pagadas"}
              </button>
            ))}
          </div>
        </div>
        <table className="table">
          <thead>
            <tr><th>Terreno</th><th>Arrendatario</th><th>Estado</th><th>Uso</th></tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.landTitle}</td>
                <td>{request.tenantEmail}</td>
                <td>{request.status}</td>
                <td>{request.intendedUse}</td>
              </tr>
            ))}
            {!loading && requests.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", opacity: 0.55, padding: "2rem" }}>
                  No hay solicitudes para mostrar
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/catalog" element={<UserDashboardLayout><CatalogPage /></UserDashboardLayout>} />
      <Route path="/lands/:id" element={<LandDetailPage />} />
      <Route path="/reserve/:landId" element={<ReservePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/checkout/success" element={<PaymentSuccessPage />} />
      <Route path="/checkout/cancel" element={<PaymentCancelPage />} />
      <Route path="/dashboard" element={<UserDashboardLayout><DashboardPage /></UserDashboardLayout>} />
      <Route path="/dashboard/lands" element={<UserDashboardLayout><MyLandsPage /></UserDashboardLayout>} />
      <Route path="/dashboard/chats" element={<UserDashboardLayout><ChatsPage /></UserDashboardLayout>} />
      <Route path="/dashboard/notifications" element={<UserDashboardLayout><NotificationsPage /></UserDashboardLayout>} />
      <Route path="/dashboard/payments" element={<UserDashboardLayout><PaymentsPage /></UserDashboardLayout>} />
      <Route path="/dashboard/profile" element={<UserDashboardLayout><ProfilePage /></UserDashboardLayout>} />
      <Route path="/dashboard/admin" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
      <Route path="/dashboard/admin/users" element={<AdminLayout><AdminUsersPage /></AdminLayout>} />
      <Route path="/dashboard/admin/lands" element={<AdminLayout><AdminLandsPage /></AdminLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
