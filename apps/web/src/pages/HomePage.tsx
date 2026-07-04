import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import type { ChatDto, LandDto, RentalRequestDto, RentalRequestStatus } from "@terrashare/shared";
import { Badge, Button, Card } from "../components/ui";
import type { BadgeTone } from "../components/ui";
import { getChats, getMyLands, listRentalRequests } from "../services/api";
import { getDisplayName } from "../components/authDisplay";
import { useAppMode } from "../components/AppLayout";
import "./home.css";

type LoadState = "loading" | "ready" | "error";

const REQUEST_STATUS: Record<RentalRequestStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "Borrador", tone: "neutral" },
  pending_owner: { label: "Pendiente", tone: "beige" },
  approved: { label: "Aprobada", tone: "green" },
  rejected: { label: "Rechazada", tone: "clay" },
  cancelled: { label: "Cancelada", tone: "neutral" },
  pending_payment: { label: "Pago pendiente", tone: "beige" },
  paid: { label: "Pagada", tone: "green" },
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

// ─── Modo Busco ───────────────────────────────────────────────────────────────
function BuscoHome({ name }: { name: string }) {
  const [requests, setRequests] = useState<RentalRequestDto[]>([]);
  const [reqState, setReqState] = useState<LoadState>("loading");
  const [chats, setChats] = useState<ChatDto[]>([]);
  const [chatsState, setChatsState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;
    listRentalRequests()
      .then((data) => {
        if (!active) return;
        setRequests(data);
        setReqState("ready");
      })
      .catch(() => active && setReqState("error"));
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
    <>
      <div className="hm-head">
        <div>
          <h1 className="ts-title">Hola, {name}</h1>
          <p>Encuentra el terreno ideal para tu proyecto.</p>
        </div>
      </div>

      <Link to="/catalog" className="hm-search">
        <span className="hm-search__box">Buscar por provincia, uso o palabra clave…</span>
        <Button variant="primary">Ver mapa</Button>
      </Link>

      <section className="hm-section">
        <div className="hm-section__head">
          <h2 className="ts-title">Mis solicitudes</h2>
        </div>
        {reqState === "loading" ? (
          <div className="hm-grid-3">
            <div className="hm-skeleton" />
            <div className="hm-skeleton" />
            <div className="hm-skeleton" />
          </div>
        ) : reqState === "error" ? (
          <Card>
            <p className="hm-state hm-state--error">
              No pudimos cargar tus solicitudes. Inténtalo de nuevo en un momento.
            </p>
          </Card>
        ) : requests.length === 0 ? (
          <Card>
            <p className="hm-state">
              Aún no tienes solicitudes. Explora el catálogo y solicita tu primer terreno.
            </p>
          </Card>
        ) : (
          <div className="hm-grid-3">
            {requests.slice(0, 6).map((req) => {
              const status = REQUEST_STATUS[req.status];
              return (
                <Card key={req.id}>
                  <div className="hm-item__top">
                    <span className="hm-item__title">{USE_LABELS[req.intendedUse] ?? req.intendedUse}</span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <div className="hm-item__meta">{formatPeriod(req.period?.startDate, req.period?.endDate)}</div>
                  <p className="hm-item__note">Solicitud #{req.id.slice(0, 8)}</p>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <div className="hm-split">
        <section className="hm-section">
          <div className="hm-section__head">
            <h2 className="ts-title">Guardados</h2>
          </div>
          {/* TODO(#137): no existe endpoint de favoritos/guardados todavía. */}
          <Card>
            <p className="hm-state">Todavía no guardas terrenos. Toca el corazón en un terreno para guardarlo aquí.</p>
          </Card>
        </section>

        <section className="hm-section">
          <div className="hm-section__head">
            <h2 className="ts-title">Chats</h2>
            <Link to="/dashboard/chats" className="hm-link">
              Ver todos
            </Link>
          </div>
          <Card flat>
            {chatsState === "loading" ? (
              <p className="hm-state">Cargando conversaciones…</p>
            ) : chatsState === "error" ? (
              <p className="hm-state hm-state--error">No pudimos cargar tus chats.</p>
            ) : chats.length === 0 ? (
              <p className="hm-state">Aún no tienes conversaciones.</p>
            ) : (
              <div className="hm-rows">
                {chats.slice(0, 4).map((chat) => (
                  <Link key={chat.id} to="/dashboard/chats" className="hm-row">
                    <span className="hm-avatar" aria-hidden="true">
                      TS
                    </span>
                    <div className="hm-row__body">
                      <div className="hm-row__title">Conversación</div>
                      {/* ChatDto no incluye el último mensaje; mostramos la fecha real. */}
                      <div className="hm-row__sub">Actualizado {formatMonth(chat.updatedAt)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </section>
      </div>
    </>
  );
}

// ─── Modo Ofrezco ───────────────────────────────────────────────────────────────
function OfrezcoHome() {
  const navigate = useNavigate();
  const [lands, setLands] = useState<LandDto[]>([]);
  const [landsState, setLandsState] = useState<LoadState>("loading");

  useEffect(() => {
    let active = true;
    // Nota(#136): getMyLands() (GET /lands/me) está roto en el backend; se
    // maneja el error con estado vacío/error, sin datos falsos.
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
    <>
      <div className="hm-head">
        <div>
          <h1 className="ts-title">Tu tierra, trabajando por ti</h1>
          <p>Gestiona tus publicaciones y las solicitudes que recibes.</p>
        </div>
        <Button variant="primary" onClick={() => navigate("/dashboard/lands")}>
          Publicar terreno
        </Button>
      </div>

      <div className="hm-stats">
        <Card>
          <div className="hm-stat__value">{activeCount}</div>
          <div className="hm-stat__label">Publicaciones activas</div>
        </Card>
        <Card>
          {/* TODO(#136): sin endpoint de solicitudes-por-dueño todavía. */}
          <div className="hm-stat__value">—</div>
          <div className="hm-stat__label">Solicitudes nuevas</div>
        </Card>
        <Card>
          {/* TODO(#136): analítica de ingresos pendiente en backend. */}
          <div className="hm-stat__value hm-stat__value--accent">—</div>
          <div className="hm-stat__label">Ingresos del mes</div>
        </Card>
      </div>

      <section className="hm-section">
        <div className="hm-section__head">
          <h2 className="ts-title">Solicitudes recibidas</h2>
        </div>
        {/* TODO(#136): no existe endpoint de solicitudes recibidas por el dueño. */}
        <Card>
          <p className="hm-state">
            Cuando alguien solicite uno de tus terrenos, aparecerá aquí. (Pendiente de backend, #136.)
          </p>
        </Card>
      </section>

      <section className="hm-section">
        <div className="hm-section__head">
          <h2 className="ts-title">Mis publicaciones</h2>
          <Link to="/dashboard/lands" className="hm-link">
            Ver todas
          </Link>
        </div>
        {landsState === "loading" ? (
          <div className="hm-grid-3">
            <div className="hm-skeleton" />
            <div className="hm-skeleton" />
            <div className="hm-skeleton" />
          </div>
        ) : landsState === "error" ? (
          <Card>
            <p className="hm-state hm-state--error">
              No pudimos cargar tus terrenos ahora mismo. (Pendiente de backend, #136.)
            </p>
          </Card>
        ) : lands.length === 0 ? (
          <div className="hm-grid-3">
            <Link to="/dashboard/lands" className="hm-add">
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>+</span>
              Publicar tu primer terreno
            </Link>
          </div>
        ) : (
          <div className="hm-grid-3">
            {lands.slice(0, 5).map((land) => (
              <Card key={land.id} interactive onClick={() => navigate(`/lands/${land.id}`)}>
                <div className="hm-item__top">
                  <Badge tone={land.status === "active" ? "green" : "beige"}>
                    {land.status === "active" ? "Publicada" : land.status === "draft" ? "Borrador" : "Inactiva"}
                  </Badge>
                </div>
                <div className="hm-item__title" style={{ marginTop: "0.6rem" }}>
                  {land.title}
                </div>
                <div className="hm-item__meta">
                  {USE_LABELS[land.allowedUses?.[0]] ?? "Terreno"} · ${land.priceRule?.pricePerMonth?.toLocaleString("es-PA")}/mes
                </div>
              </Card>
            ))}
            <Link to="/dashboard/lands" className="hm-add">
              <span style={{ fontSize: "1.5rem", lineHeight: 1 }}>+</span>
              Publicar otro terreno
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

export default function HomePage() {
  const { mode } = useAppMode();
  const { user } = useUser();
  const name = getDisplayName(user).split(" ")[0];

  return mode === "ofrezco" ? <OfrezcoHome /> : <BuscoHome name={name} />;
}
