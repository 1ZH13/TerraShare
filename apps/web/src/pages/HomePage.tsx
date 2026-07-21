import { useEffect, useState } from "react";
import { shortId } from "../lib/short-id";
import { Link, useNavigate } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import type { ChatDto, LandDto, RentalRequestDto, RentalRequestStatus } from "@terrashare/shared";
import {
  Search,
  Map,
  Calendar,
  CreditCard,
  Check,
  Plus,
  LayoutList,
  Inbox,
  TrendingUp,
  Eye,
  ClipboardList,
  Heart,
  MessageCircle,
} from "lucide-react";
import { getChats, getMyFavorites, getMyLands, listRentalRequests, photoSrc } from "../services/api";
import { getDisplayName } from "../components/authDisplay";
import { useAppMode } from "../components/AppLayout";
import EmptyState from "../components/EmptyState";
import { formatLandPrice, formatLandPriceShort, monthlyPrice } from "../lib/land-price";
import "./home.css";

type LoadState = "loading" | "ready" | "error";

// Estado → etiqueta, clase de badge y tratamiento del pie de tarjeta.
const REQUEST_STATUS: Record<
  RentalRequestStatus,
  { label: string; badge: string; foot: "wait" | "pay" | "active" | "none" }
> = {
  draft: { label: "Borrador", badge: "hm-badge--neutral", foot: "none" },
  pending_owner: { label: "Pendiente", badge: "hm-badge--pending", foot: "wait" },
  approved: { label: "Aprobada", badge: "hm-badge--approved", foot: "pay" },
  rejected: { label: "Rechazada", badge: "hm-badge--clay", foot: "none" },
  cancelled: { label: "Cancelada", badge: "hm-badge--neutral", foot: "none" },
  pending_payment: { label: "Pago pendiente", badge: "hm-badge--pending", foot: "pay" },
  paid: { label: "Activa", badge: "hm-badge--active", foot: "active" },
};

const USE_LABELS: Record<string, string> = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Mixto",
  otro: "Otro",
};

function formatMonth(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-PA", { month: "short", year: "numeric" });
}

function formatPeriod(startDate?: string, endDate?: string): string {
  return `${formatMonth(startDate)} – ${formatMonth(endDate)}`;
}

function useLabel(use?: string): string {
  if (!use) return "Terreno";
  return USE_LABELS[use] ?? use;
}

