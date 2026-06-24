import { useState, useEffect } from "react";
import type { UserSummaryDto } from "@terrashare/shared";
import { listAdminUsers, updateUserStatus } from "../services/adminApi";

const roleLabel: Record<string, string> = { user: "Usuario", admin: "Admin" };
const statusLabel: Record<string, string> = { active: "Activo", blocked: "Bloqueado" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const loadUsers = () => {
    setLoading(true);
    setError("");
    const filters: { status?: string; search?: string } = {};
    if (filter === "active" || filter === "blocked") filters.status = filter;
    if (search.trim()) filters.search = search.trim();

    listAdminUsers(filters)
      .then((res) => setUsers(((res.data as any)?.items ?? []) as UserSummaryDto[]))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, [filter, search]);

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "blocked" : "active";
    try {
      await updateUserStatus(userId, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? ({ ...u, status: nextStatus } as UserSummaryDto) : u)),
      );
      setActionMsg(`Usuario ${nextStatus === "blocked" ? "bloqueado" : "activado"}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
    setTimeout(() => setActionMsg(""), 3000);
  };

  const filtered = users;

  return (
    <div className="admin-page-header">
      <h1>Gestión de Usuarios</h1>
      <p>Administra cuentas de usuarios y propietarios de la plataforma</p>

      <div className="admin-filters-bar">
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search-input"
        />
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="admin-select">
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="blocked">Bloqueados</option>
        </select>
        <span className="admin-count">{filtered.length} usuario{filtered.length !== 1 ? "s" : ""}</span>
        {actionMsg && <span className="admin-action-msg">{actionMsg}</span>}
      </div>

      {loading && <div className="admin-loading">Cargando...</div>}
      {error && <div className="admin-error">{error}</div>}

      {!loading && !error && (
        <div className="admin-users-list">
          {filtered.length === 0 ? (
            <div className="admin-empty">No se encontraron usuarios</div>
          ) : (
            filtered.map((u) => (
              <div key={u.id} className="admin-data-card">
                <div className="admin-data-card-info">
                  <h3>{u.profile.fullName}</h3>
                  <p>{u.email}</p>
                </div>
                <span className={`role-badge role-${u.role}`}>
                  {roleLabel[u.role] ?? u.role}
                </span>
                <span className={`admin-status-badge ${u.status === "active" ? "approved" : "rejected"}`}>
                  {statusLabel[u.status] ?? u.status}
                </span>
                <button
                  className={`admin-btn ${u.status === "active" ? "admin-btn-ghost" : "admin-btn-primary"}`}
                  onClick={() => handleToggleStatus(u.id, u.status)}
                >
                  {u.status === "active" ? "Bloquear" : "Activar"}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}