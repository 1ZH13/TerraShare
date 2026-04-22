import { useState } from "react";

const mockUsers = [
  { id: "user_1", name: "Juan Pérez", email: "juan@example.com", status: "active", role: "user", createdAt: "2024-01-15" },
  { id: "user_2", name: "María García", email: "maria@example.com", status: "active", role: "owner", createdAt: "2024-02-20" },
  { id: "user_3", name: "Carlos López", email: "carlos@example.com", status: "blocked", role: "user", createdAt: "2024-03-10" },
  { id: "user_4", name: "Ana Torres", email: "ana@example.com", status: "active", role: "user", createdAt: "2024-04-05" },
  { id: "user_5", name: "Pedro Martínez", email: "pedro@example.com", status: "active", role: "owner", createdAt: "2024-05-12" },
];

export default function Users() {
  const [users, setUsers] = useState(mockUsers);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredUsers = users.filter((user) => {
    const matchesFilter = filter === "all" || user.status === filter;
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleToggleStatus = (userId) => {
    setUsers(users.map((user) =>
      user.id === userId
        ? { ...user, status: user.status === "active" ? "blocked" : "active" }
        : user
    ));
  };

  return (
    <div>
      <div className="section-header">
        <h1>Gestión de Usuarios</h1>
        <p>Administra cuentas de usuarios y propietarios</p>
      </div>

      <div className="filters-bar" style={{ marginTop: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Buscar usuarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: "300px" }}
        />
        
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="blocked">Bloqueados</option>
        </select>

        <span style={{ marginLeft: "auto", opacity: 0.7 }}>
          {filteredUsers.length} usuario{filteredUsers.length !== 1 ? "s" : ""}
        </span>
      </div>

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
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 700 }}>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className="role-badge" style={{
                    display: "inline-block",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: user.role === "owner" ? "rgba(13, 111, 147, 0.15)" : "rgba(11, 95, 55, 0.15)",
                    color: user.role === "owner" ? "var(--river-500)" : "var(--leaf-700)",
                  }}>
                    {user.role === "owner" ? "Propietario" : "Usuario"}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.status === "active" ? "status-active" : "status-blocked"}`}>
                    {user.status === "active" ? "Activo" : "Bloqueado"}
                  </span>
                </td>
                <td style={{ opacity: 0.7 }}>{user.createdAt}</td>
                <td>
                  <button
                    className={`btn ${user.status === "active" ? "btn-ghost" : "btn-primary"}`}
                    onClick={() => handleToggleStatus(user.id)}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.25rem 0.5rem",
                    }}
                  >
                    {user.status === "active" ? "Bloquear" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", opacity: 0.5, padding: "2rem" }}>
                  No se encontraron usuarios
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}