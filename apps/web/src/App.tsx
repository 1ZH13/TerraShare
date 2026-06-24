import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth, useClerk, useUser } from "@clerk/clerk-react";
import type { RentalRequestDto } from "@terrashare/shared";
import LandingPage from "./pages/LandingPage";
import CatalogPage from "./pages/CatalogPage";
import LandDetailPage from "./pages/LandDetailPage";
import ReservePage from "./pages/ReservePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import PaymentPage from "./pages/PaymentPage";
import PaymentButton from "./components/PaymentButton";
import AdminLandsPage from "./pages/AdminLandsPage";
import MyLandsPage from "./pages/MyLandsPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ProfilePage from "./pages/ProfilePage";
import ChatsPage from "./pages/ChatsPage";
import NotificationsPage from "./pages/NotificationsPage";
import PaymentsPage from "./pages/PaymentsPage";
import Login from "./components/Login";
import Register from "./components/Register";
import UserDashboardLayout from "./components/UserDashboardLayout";
import PublicHeader from "./components/PublicHeader";
import { getAdminSummary, listAdminRentalRequests } from "./services/adminApi";
import { isAdminUser } from "./components/authDisplay";

interface WrapperProps {
  children?: ReactNode;
}

interface LayoutProps {
  children?: ReactNode;
  onSignOut?: () => void;
}

interface AdminSummary {
  users: { total: number };
  lands: { total: number };
  requests: { total: number; pendingOwner: number };
}

interface AdminRequest {
  id: string;
  landTitle?: string;
  tenantEmail?: string;
  status: string;
  intendedUse?: string;
}

function ProtectedRoute({ children }: WrapperProps) {
  const { isSignedIn } = useUser();
  const location = useLocation();

  if (isSignedIn === false) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isSignedIn === undefined) {
    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return children;
}

