import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useClerk } from "@clerk/clerk-react";

const STORAGE_KEY = "terrashare_chat_messages";

function loadMessages() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveMessages(msgs) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
}

export default function ChatPage() {
  const { user } = useClerk();
  const [messages, setMessages] = useState(loadMessages);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      text: input.trim(),
      sender: user?.primaryEmailAddress?.emailAddress ?? "Tú",
      timestamp: new Date().toISOString(),
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    saveMessages(updated);
    setInput("");
  };

  const handleClear = () => {
    setMessages([]);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <header className="top-nav">
        <Link to="/" className="brand">TerraShare</Link>
        <nav className="menu">
          <Link to="/catalog">Explorar</Link>
          <Link to="/dashboard">Mis solicitudes</Link>
        </nav>
      </header>

      <main>
        <div className="section-header" style={{ marginBottom: "1rem" }}>
          <h1>Chat interno</h1>
          <p>Conversacion con el arrendador/propietario. Los mensajes se borran al cerrar el navegador.</p>
        </div>

        <div className="panel chat-panel">
          <div className="chat-messages" id="chat-messages">
            {messages.length === 0 ? (
              <p className="chat-empty">Sin mensajes aun. Escribe algo para comenzar.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble ${msg.sender === (user?.primaryEmailAddress?.emailAddress ?? "Tú") ? "chat-mine" : "chat-theirs"}`}
                >
                  <span className="chat-sender">{msg.sender}</span>
                  <p className="chat-text">{msg.text}</p>
                  <span className="chat-time">
                    {new Date(msg.timestamp).toLocaleTimeString("es-PA", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form className="chat-input-row" onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="chat-input"
              disabled={!user?.primaryEmailAddress}
            />
            <button type="submit" className="btn btn-primary" disabled={!input.trim()}>
              Enviar
            </button>
          </form>

          {messages.length > 0 && (
            <button className="text-button" onClick={handleClear} style={{ marginTop: "0.5rem" }}>
              Limpiar chat
            </button>
          )}
        </div>
      </main>
    </div>
  );
}