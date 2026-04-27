import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { getMyLands } from "../services/api";

export default function MyLandsPage() {
  const { user } = useUser();
  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyLands = async () => {
      if (!user) return;
      try {
        const data = await getMyLands();
        setLands(data || []);
      } catch (err) {
        console.error("Error fetching my lands:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMyLands();
  }, [user]);

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1>Mis Terrenos</h1>
          <p>Gestiona tus terrenos publicados</p>
        </div>
        <div className="panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          <p>Cargando terrenos...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1>Mis Terrenos</h1>
        <p>Gestiona tus terrenos publicados</p>
      </div>

      {error && (
        <div className="panel" style={{ marginTop: "1.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "#fca5a5" }}>Error: {error}</p>
        </div>
      )}

      {lands.length === 0 ? (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <p>No tienes terrenos publicados.</p>
          <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>Los terrenos que crees aparecerán aquí.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
          {lands.map((land) => (
            <div key={land.id} className="panel">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h3>{land.title}</h3>
                  <p style={{ opacity: 0.7 }}>
                    {land.location?.province} · {land.location?.district}
                  </p>
                  <p style={{ opacity: 0.7 }}>
                    {land.areaHectares} ha · ${land.priceRule?.pricePerMonth}/mes
                  </p>
                </div>
                <span className={`status-badge ${land.status === "active" ? "status-active" : "status-draft"}`}>
                  {land.status === "active" ? "Activo" : land.status === "draft" ? "Borrador" : land.status}
                </span>
              </div>
              <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
                <Link to={`/lands/${land.id}`} className="btn btn-ghost" style={{ fontSize: "0.875rem" }}>
                  Ver detalle
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}