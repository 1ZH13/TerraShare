import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { Check, MessageCircle, CreditCard, Bell, MapPin } from "lucide-react";
import EmptyState from "../components/EmptyState";
import "./notifications.css";

interface NotificationItem {
  id: string;
  type: string;
  title?: string;
  message?: string;
  read?: boolean;
  actionUrl?: string;
  createdAt?: string;
}

// Tipo → icono + variante de color (fiel al prototipo).
const TYPE_STYLE: Record<string, { icon: typeof Check; variant: string }> = {
  rental_request_status: { icon: Check, variant: "green" },
  message: { icon: MessageCircle, variant: "teal" },
  payment: { icon: CreditCard, variant: "amber" },
  land_available: { icon: MapPin, variant: "neutral" },
  system: { icon: Bell, variant: "neutral" },
};

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "Ayer";
  if (d < 7) return `Hace ${d} días`;
  return new Date(iso).toLocaleDateString("es-PA", { day: "numeric", month: "short" });
}

export default function NotificationsPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/v1/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setNotifications((data?.data as NotificationItem[]) || []);
      } catch (err) {
        console.error("Error fetching notifications:", err);
        setError(err instanceof Error ? err.message : "Error al cargar notificaciones");
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  // TODO(#136): sin endpoint para marcar como leídas; por ahora es optimista/local.
  const markAllRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="ntf">
      <div className="ntf-head">
        <h1 className="ntf-title">Notificaciones</h1>
        {hasUnread && (
          <button type="button" className="ntf-markall" onClick={markAllRead}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      {loading ? (
        <div className="ntf-empty">Cargando notificaciones…</div>
      ) : error ? (
        <div className="ntf-empty ntf-empty--error">No pudimos cargar tus notificaciones.</div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No tienes notificaciones"
          description="Recibirás alertas sobre tus solicitudes, pagos y mensajes."
        />
      ) : (
        <div className="ntf-list">
          {notifications.map((n) => {
            const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.system;
            const Icon = style.icon;
            const text = n.title ?? n.message ?? "Notificación";
            const clickable = Boolean(n.actionUrl);
            const content = (
              <>
                <span className={`ntf-item__icon ntf-item__icon--${style.variant}`}>
                  <Icon size={20} />
                </span>
                <div className="ntf-item__body">
                  <div className="ntf-item__text">{text}</div>
                  <div className="ntf-item__time">{relativeTime(n.createdAt)}</div>
                </div>
                {!n.read && <span className="ntf-item__dot" aria-hidden="true" />}
              </>
            );
            return clickable ? (
              <button
                key={n.id}
                type="button"
                className={`ntf-item ${n.read ? "ntf-item--read" : ""}`}
                onClick={() => navigate(n.actionUrl!)}
              >
                {content}
              </button>
            ) : (
              <div key={n.id} className={`ntf-item ${n.read ? "ntf-item--read" : ""}`}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
