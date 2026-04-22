import { useState, useEffect } from "react";

const mockStats = [
  { label: "Usuarios totales", value: "1,234" },
  { label: "Terrenos activos", value: "89" },
  { label: "Solicitudes pendientes", value: "12" },
  { label: "Contratos activos", value: "45" },
];

const mockUsers = [
  { id: "1", name: "Juan Pérez", email: "juan@example.com", status: "active", role: "user" },
  { id: "2", name: "María García", email: "maria@example.com", status: "active", role: "owner" },
  { id: "3", name: "Carlos López", email: "carlos@example.com", status: "blocked", role: "user" },
];

export default function Dashboard() {
  return (
    <div>
      <div className="section-header">
        <h1>Dashboard</h1>
        <p>Resumen de la plataforma TerraShare</p>
      </div>

      <div className="stats-grid" style={{ marginTop: "1.5rem" }}>
        {mockStats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <h3>{stat.label}</h3>
            <p>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginTop: "1.5rem" }}>
        <div className="section-header compact">
          <h2>Usuarios recientes</h2>
        </div>
        
        <table className="table" style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span className={`status-badge ${user.status === "active" ? "status-active" : "status-blocked"}`}>
                    {user.status === "active" ? "Activo" : "Bloqueado"}
                  </span>
                </td>
                <td>
                  <button className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem" }}>
                    {user.status === "active" ? "Bloquear" : "Activar"}
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