function AdminRoute({ children }: WrapperProps) {
  const { isSignedIn, user } = useUser();

  if (isSignedIn === false) {
    return <Navigate to="/login" replace />;
  }

  if (isSignedIn === undefined) {
    return (
      <div className="page-shell">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <p>Cargando...</p>
        </div>
      </div>
    );
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

function DashboardLayout({ children, onSignOut }: LayoutProps) {
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
          <Link to="/dashboard/lands" className={currentPath === "/dashboard/lands" ? "active" : ""}>Mis terrenos</Link>
        </nav>
        <div className="auth-actions">
          <span className="user-chip">{userName}</span>
          <button className="btn btn-ghost" onClick={onSignOut}>Cerrar sesión</button>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

function AdminLayout({ children, onSignOut }: LayoutProps) {
  const { user } = useUser();
  const location = useLocation();

  const navLinks = [
    {
      to: "/dashboard",
      label: "Ver como usuario",
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      to: "/",
      label: "Landing page",
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    },
    {
      to: "/dashboard/admin",
      label: "Dashboard",
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
    },
    {
      to: "/dashboard/admin/users",
      label: "Usuarios",
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      to: "/dashboard/admin/lands",
      label: "Terrenos",
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
    },
  ];

  const isActive = (path: string) => location.pathname === path;
  const adminName = user?.firstName || user?.fullName?.split(" ")[0] || "Admin";

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <Link to="/dashboard/admin" className="sidebar-brand">
            <img src="/terrashare.svg" alt="TerraShare" style={{ height: "32px", width: "auto" }} />
            <span>Admin</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          {navLinks.slice(0, 2).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`sidebar-nav-item ${isActive(link.to) ? "active" : ""}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
          <div className="sidebar-divider" />
          {navLinks.slice(2).map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`sidebar-nav-item ${isActive(link.to) ? "active" : ""}`}
            >
              <span className="nav-icon">{link.icon}</span>
              <span className="nav-label">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="admin-user-info">
            <div className="admin-avatar">
              {user?.firstName?.[0] || user?.fullName?.[0] || "A"}
            </div>
            <div className="admin-user-details">
              <span className="admin-user-name">{adminName}</span>
              <span className="admin-user-role">Administrador</span>
            </div>
          </div>
          <button className="sidebar-signout" onClick={onSignOut}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}

function DashboardPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [requests, setRequests] = useState<RentalRequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (import.meta.env.DEV) {
          headers["x-dev-user-id"] = "web_dev_user";
          headers["x-dev-role"] = "user";
        } else {
          const token = await getToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
        const res = await fetch(`${BASE_URL}/api/v1/rental-requests`, { headers });
        const data = await res.json();
        console.log("API response:", data);
        if (data?.data) {
          setRequests(data.data);
        } else if (Array.isArray(data)) {
          setRequests(data);
        }
      } catch (err) {
        console.error("Error fetching requests:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [user]);

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    draft: { label: "Borrador", color: "#997a00", bg: "rgba(200, 170, 0, 0.15)", icon: "📝" },
    pending_owner: { label: "Pendiente", color: "var(--river-500)", bg: "rgba(13, 111, 147, 0.12)", icon: "⏳" },
    approved: { label: "Aprobada", color: "var(--leaf-700)", bg: "rgba(11, 95, 55, 0.12)", icon: "✅" },
    rejected: { label: "Rechazada", color: "var(--danger)", bg: "rgba(180, 40, 40, 0.12)", icon: "❌" },
    pending_payment: { label: "Pago pendiente", color: "var(--soil-500)", bg: "rgba(157, 106, 59, 0.15)", icon: "💳" },
    paid: { label: "Pagada", color: "var(--success)", bg: "rgba(11, 95, 55, 0.12)", icon: "🎉" },
  };

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1>Mis Solicitudes</h1>
          <p>Gestiona tus solicitudes de alquiler</p>
        </div>
        <div className="panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          <div className="dashboard-spinner" />
          <p style={{ marginTop: "1rem", opacity: 0.7 }}>Cargando solicitudes...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1>Mis Solicitudes</h1>
        <p>Gestiona tus solicitudes de alquiler</p>
      </div>

      {requests.length === 0 ? (
        <div className="glass-panel dashboard-empty">
          <div className="dashboard-empty-icon">📋</div>
          <h2>Sin solicitudes aún</h2>
          <p>Cuando envíes una solicitud de alquiler, aparecerá aquí.</p>
          <Link to="/catalog" className="btn btn-primary" style={{ marginTop: "1.5rem" }}>
            Explorar terrenos
          </Link>
        </div>
      ) : (
        <div className="dashboard-requests">
          {requests.map((req) => {
            const status = statusConfig[req.status] || statusConfig.draft;
            return (
              <div key={req.id} className="request-card">
                <div className="request-header">
                  <div className="request-id">
                    <span className="request-icon">{status.icon}</span>
                    <span>Solicitud #{req.id.slice(0, 8)}</span>
                  </div>
                  <span
                    className="request-status"
                    style={{ background: status.bg, color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>

                <div className="request-body">
                  <div className="request-detail">
                    <span className="request-detail-label">Terreno</span>
                    <span className="request-detail-value">{req.landId}</span>
                  </div>
                  <div className="request-detail">
                    <span className="request-detail-label">Uso</span>
                    <span className="request-detail-value">{req.intendedUse}</span>
                  </div>
                  <div className="request-detail">
                    <span className="request-detail-label">Período</span>
                    <span className="request-detail-value">
                      {req.period?.startDate} → {req.period?.endDate}
                    </span>
                  </div>
                </div>

                {req.status === "approved" && (
                  <div className="request-action">
                    <p>Tu solicitud fue aprobada. Completa el pago para confirmar el alquiler.</p>
                    <PaymentButton rentalRequest={req} />
                  </div>
                )}
                {req.status === "pending_payment" && (
                  <div className="request-action">
                    <p>Procesando pago...</p>
                    <PaymentButton rentalRequest={req} />
                  </div>
                )}
                {req.status === "paid" && (
                  <div className="request-action request-success">
                    <span className="request-success-icon">✓</span>
                    <span>Pago confirmado - ¡Alquiler activo!</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminDashboardPage() {
  const { user } = useUser();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestFilter, setRequestFilter] = useState("all");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    Promise.all([
      getAdminSummary(),
      listAdminRentalRequests(requestFilter === "all" ? {} : { status: requestFilter }),
    ])
      .then(([summaryRes, requestsRes]) => {
        if (!active) return;
        setSummary((summaryRes.data as AdminSummary) ?? null);
        setRequests(((requestsRes.data as any)?.items ?? []) as AdminRequest[]);
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
  }, [requestFilter]);

  const adminName = user?.firstName || user?.fullName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "Admin";

  const statusColors = {
    draft: { bg: "rgba(200, 170, 0, 0.15)", color: "var(--accent-600)" },
    pending_owner: { bg: "rgba(11, 111, 147, 0.12)", color: "var(--river-500)" },
    approved: { bg: "rgba(11, 95, 55, 0.12)", color: "var(--leaf-700)" },
    rejected: { bg: "rgba(180, 40, 40, 0.12)", color: "var(--danger)" },
    pending_payment: { bg: "rgba(157, 106, 59, 0.15)", color: "var(--soil-500)" },
    paid: { bg: "rgba(11, 95, 55, 0.12)", color: "var(--leaf-700)" },
  };

  return (
    <div>
      <div className="section-header">
        <h1>Panel de Administración</h1>
        <p>Bienvenido de nuevo, {adminName}. Aquí tienes el resumen de tu plataforma.</p>
      </div>

      <div className="stats-grid" style={{ marginTop: "1.5rem" }}>
        <div className="glass-card">
          <div className="stat-value" style={{ color: "var(--leaf-700)" }}>{summary?.users.total ?? "—"}</div>
          <div className="stat-label">Usuarios registrados</div>
        </div>
        <div className="glass-card">
          <div className="stat-value" style={{ color: "var(--river-500)" }}>{summary?.lands.total ?? "—"}</div>
          <div className="stat-label">Terrenos publicados</div>
        </div>
        <div className="glass-card">
          <div className="stat-value" style={{ color: "var(--soil-500)" }}>{summary?.requests.total ?? "—"}</div>
          <div className="stat-label">Solicitudes totales</div>
        </div>
        <div className="glass-card">
          <div className="stat-value" style={{ color: "#997a00" }}>{summary?.requests.pendingOwner ?? "—"}</div>
          <div className="stat-label">Pendientes de approval</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Solicitudes recientes</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {["all", "pending_owner", "approved", "pending_payment", "rejected", "paid"].map((f) => (
              <button
                key={f}
                className={`filter-chip ${requestFilter === f ? "active" : ""}`}
                onClick={() => setRequestFilter(f)}
              >
                {f === "all" ? "Todas" : f === "pending_owner" ? "Pendientes" : f === "approved" ? "Aprobadas" : f === "pending_payment" ? "Pago pendiente" : f === "rejected" ? "Rechazadas" : "Pagadas"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Terreno</th>
                <th>Arrendatario</th>
                <th>Estado</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td className="land-title">{request.landTitle}</td>
                  <td className="tenant-email">{request.tenantEmail}</td>
                  <td>
                    <span className={`admin-status-badge ${request.status}`}>
                      {request.status === "pending_owner" ? "Pendiente" : request.status === "pending_payment" ? "Pago pendiente" : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </td>
                  <td className="admin-usage">{request.intendedUse}</td>
                </tr>
              ))}
              {!loading && requests.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", opacity: 0.5, padding: "3rem" }}>
                    No hay solicitudes para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
      <Route path="/reserve/:landId" element={<ProtectedRoute><ReservePage /></ProtectedRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/checkout/success" element={<PaymentSuccessPage />} />
      <Route path="/checkout/cancel" element={<PaymentCancelPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><UserDashboardLayout><DashboardPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/lands" element={<ProtectedRoute><UserDashboardLayout><MyLandsPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/chats" element={<ProtectedRoute><UserDashboardLayout><ChatsPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/notifications" element={<ProtectedRoute><UserDashboardLayout><NotificationsPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/payments" element={<ProtectedRoute><UserDashboardLayout><PaymentsPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><UserDashboardLayout><ProfilePage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/admin" element={<AdminRoute><AdminLayout><AdminDashboardPage /></AdminLayout></AdminRoute>} />
      <Route path="/dashboard/admin/users" element={<AdminRoute><AdminLayout><AdminUsersPage /></AdminLayout></AdminRoute>} />
      <Route path="/dashboard/admin/lands" element={<AdminRoute><AdminLayout><AdminLandsPage /></AdminLayout></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
