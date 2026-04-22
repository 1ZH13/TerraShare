import { useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

function ProtectedAdminRoute({ children }) {
  const { isLoaded } = useClerk();
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

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
          <p>No tienes permisos de administrador para acceder a esta sección.</p>
          <Link to="/" className="btn btn-ghost" style={{ marginTop: "1rem" }}>
            Volver al inicio
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
        <Link to="/admin" className="brand">TerraShare Admin</Link>
        <nav>
          <Link to="/admin">Dashboard</Link>
          <Link to="/admin/users">Usuarios</Link>
          <Link to="/admin/lands">Terrenos</Link>
          <Link to="/admin/requests">Solicitudes</Link>
          <Link to="/admin/audit">Auditoría</Link>
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

export default function App() {
  const { openSignIn, signOut } = useClerk();
  const { isSignedIn, isLoaded } = useUser();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Routes>
      <Route path="/login" element={
        isSignedIn ? <Navigate to="/admin" replace /> : <Login />
      } />
      <Route path="/admin" element={
        <ProtectedAdminRoute>
          <AdminLayout onSignOut={handleSignOut}>
            <Dashboard />
          </AdminLayout>
        </ProtectedAdminRoute>
      } />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}