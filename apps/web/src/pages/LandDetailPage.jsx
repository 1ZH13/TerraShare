import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useClerk, useUser } from "@clerk/clerk-react";
import { getLandPrimaryUse, formatLandUse, getChatSeedMessages } from "../data/lands";
import { getLandById, getChats, createChat, getMessages, sendMessage, getExternalContact, setTokenFn } from "../services/api";

function useChat(landId, isSignedIn, user) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatId, setChatId] = useState(null);
  const [error, setError] = useState(null);
  const [externalContact, setExternalContact] = useState(null);

  useEffect(() => {
    if (!isSignedIn || !user) {
      const stored = sessionStorage.getItem(`terrashare-chat:${landId}`);
      const seed = getChatSeedMessages(landId);
      setMessages(stored ? JSON.parse(stored) : seed);
      setLoading(false);
      return;
    }

    const initChat = async () => {
      try {
        setTokenFn(() => user.getToken());
        const token = await user.getToken();
        if (!token) throw new Error("No token");

        const chats = await getChats();
        let chat = chats.find((c) => c.landId === landId && c.participants.some((p) => p.userId === user.id));

        if (!chat) {
          chat = await createChat({
            landId,
            participants: [{ userId: user.id, role: "tenant" }],
          });
        }

        if (chat) {
          setChatId(chat.id);
          const msgs = await getMessages(chat.id);
          setMessages(msgs.map((m) => ({
            id: m.id,
            role: m.senderId === user.id ? "tenant" : "owner",
            text: m.text,
            createdAt: m.createdAt,
          })));

          try {
            const contact = await getExternalContact(chat.id);
            if (contact?.whatsappEnabled && contact?.contact?.phone) {
              setExternalContact(contact.contact);
            }
          } catch (contactErr) {
            console.error("Could not fetch WhatsApp contact:", contactErr);
          }
        }
      } catch (err) {
        console.error("Error initializing chat:", err);
        const stored = sessionStorage.getItem(`terrashare-chat:${landId}`);
        const seed = getChatSeedMessages(landId);
        setMessages(stored ? JSON.parse(stored) : seed);
      } finally {
        setLoading(false);
      }
    };

    initChat();
  }, [landId, isSignedIn, user]);

  useEffect(() => {
    if (!isSignedIn && messages.length > 0) {
      sessionStorage.setItem(`terrashare-chat:${landId}`, JSON.stringify(messages));
    }
  }, [messages, landId, isSignedIn]);

  const addMessage = async (text) => {
    if (!isSignedIn || !chatId) {
      const newMsg = {
        id: crypto.randomUUID(),
        role: "tenant",
        text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
      return;
    }

    try {
      const msg = await sendMessage(chatId, text);
      setMessages((prev) => [...prev, {
        id: msg.id,
        role: "tenant",
        text: msg.text,
        createdAt: msg.createdAt,
      }]);
    } catch (err) {
      console.error("Error sending message:", err);
      const newMsg = {
        id: crypto.randomUUID(),
        role: "tenant",
        text,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  };

  const clearMessages = () => {
    setMessages([]);
    if (!isSignedIn) {
      sessionStorage.removeItem(`terrashare-chat:${landId}`);
    }
  };

  return { messages, loading, addMessage, clearMessages, externalContact };
}

export default function LandDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { openSignIn } = useClerk();
  const { isSignedIn, user } = useUser();
  const [message, setMessage] = useState("");
  const [land, setLand] = useState(null);
  const [landLoading, setLandLoading] = useState(true);
  const [landError, setLandError] = useState(null);

  const { messages, loading: chatLoading, addMessage, clearMessages, externalContact } = useChat(id, isSignedIn, user);

  useEffect(() => {
    const fetchLand = async () => {
      try {
        const data = await getLandById(id);
        setLand(data);
      } catch (err) {
        console.error("Error fetching land:", err);
        setLandError(err.message);
      } finally {
        setLandLoading(false);
      }
    };
    fetchLand();
  }, [id]);

  const handleRequest = async () => {
    if (!isSignedIn) {
      openSignIn({ redirectUrl: `/reserve/${id}` });
      return;
    }
    navigate(`/reserve/${id}`);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (!text) return;
    setMessage("");
    await addMessage(text);
  };

  if (landLoading) {
    return (
      <div className="page-shell">
        <div className="glass-panel empty-state">
          <p>Cargando terreno...</p>
        </div>
      </div>
    );
  }

  if (landError || !land) {
    return (
      <div className="page-shell">
        <div className="glass-panel empty-state">
          <h1>Terreno no encontrado</h1>
          <p>{landError || "El terreno que buscas no existe."}</p>
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
            <p>{land.location?.province} · {land.location?.district}</p>
            <p className="detail-summary">{land.description}</p>
          </div>
          <div className="detail-price-box">
            <strong>${land.priceRule?.pricePerMonth}</strong>
            <span>/ mes</span>
          </div>
        </section>

        <section className="detail-grid">
          <div className="glass-panel detail-main-panel">
            <h2>Características</h2>
            <div className="feature-grid">
              {(land.features || []).map((feature) => (
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
                <p>{isSignedIn ? "Mensajes guardados en el servidor" : "Inicia sesión para chatear con el propietario"}</p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {externalContact && (
                  <a
                    href={`https://wa.me/${externalContact.phone.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ background: "#25D366", color: "white", borderColor: "#25D366" }}
                  >
                    WhatsApp
                  </a>
                )}
                <button className="btn btn-ghost" onClick={clearMessages}>Limpiar</button>
              </div>
            </div>

            <div className="chat-thread">
              {chatLoading ? (
                <div className="chat-empty">Cargando mensajes...</div>
              ) : messages.length === 0 ? (
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
                placeholder={isSignedIn ? "Escribe tu mensaje..." : "Inicia sesión para enviar mensajes"}
                rows={3}
                disabled={!isSignedIn}
              />
              <button className="btn btn-primary" type="submit" disabled={!message.trim() || !isSignedIn}>
                Enviar
              </button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}