// ─── Modo Busco ───────────────────────────────────────────────────────────────
function BuscoHome({ name }: { name: string }) {
  const [requests, setRequests] = useState<RentalRequestDto[]>([]);
  const [reqState, setReqState] = useState<LoadState>("loading");
  const [chats, setChats] = useState<ChatDto[]>([]);
  const [chatsState, setChatsState] = useState<LoadState>("loading");
  const [favorites, setFavorites] = useState<LandDto[]>([]);
  const [favState, setFavState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;
    listRentalRequests()
      .then((data) => {
        if (!active) return;
        setRequests(data);
        setReqState("ready");
      })
      .catch(() => active && setReqState("error"));
    getMyFavorites()
      .then((data) => {
        if (!active) return;
        setFavorites(data);
        setFavState("ready");
      })
      .catch(() => active && setFavState("error"));
    getChats()
      .then((data) => {
        if (!active) return;
        setChats(data);
        setChatsState("ready");
      })
      .catch(() => active && setChatsState("error"));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="hm">
      <div className="hm-head">
        <div>
          <h1 className="hm-head__title">Hola, {name}</h1>
          <p className="hm-head__sub">Encuentra el terreno ideal para tu proyecto.</p>
        </div>
        <Link to="/catalog" className="hm-btn">
          <Map size={17} /> Ver mapa
        </Link>
      </div>

      {/* buscador */}
      <Link to="/catalog" className="hm-search">
        <span className="hm-search__icon">
          <Search size={19} />
        </span>
        <span className="hm-search__ph">Buscar por provincia, uso o palabra clave…</span>
        <span className="hm-search__chips">
          <span className="hm-chip">Agricultura</span>
          <span className="hm-chip">Ganadería</span>
          <span className="hm-chip hm-chip--active">Todos los filtros</span>
        </span>
      </Link>

      {/* mis solicitudes */}
      <section className="hm-sec">
        <div className="hm-sec__head">
          <h2 className="hm-sec__title">Mis solicitudes</h2>
          {requests.length > 0 && (
            <Link to="/dashboard/payments" className="hm-link">
              Ver todas
            </Link>
          )}
        </div>
        {reqState === "loading" ? (
          <div className="hm-grid3">
            <div className="hm-skeleton" />
            <div className="hm-skeleton" />
            <div className="hm-skeleton" />
          </div>
        ) : reqState === "error" ? (
          <div className="hm-empty hm-empty--error">
            No pudimos cargar tus solicitudes. Inténtalo de nuevo en un momento.
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Aún no tienes solicitudes"
            description="Cuando solicites un terreno, aparecerá aquí con su estado."
            action={{ label: "Explorar terrenos", to: "/catalog" }}
          />
        ) : (
          <div className="hm-grid3">
            {requests.slice(0, 6).map((req) => {
              const status = REQUEST_STATUS[req.status];
              return (
                <div key={req.id} className="hm-req">
                  <div className="hm-req__top">
                    <span className="hm-req__title">
                      {req.operation === "venta" ? "Compra" : useLabel(req.intendedUse)}
                    </span>
                    <span className={`hm-badge ${status.badge}`}>{status.label}</span>
                  </div>
                  <div className="hm-req__meta">
                    <Calendar size={14} /> {formatPeriod(req.period?.startDate, req.period?.endDate)}
                  </div>
                  {status.foot === "pay" ? (
                    <Link to="/pay/$requestId" params={{ requestId: req.id }} className="hm-req__pay">
                      <CreditCard size={16} /> Completar pago
                    </Link>
                  ) : status.foot === "active" ? (
                    <div className="hm-req__ok">
                      <Check size={15} /> Alquiler en curso
                    </div>
                  ) : status.foot === "wait" ? (
                    <div className="hm-req__note">Esperando respuesta del propietario</div>
                  ) : (
                    <div className="hm-req__note">Solicitud #{shortId(req.id)}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* guardados + chats */}
      <div className="hm-split">
        <section>
          <div className="hm-sec__head">
            <h2 className="hm-sec__title">Guardados</h2>
            {favorites.length > 0 && (
              <Link to="/catalog" className="hm-link">
                Ver catálogo
              </Link>
            )}
          </div>
          {favState === "loading" ? (
            <div className="hm-empty">Cargando guardados…</div>
          ) : favState === "error" ? (
            <div className="hm-empty hm-empty--error">No pudimos cargar tus guardados.</div>
          ) : favorites.length === 0 ? (
            <EmptyState
              compact
              icon={Heart}
              title="Todavía no guardas terrenos"
              description="Toca el corazón en un terreno para guardarlo aquí."
            />
          ) : (
            <div className="hm-favlist">
              {favorites.slice(0, 4).map((land) => (
                <Link
                  key={land.id}
                  to="/lands/$id"
                  params={{ id: land.id }}
                  className="hm-favcard"
                >
                  <span className="hm-favcard__thumb" aria-hidden="true">
                    {land.photos?.[0] ? (
                      <img src={photoSrc(land.photos[0])} alt="" />
                    ) : (
                      <Heart size={16} />
                    )}
                  </span>
                  <span className="hm-favcard__body">
                    <span className="hm-favcard__title">{land.title}</span>
                    <span className="hm-favcard__meta">
                      {land.location?.province ?? "—"} · {land.area} ha
                    </span>
                  </span>
                  {monthlyPrice(land) !== null ? (
                    <span className="hm-favcard__price">
                      ${monthlyPrice(land)!.toLocaleString("es-PA")}
                      <span>/mes</span>
                    </span>
                  ) : (
                    <span className="hm-favcard__price">{formatLandPriceShort(land)}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="hm-sec__head">
            <h2 className="hm-sec__title">Chats</h2>
            <Link to="/dashboard/chats" className="hm-link">
              Ver todos
            </Link>
          </div>
          {chatsState === "loading" ? (
            <div className="hm-empty">Cargando conversaciones…</div>
          ) : chatsState === "error" ? (
            <div className="hm-empty hm-empty--error">No pudimos cargar tus chats.</div>
          ) : chats.length === 0 ? (
            <EmptyState compact icon={MessageCircle} title="Aún no tienes conversaciones" />
          ) : (
            <div className="hm-chatlist">
              {chats.slice(0, 4).map((chat) => {
                const name = chat.otherParticipant?.displayName ?? "Conversación";
                const initials = name
                  .split(" ")
                  .map((w) => w.charAt(0))
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const preview = chat.lastMessage?.text ?? (chat.landTitle ? `Sobre ${chat.landTitle}` : "Nueva conversación");
                return (
                  <Link key={chat.id} to="/dashboard/chats" className="hm-chatrow">
                    <span className="hm-avatar" aria-hidden="true">
                      {initials || "TS"}
                    </span>
                    <div className="hm-chatrow__body">
                      <div className="hm-chatrow__title">{name}</div>
                      <div className="hm-chatrow__sub">{preview}</div>
                    </div>
                    {chat.unread && <span className="hm-dot" aria-hidden="true" />}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Modo Ofrezco ───────────────────────────────────────────────────────────────
function OfrezcoHome() {
  const navigate = useNavigate();
  const [lands, setLands] = useState<LandDto[]>([]);
  const [landsState, setLandsState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;
    // Nota(#136): getMyLands() (GET /lands/me) puede fallar en backend; se maneja
    // con estado vacío/error, sin datos falsos.
    getMyLands()
      .then((data) => {
        if (!active) return;
        setLands(data);
        setLandsState("ready");
      })
      .catch(() => active && setLandsState("error"));
    return () => {
      active = false;
    };
  }, []);

  const activeCount = landsState === "ready" ? String(lands.length) : "—";

  return (
    <div className="hm">
      <div className="hm-head">
        <div>
          <h1 className="hm-head__title">Tu tierra, trabajando por ti</h1>
          <p className="hm-head__sub">Gestiona tus publicaciones y las solicitudes que recibes.</p>
        </div>
        <Link to="/dashboard/lands" className="hm-btn">
          <Plus size={17} /> Publicar terreno
        </Link>
      </div>

      {/* stats */}
      <div className="hm-stats">
        <div className="hm-stat">
          <div className="hm-stat__icon">
            <LayoutList size={19} />
          </div>
          <div className="hm-stat__value">{activeCount}</div>
          <div className="hm-stat__label">Publicaciones activas</div>
        </div>
        <div className="hm-stat">
          <div className="hm-stat__icon hm-stat__icon--clay">
            <Inbox size={19} />
          </div>
          {/* TODO(#136): sin endpoint de solicitudes-por-dueño todavía. */}
          <div className="hm-stat__value">—</div>
          <div className="hm-stat__label">Solicitudes nuevas</div>
        </div>
        <div className="hm-stat hm-stat--dark">
          <div className="hm-stat__icon hm-stat__icon--light">
            <TrendingUp size={19} />
          </div>
          {/* TODO(#136): analítica de ingresos pendiente en backend. */}
          <div className="hm-stat__value">—</div>
          <div className="hm-stat__label">Ingresos del mes</div>
        </div>
      </div>

      {/* solicitudes recibidas */}
      <section>
        <h2 className="hm-sec__title" style={{ marginBottom: "16px" }}>
          Solicitudes recibidas
        </h2>
        {/* TODO(#136): no existe endpoint de solicitudes recibidas por el dueño. */}
        <div style={{ marginBottom: "44px" }}>
          <EmptyState
            icon={Inbox}
            title="Sin solicitudes por ahora"
            description="Cuando alguien solicite uno de tus terrenos, aparecerá aquí."
          />
        </div>
      </section>

      {/* mis publicaciones */}
      <section>
        <div className="hm-sec__head">
          <h2 className="hm-sec__title">Mis publicaciones</h2>
          <Link to="/dashboard/lands" className="hm-link">
            Ver todas
          </Link>
        </div>
        {landsState === "loading" ? (
          <div className="hm-grid3">
            <div className="hm-skeleton" />
            <div className="hm-skeleton" />
            <div className="hm-skeleton" />
          </div>
        ) : landsState === "error" ? (
          <div className="hm-empty hm-empty--error">
            No pudimos cargar tus terrenos ahora mismo. (Pendiente de backend, #136.)
          </div>
        ) : lands.length === 0 ? (
          <div className="hm-grid3">
            <Link to="/dashboard/lands" className="hm-pub__add">
              <Plus size={26} />
              <span>Publicar tu primer terreno</span>
            </Link>
          </div>
        ) : (
          <div className="hm-grid3">
            {lands.slice(0, 5).map((land) => {
              const active = land.status === "active";
              return (
                <Link key={land.id} to="/lands/$id" params={{ id: land.id }} className="hm-pub">
                  <div className="hm-pub__media">
                    <div className="hm-pub__photo hm-photo" aria-hidden="true" />
                    <span className={`hm-pub__badge ${active ? "" : "hm-pub__badge--paused"}`}>
                      {active ? "Publicada" : land.status === "draft" ? "Borrador" : "Pausada"}
                    </span>
                  </div>
                  <div className="hm-pub__body">
                    <div className="hm-pub__title">{land.title}</div>
                    <div className="hm-pub__meta">
                      {useLabel(land.allowedUses?.[0])} · {formatLandPrice(land)}
                    </div>
                    <div className="hm-pub__stats">
                      <span className="hm-pub__stat">
                        <Eye size={15} /> —
                      </span>
                      <span className="hm-pub__stat">
                        <Inbox size={15} /> —
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
            <Link to="/dashboard/lands" className="hm-pub__add">
              <Plus size={26} />
              <span>Publicar otro terreno</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default function HomePage() {
  const { mode } = useAppMode();
  const { user } = useUser();
  const name = getDisplayName(user).split(" ")[0];

  return mode === "ofrezco" ? <OfrezcoHome /> : <BuscoHome name={name} />;
}
