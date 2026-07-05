import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import LandingPage from "./pages/LandingPage";
import CatalogPage from "./pages/CatalogPage";
import LandDetailPage from "./pages/LandDetailPage";
import ReservePage from "./pages/ReservePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PaymentCancelPage from "./pages/PaymentCancelPage";
import PaymentPage from "./pages/PaymentPage";
import AdminLandsPage from "./pages/AdminLandsPage";
import AdminLeadsPage from "./pages/AdminLeadsPage";
import MyLandsPage from "./pages/MyLandsPage";
import PublishLandPage from "./pages/PublishLandPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import ProfilePage from "./pages/ProfilePage";
import ChatsPage from "./pages/ChatsPage";
import NotificationsPage from "./pages/NotificationsPage";
import PaymentsPage from "./pages/PaymentsPage";
import Login from "./components/Login";
import Register from "./components/Register";
import OnboardingPage from "./pages/OnboardingPage";
import AppLayout from "./components/AppLayout";
import HomePage from "./pages/HomePage";
import UserDashboardLayout from "./components/UserDashboardLayout";
import PublicHeader from "./components/PublicHeader";
import StyleguidePage from "./pages/StyleguidePage";
import AdminLayout from "./components/AdminLayout";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import { isAdminUser } from "./components/authDisplay";

interface WrapperProps {
  children?: ReactNode;
}

interface LayoutProps {
  children?: ReactNode;
  onSignOut?: () => void;
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

export default function App() {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/styleguide" element={<StyleguidePage />} />
      <Route path="/lands/:id" element={<LandDetailPage />} />
      <Route path="/reserve/:landId" element={<ProtectedRoute><ReservePage /></ProtectedRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />
      <Route path="/checkout/success" element={<PaymentSuccessPage />} />
      <Route path="/checkout/cancel" element={<PaymentCancelPage />} />
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
      </Route>
      <Route path="/dashboard/lands/new" element={<ProtectedRoute><PublishLandPage /></ProtectedRoute>} />
      <Route path="/dashboard/lands" element={<ProtectedRoute><UserDashboardLayout><MyLandsPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/chats" element={<ProtectedRoute><UserDashboardLayout><ChatsPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/notifications" element={<ProtectedRoute><UserDashboardLayout><NotificationsPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/payments" element={<ProtectedRoute><UserDashboardLayout><PaymentsPage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/profile" element={<ProtectedRoute><UserDashboardLayout><ProfilePage /></UserDashboardLayout></ProtectedRoute>} />
      <Route path="/dashboard/admin" element={<AdminRoute><AdminLayout><AdminDashboardPage /></AdminLayout></AdminRoute>} />
      <Route path="/dashboard/admin/users" element={<AdminRoute><AdminLayout><AdminUsersPage /></AdminLayout></AdminRoute>} />
      <Route path="/dashboard/admin/lands" element={<AdminRoute><AdminLayout><AdminLandsPage /></AdminLayout></AdminRoute>} />
      <Route path="/dashboard/admin/leads" element={<AdminRoute><AdminLayout><AdminLeadsPage /></AdminLayout></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
