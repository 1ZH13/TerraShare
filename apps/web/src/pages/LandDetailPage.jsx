import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { getLandById, getLandPrimaryUse, formatLandUse, getChatSeedMessages } from "../data/lands";

function readChat(landId) {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(`terrashare-chat:${landId}`);
    return raw ? JSON.parse(raw) : getChatSeedMessages(landId);
  } catch {
    return getChatSeedMessages(landId);
  }
}

function writeChat(landId, messages) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(`terrashare-chat:${landId}`, JSON.stringify(messages));
}

export default function LandDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openSignIn } = useClerk();
  const { isSignedIn } = useUser();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const land = useMemo(() => getLandById(id), [id]);

  useEffect(() => {
    if (!land) return;
    setMessages(readChat(land.id));
  }, [land]);

  useEffect(() => {
    if (!land) return;
    writeChat(land.id, messages);
  }, [land, messages]);

  const handleRequest = async () => {
    if (!isSignedIn) {
      openSignIn({ redirectUrl: `/reserve/${id}` });
      return;
    }

    navigate(`/reserve/${id}`);
  };

  const handleSend = (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;

    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "tenant",
        text,
        createdAt: new Date().toISOString(),
      },
    ]);
    setMessage("");
  };

  const handleClear = () => setMessages([]);

  if (!land) {
    return (
      <div className="page-shell">
        <div className="glass-panel empty-state">
          <h1>Terreno no encontrado</h1>
          <Link to="/catalog" className="btn btn-primary">Volver al catálogo</Link>
        </div>
      </div>
    );
  }

  const primaryUse = formatLandUse(getLandPrimaryUse(land));

  return (
    <div className="page-shell">
      <div className="glass-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog">Terrenos</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
        <div className="auth-actions">
          <Link to="/register" className="btn btn-primary">Crear cuenta</Link>
        </div>
      </div>

      <main>
        <Link to="/catalog" className="back-link-text">← Volver al catálogo</Link>

        <section className="detail-hero glass-panel">
          <div>
            <span className="card-badge">{primaryUse}</span>
            <h1>{land.title}</h1>
            <p>{land.location.province} · {land.location.district}</p>
            <p className="detail-summary">{land.description}</p>
          </div>
          <div className="detail-price-box">
            <strong>${land.priceRule.pricePerMonth}</strong>
            <span>/ mes</span>
          </div>
        </section>

        <section className="detail-grid">
          <div className="glass-panel detail-main-panel">
            <h2>Características</h2>
            <div className="feature-grid">
              {land.features.map((feature) => (
                <div key={feature} className="feature-chip">{feature}</div>
              ))}
            </div>

            <div className="detail-specs">
              <div><span>Área</span><strong>{land.areaHectares} ha</strong></div>
              <div><span>Agua</span><strong>{land.water}</strong></div>
              <div><span>Acceso</span><strong>{land.access}</strong></div>
              <div><span>Disponible desde</span><strong>{land.availability?.availableFrom ?? "Ahora"}</strong></div>
            </div>

            <button className="btn btn-primary btn-full" onClick={handleRequest}>
              Solicitar alquiler
            </button>
          </div>

          <div className="glass-panel chat-panel">
            <div className="chat-header">
              <div>
                <h2>Chat interno</h2>
                <p>Solo en el navegador, con sessionStorage.</p>
              </div>
              <button className="btn btn-ghost" onClick={handleClear}>Limpiar</button>
            </div>

            <div className="chat-thread">
              {messages.length === 0 ? (
                <div className="chat-empty">Aún no hay mensajes.</div>
              ) : (
                messages.map((item) => (
                  <div key={item.id} className={`chat-bubble ${item.role === "tenant" ? "chat-bubble-user" : "chat-bubble-owner"}`}>
                    <span>{item.text}</span>
                  </div>
                ))
              )}
            </div>

            <form className="chat-form" onSubmit={handleSend}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje..."
                rows={3}
              />
              <button className="btn btn-primary" type="submit" disabled={!message.trim()}>
                Enviar
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
