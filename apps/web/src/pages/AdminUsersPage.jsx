import { useState, useEffect } from "react";
import { listAdminUsers, updateUserStatus, updateUserRole, setTokenFn } from "../services/adminApi";
import { useClerkToken } from "../hooks/useClerkToken";

const roleLabel = { user: "Usuario", owner: "Propietario", admin: "Admin" };
const statusLabel = { active: "Activo", blocked: "Bloqueado" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const tokenReady = useClerkToken(setTokenFn);

  const loadUsers = () => {
    setLoading(true);
    setError("");
    const filters = {};
    if (filter === "active" || filter === "blocked") filters.status = filter;
    if (search.trim()) filters.search = search.trim();

    listAdminUsers(filters)
      .then((res) => setUsers(res.data?.items ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (tokenReady) {
      loadUsers();
    }
  }, [tokenReady, filter, search]);

  const handleToggleStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "blocked" : "active";
    try {
      await updateUserStatus(userId, nextStatus);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, status: nextStatus } : u)
      );
      setActionMsg(`Usuario ${nextStatus === "blocked" ? "bloqueado" : "activado"}`);
    } catch (e) {
      setError(e.message);
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, role: newRole } : u)
      );
      setActionMsg(`Rol actualizado a ${roleLabel[newRole] || newRole}`);
    } catch (e) {
      setError(e.message);
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const filtered = users; // Backend already filters

  return (
    <div>
      <div className="section-header">
        <h1>Gestión de Usuarios</h1>
        <p>Administra cuentas de usuarios y propietarios</p>
      </div>

      <div className="filters-bar" style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "300px", flex: 1 }}
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="blocked">Bloqueados</option>
        </select>
        <span style={{ opacity: 0.7 }}>{filtered.length} usuario{filtered.length !== 1 ? "s" : ""}</span>
        {actionMsg && (
          <span style={{ color: "var(--leaf-600)", fontWeight: 600 }}>{actionMsg}</span>
        )}
      </div>

      {loading && <p className="muted" style={{ marginTop: "1rem" }}>Cargando...</p>}
      {error && <p className="error-text" style={{ marginTop: "1rem" }}>{error}</p>}

      {!loading && !error && (
        <div className="panel" style={{ marginTop: "1rem" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Fecha de registro</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 700 }}>{u.profile.fullName}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.role || "user"}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      style={{ width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                    >
                      <option value="user">Usuario</option>
                      <option value="owner">Propietario</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className={`status-badge status-${u.status === "active" ? "active" : "blocked"}`}>
                      {statusLabel[u.status] ?? u.status}
                    </span>
                  </td>
                  <td style={{ opacity: 0.7 }}>
                    {new Date(u.createdAt).toLocaleDateString("es-PA")}
                  </td>
                  <td>
                    <button
                      className={`btn ${u.status === "active" ? "btn-ghost" : "btn-primary"}`}
                      onClick={() => handleToggleStatus(u.id, u.status)}
                      style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}
                    >
                      {u.status === "active" ? "Bloquear" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", opacity: 0.5, padding: "2rem" }}>
                    No se encontraron usuarios
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
