import { useState, useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import LandingPage from "./pages/LandingPage";
import CatalogPage from "./pages/CatalogPage";
import LandDetailPage from "./pages/LandDetailPage";
import ReservePage from "./pages/ReservePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import PaymentButton from "./components/PaymentButton";
import Login from "./components/Login";
import Register from "./components/Register";
import { getPaymentsByRequest } from "./services/api";

function ProtectedRoute({ children }) {
  const { isLoaded } = useClerk();
  const { isSignedIn } = useUser();
  const location = useLocation();

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
    return <Navigate to="/login" state={{ from: location }} replace />;
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

function DashboardLayout({ children, onSignOut }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user } = useUser();
  const userName = user?.firstName || user?.fullName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Usuario";

  return (
    <div className="page-shell">
      <nav className="glass-nav">
        <Link to="/dashboard" className="brand">TerraShare Dashboard</Link>
        <nav className="menu">
          <Link to="/dashboard" className={currentPath === "/dashboard" ? "active" : ""}>Mis solicitudes</Link>
          <Link to="/dashboard/lands">Mis terrenos</Link>
        </nav>
        <div className="auth-actions">
          <span className="user-chip">{userName}</span>
          <button className="btn btn-ghost" onClick={onSignOut}>Cerrar sesion</button>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
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
            Cerrar sesion
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
  const [users, setUsers] = useState([
    { id: 1, name: "Juan Perez", email: "juan@example.com", status: "active" },
    { id: 2, name: "Maria Garcia", email: "maria@example.com", status: "blocked" },
  ]);

  return (
    <div>
      <div className="section-header">
        <h1>Panel de Administracion</h1>
        <p>Gestion de usuarios y plataforma</p>
      </div>
      <div className="stats-grid" style={{ marginTop: "1.5rem" }}>
        <div className="stat-card"><h3>Usuarios</h3><p>{users.length}</p></div>
        <div className="stat-card"><h3>Activos</h3><p>{users.filter(u => u.status === "active").length}</p></div>
        <div className="stat-card"><h3>Bloqueados</h3><p>{users.filter(u => u.status === "blocked").length}</p></div>
        <div className="stat-card"><h3>Terrenos</h3><p>--</p></div>
      </div>
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <h2>Usuarios recientes</h2>
        <table className="table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`status-badge ${u.status === "active" ? "status-active" : "status-blocked"}`}>{u.status}</span></td>
                <td>
                  <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>
                    {u.status === "active" ? "Bloquear" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded } = useUser();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!isLoaded) {
    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Cargando TerraShare...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/catalog" element={<CatalogPage />} />
<Route path="/lands/:id" element={<LandDetailPage />} />
      <Route path="/reserve/:landId" element={
        <ProtectedRoute>
          <ReservePage />
        </ProtectedRoute>
      } />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/checkout/success" element={<PaymentSuccessPage />} />
      <Route path="/checkout/cancel" element={<PaymentCancelPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout onSignOut={handleSignOut}>
            <DashboardPage />
          </DashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/dashboard/admin" element={
        <AdminRoute>
          <AdminLayout onSignOut={handleSignOut}>
            <AdminDashboardPage />
          </AdminLayout>
        </AdminRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}