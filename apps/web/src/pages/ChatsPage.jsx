import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

export default function ChatsPage() {
  const { user } = useUser();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChats = async () => {
      if (!user || !user.getToken) {
        setLoading(false);
        return;
      }
      try {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const token = await user.getToken();
        const res = await fetch(`${BASE_URL}/api/v1/chats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setChats(data?.data || []);
      } catch (err) {
        console.error("Error fetching chats:", err);
        setError(err.message);
        setChats([]);
      } finally {
        setLoading(false);
      }
    };
    fetchChats();
  }, [user]);

  if (loading) {
    return (
      <div>
        <div className="section-header">
          <h1>Mis Chats</h1>
          <p>Conversaciones con propietarios y arrendatarios</p>
        </div>
        <div className="glass-panel" style={{ marginTop: "1.5rem", textAlign: "center", padding: "3rem" }}>
          <p>Cargando chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h1>Mis Chats</h1>
        <p>Conversaciones con propietarios y arrendatarios</p>
      </div>

      {error && (
        <div className="glass-panel" style={{ marginTop: "1.5rem", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
          <p style={{ color: "var(--danger)" }}>Error: {error}</p>
        </div>
      )}

      {chats.length === 0 ? (
        <div className="glass-panel" style={{ marginTop: "1.5rem" }}>
          <p>No tienes conversaciones activas.</p>
          <p style={{ opacity: 0.7, marginTop: "0.5rem" }}>Cuando tengas solicitudes aprobadas, podras chatear con el propietario.</p>
          <Link to="/catalog" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            Explorar terrenos
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.5rem" }}>
          {chats.map((chat) => (
            <Link key={chat.id} to={`/dashboard/chats/${chat.id}`} className="glass-card" style={{ textDecoration: "none", display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div>
                  <h3 style={{ margin: "0 0 0.25rem" }}>{chat.landTitle}</h3>
                  <p style={{ margin: 0, opacity: 0.7 }}>
                    {chat.participantName}
                  </p>
                  <p style={{ margin: "0.5rem 0 0", opacity: 0.6, fontSize: "0.9rem" }}>
                    {chat.lastMessage}
                  </p>
                </div>
                <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>
                  {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleDateString("es-PA") : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}