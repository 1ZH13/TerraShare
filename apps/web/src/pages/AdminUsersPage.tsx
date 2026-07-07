import { useState, useEffect } from "react";
import type { UserSummaryDto } from "@terrashare/shared";
import { Search, ChevronDown } from "lucide-react";
import { listAdminUsers, updateUserStatus } from "../services/adminApi";
import "./admin.css";

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    const filters: { status?: string; search?: string } = {};
    if (filter === "active" || filter === "blocked") filters.status = filter;
    if (search.trim()) filters.search = search.trim();

    listAdminUsers(filters)
      .then((res) => setUsers((((res.data as unknown) as { items?: UserSummaryDto[] })?.items ?? [])))
      .catch((e) => setError(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, [filter, search]);

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "active" ? "blocked" : "active";
    try {
      await updateUserStatus(userId, nextStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? ({ ...u, status: nextStatus } as UserSummaryDto) : u)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <>
      <h1 className="adm-title">Usuarios</h1>
      <p className="adm-sub">Gestiona las cuentas de la plataforma.</p>

      <div className="adm-toolbar">
        <div className="adm-search">
          <span className="adm-search__icon">
            <Search size={17} />
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo…"
            aria-label="Buscar usuarios"
          />
        </div>
        <label className="adm-pill">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por estado">
            <option value="all">Estado</option>
            <option value="active">Activos</option>
            <option value="blocked">Bloqueados</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      <div className="adm-table">
        <div className="adm-trow adm-trow--head" style={{ gridTemplateColumns: "2fr 0.8fr 0.8fr auto" }}>
          <span>Usuario</span>
          <span>Rol</span>
          <span>Estado</span>
          <span />
        </div>
        {loading ? (
          <div className="adm-empty">Cargando…</div>
        ) : error ? (
          <div className="adm-empty adm-empty--error">No pudimos cargar los usuarios.</div>
        ) : users.length === 0 ? (
          <div className="adm-empty">No se encontraron usuarios.</div>
        ) : (
          users.map((u) => {
            const active = u.status === "active";
            const isAdmin = u.role === "admin";
            return (
              <div key={u.id} className="adm-trow" style={{ gridTemplateColumns: "2fr 0.8fr 0.8fr auto" }}>
                <div className="adm-user">
                  <span className="adm-user__avatar">{initials(u.profile.fullName || u.email)}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="adm-user__name">{u.profile.fullName || "—"}</div>
                    <div className="adm-user__email">{u.email}</div>
                  </div>
                </div>
                <span>
                  {isAdmin ? <span className="adm-badge adm-badge--teal">Admin</span> : "Usuario"}
                </span>
                <span>
                  <span className={`adm-badge ${active ? "adm-badge--green" : "adm-badge--red"}`}>
                    {active ? "Activo" : "Bloqueado"}
                  </span>
                </span>
                <span className="adm-cell--right">
                  {isAdmin ? (
                    <span style={{ color: "var(--ts-sage-3)" }}>—</span>
                  ) : (
                    <button
                      type="button"
                      className={`adm-act ${active ? "adm-act--danger" : ""}`}
                      onClick={() => handleToggleStatus(u.id, u.status)}
                    >
                      {active ? "Bloquear" : "Desbloquear"}
                    </button>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {!loading && !error && users.length > 0 && (
        <div className="adm-foot">
          <span>{users.length} usuario{users.length !== 1 ? "s" : ""}</span>
        </div>
      )}
    </>
  );
}
