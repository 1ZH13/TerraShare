import { useState, useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import LandingPage from "./pages/LandingPage";
import CatalogPage from "./pages/CatalogPage";
import LandDetailPage from "./pages/LandDetailPage";
import Login from "./components/Login";
import Register from "./components/Register";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminLandsPage from "./pages/AdminLandsPage";
import { setTokenFn as setAdminTokenFn } from "./services/adminApi";
import { setTokenFn as setApiTokenFn } from "./services/api";

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

  return (
    <div className="page-shell">
      <header className="top-nav">
        <Link to="/dashboard" className="brand">TerraShare Dashboard</Link>
        <nav className="menu">
          <Link to="/dashboard" className={currentPath === "/dashboard" ? "active" : ""}>Mis solicitudes</Link>
          <Link to="/dashboard/lands">Mis terrenos</Link>
        </nav>
        <div className="auth-actions">
          <button className="button ghost-button" onClick={onSignOut}>Cerrar sesion</button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
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

function DashboardPage() {
  return (
    <div>
      <div className="section-header">
        <h1>Mi Dashboard</h1>
        <p>Gestiona tus solicitudes y terrenos</p>
      </div>
      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <p>Contenido del dashboard (en desarrollo)</p>
      </div>
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
    // Load counts from admin endpoints
    import("./services/adminApi").then(({ listAdminUsers, listAdminLands }) => {
      Promise.all([
        listAdminUsers({}).then((r) => r.data?.items ?? []),
        listAdminLands({ status: "draft" }).then((r) => r.data?.items ?? []),
      ]).then(([users, landsDraft]) => {
        setCounts({
          total: users.length,
          active: users.filter((u) => u.status === "active").length,
          blocked: users.filter((u) => u.status === "blocked").length,
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

export default function App() {
  const { signOut } = useClerk();
  const { isSignedIn, isLoaded } = useUser();

  // Inject Clerk token for API calls
  useEffect(() => {
    if (user) {
      user.getToken().then((token) => {
        setAdminTokenFn(() => token);
        setApiTokenFn(() => token);
      });
    }
  }, [user]);

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
      <Route path="/lands/:landId" element={<LandDetailPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
      <Route path="/dashboard/admin/users" element={
        <AdminRoute>
          <AdminLayout onSignOut={handleSignOut}>
            <AdminUsersPage />
          </AdminLayout>
        </AdminRoute>
      } />
      <Route path="/dashboard/admin/lands" element={
        <AdminRoute>
          <AdminLayout onSignOut={handleSignOut}>
            <AdminLandsPage />
          </AdminLayout>
        </AdminRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}