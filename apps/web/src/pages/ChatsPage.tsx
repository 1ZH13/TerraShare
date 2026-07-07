import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import type { ChatDto, ChatMessageDto } from "@terrashare/shared";
import { MessageCircle, Send, MessageCircleMore } from "lucide-react";
import { getChats, getMessages, sendMessage, getExternalContact } from "../services/api";
import EmptyState from "../components/EmptyState";
import "./chats.css";

function initials(text: string): string {
  return text
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function chatName(chat: ChatDto): string {
  return chat.otherParticipant?.displayName ?? "Conversación";
}

function shortTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" });
  }
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-PA", { day: "numeric", month: "short" });
}

export default function ChatsPage() {
  const { user } = useUser();
  const myId = user?.id;

  const [chats, setChats] = useState<ChatDto[]>([]);
  const [chatsState, setChatsState] = useState<"loading" | "ready" | "error">("loading");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [waLink, setWaLink] = useState<string | null>(null);

  const msgsRef = useRef<HTMLDivElement>(null);

  // Cargar lista de conversaciones.
  useEffect(() => {
    let active = true;
    getChats()
      .then((data) => {
        if (!active) return;
        setChats(data);
        setChatsState("ready");
        if (data.length > 0) setActiveId((prev) => prev ?? data[0].id);
      })
      .catch(() => active && setChatsState("error"));
    return () => {
      active = false;
    };
  }, []);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeId) ?? null, [chats, activeId]);

  // "Yo" = el participante que no es el interlocutor (el backend calcula
  // `otherParticipant` relativo al usuario autenticado). Sirve para distinguir
  // mis mensajes aunque Clerk no exponga el id aquí.
  const myParticipantId = useMemo(() => {
    if (!activeChat) return myId;
    const otherId = activeChat.otherParticipant?.userId;
    return activeChat.participants.find((p) => p.userId !== otherId)?.userId ?? myId;
  }, [activeChat, myId]);

  // Cargar mensajes + contacto WhatsApp del chat activo.
  useEffect(() => {
    if (!activeId) return;
    let active = true;
    setMsgsLoading(true);
    setWaLink(null);
    getMessages(activeId)
      .then((data) => active && setMessages(data))
      .catch(() => active && setMessages([]))
      .finally(() => active && setMsgsLoading(false));
    getExternalContact(activeId)
      .then((res) => {
        if (!active || !res?.whatsappEnabled || !res.contact?.phone) return;
        const phone = res.contact.phone.replace(/[^\d]/g, "");
        setWaLink(`https://wa.me/${phone}`);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activeId]);

  // Autoscroll al final cuando cambian los mensajes.
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeId || sending) return;
    setSending(true);
    // Optimista: mostramos el mensaje de inmediato.
    const optimistic: ChatMessageDto = {
      id: `tmp_${Date.now()}`,
      chatId: activeId,
      senderId: myParticipantId ?? myId ?? "me",
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    try {
      const saved = await sendMessage(activeId, text);
      if (saved) setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
      // Refrescar el preview de la lista.
      setChats((prev) =>
        prev.map((ch) =>
          ch.id === activeId
            ? { ...ch, lastMessage: { text, senderId: myId ?? "me", createdAt: optimistic.createdAt }, unread: false }
            : ch,
        ),
      );
    } catch {
      // Revertimos el optimista si falló.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  if (chatsState === "loading") {
    return (
      <div className="ch">
        <h1 className="ch-title">Mensajes</h1>
        <div className="ch-inbox" style={{ alignItems: "center", justifyContent: "center", display: "flex" }}>
          <p className="ch-list__empty">Cargando conversaciones…</p>
        </div>
      </div>
    );
  }

  if (chatsState === "error") {
    return (
      <div className="ch">
        <h1 className="ch-title">Mensajes</h1>
        <div className="ch-page-empty">
          <EmptyState icon={MessageCircle} tone="error" title="No pudimos cargar tus chats" description="Inténtalo de nuevo en un momento." />
        </div>
      </div>
    );
  }

  if (chats.length === 0) {
    return (
      <div className="ch">
        <h1 className="ch-title">Mensajes</h1>
        <div className="ch-page-empty">
          <EmptyState
            icon={MessageCircle}
            title="Aún no tienes conversaciones"
            description="Cuando contactes a un propietario o alguien te escriba, verás el chat aquí."
            action={{ label: "Explorar terrenos", to: "/catalog" }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="ch">
      <h1 className="ch-title">Mensajes</h1>
      <div className="ch-inbox">
        {/* lista */}
        <div className="ch-list">
          {chats.map((chat) => {
            const name = chatName(chat);
            return (
              <button
                key={chat.id}
                type="button"
                className={`ch-conv ${chat.id === activeId ? "is-active" : ""}`}
                onClick={() => setActiveId(chat.id)}
              >
                <span className="ch-conv__avatar">{initials(name)}</span>
                <div className="ch-conv__body">
                  <div className="ch-conv__top">
                    <span className="ch-conv__name">{name}</span>
                    <span className="ch-conv__time">{shortTime(chat.lastMessage?.createdAt ?? chat.updatedAt)}</span>
                  </div>
                  <div className="ch-conv__preview">
                    {chat.lastMessage?.text ?? (chat.landTitle ? `Sobre ${chat.landTitle}` : "Nueva conversación")}
                  </div>
                </div>
                {chat.unread && chat.id !== activeId && <span className="ch-conv__dot" aria-hidden="true" />}
              </button>
            );
          })}
        </div>

        {/* hilo */}
        <div className="ch-thread">
          {activeChat ? (
            <>
              <div className="ch-thread__head">
                <div className="ch-thread__peer">
                  <span className="ch-thread__avatar">{initials(chatName(activeChat))}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="ch-thread__name">{chatName(activeChat)}</div>
                    {activeChat.landTitle && <div className="ch-thread__land">{activeChat.landTitle}</div>}
                  </div>
                </div>
                {waLink && (
                  <a className="ch-wa" href={waLink} target="_blank" rel="noreferrer">
                    <MessageCircleMore size={15} /> WhatsApp
                  </a>
                )}
              </div>

              <div className="ch-msgs" ref={msgsRef}>
                {msgsLoading ? (
                  <p className="ch-list__empty">Cargando mensajes…</p>
                ) : messages.length === 0 ? (
                  <p className="ch-list__empty">Aún no hay mensajes. ¡Rompe el hielo!</p>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === myParticipantId;
                    return (
                      <div key={m.id} className={`ch-msg ${mine ? "ch-msg--mine" : ""}`}>
                        <span className="ch-msg__avatar">
                          {mine ? "Tú".slice(0, 2) : initials(chatName(activeChat))}
                        </span>
                        <div className="ch-msg__bubble">{m.text}</div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="ch-composer">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escribe un mensaje…"
                  aria-label="Escribe un mensaje"
                />
                <button type="button" className="ch-send" onClick={handleSend} disabled={sending || !draft.trim()}>
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="ch-thread__placeholder">
              <span className="ch-thread__placeholder-icon">
                <MessageCircle size={32} />
              </span>
              Selecciona una conversación para ver los mensajes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
