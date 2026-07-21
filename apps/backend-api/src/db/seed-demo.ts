/**
 * Seed de demostración (#356): puebla la base con un grafo **coherente** de
 * datos, ligado a cuentas reales de Clerk.
 *
 * Se diferencia del seed de arranque (`seed.ts`, que genera volumen aleatorio)
 * en tres cosas:
 *
 * 1. **Actores reales.** Todo cuelga de los `clerkUserId` de las cuentas con
 *    las que se prueba la app. Las rutas filtran por `authUser.id`, que *es* el
 *    id de Clerk, así que sin esto una sesión real no ve nada suyo.
 * 2. **Coherencia.** Los tratos se declaran de arriba abajo (terreno → solicitud
 *    → contrato → pago → chat → reseña), de modo que el `ownerId` de un contrato
 *    siempre es el dueño del terreno de su solicitud y un pago siempre cuelga de
 *    una solicitud que llegó a cobrarse.
 * 3. **Cobertura de estados.** Hay al menos un caso de cada estado de solicitud,
 *    contrato, pago y visita, para poder recorrer todas las pantallas.
 *
 * La cuenta principal juega **de dueño y de arrendatario a la vez**, para que
 * las dos caras del producto tengan datos en la misma sesión.
 */
import mongoose from "mongoose";

import {
  AuditEvent, Chat, ChatMessage, Contract, Favorite, Land, Lead, Notification,
  Payment, RentalRequest, Report, Review, SavedSearch, User, Visit,
} from "./schemas";
import { makeLandPhoto } from "./seed-photo";
import { photoUrl, storeLandPhoto } from "../lib/land-photos";

// ─── Utilidades deterministas ────────────────────────────────────────────────

/** PRNG con semilla (mulberry32): el mismo seed produce siempre los mismos datos. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = makeRng(20260721);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
const between = (min: number, max: number): number => Math.floor(rng() * (max - min + 1)) + min;

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const daysAgo = (n: number): Date => new Date(NOW - n * DAY);
const daysAhead = (n: number): Date => new Date(NOW + n * DAY);
/** Fecha en formato `YYYY-MM-DD`, que es como la guardan los campos de tipo texto. */
const ymd = (d: Date): string => d.toISOString().slice(0, 10);

// ─── Actores ─────────────────────────────────────────────────────────────────

interface Actor {
  clerkUserId: string;
  email: string;
  fullName: string;
  role: "user" | "admin";
  status?: "active" | "blocked";
  verified?: boolean;
  province?: string;
  marketPreference?: "busco" | "ofrezco";
}

/**
 * Cuentas reales del entorno de desarrollo de Clerk. El id de la cuenta
 * principal se puede sustituir con `SEED_MAIN_CLERK_ID` para sembrar contra
 * otra sesión sin tocar el código.
 */
const MAIN_CLERK_ID = process.env.SEED_MAIN_CLERK_ID || "user_3G7OsFKNNfMXJ85lEbqEwqZJvQi";

const ME = MAIN_CLERK_ID;
const ALICE = "user_3G9xea7HGkdJYgT9vUOxZGXloFh";
const BOB = "user_3G9yI9HBzC4R9FCkdoK8ooKj8I8";
const ADMIN = "user_3GHcoklFmax37t0GUdAPZoqBwJx";
const ADMIN2 = "user_3CwqKl9BfXPsQ15JB60vxeCUTye";
const ERIEL = "user_3CxedFfLXcE3YV0hU5vfFHGFwx3";
const CESAR = "user_3CxePa7NncC8LqGFkkqJgQepPW2";

const REAL_ACTORS: Actor[] = [
  { clerkUserId: ME, email: "zhorychan@gmail.com", fullName: "Z H", role: "user", verified: true, province: "Panamá", marketPreference: "ofrezco" },
  { clerkUserId: ALICE, email: "terra.alice+clerk_test@example.com", fullName: "Alice Tester", role: "user", verified: true, province: "Chiriquí", marketPreference: "ofrezco" },
  { clerkUserId: BOB, email: "terra.bob+clerk_test@example.com", fullName: "Bob Tester", role: "user", province: "Coclé", marketPreference: "busco" },
  { clerkUserId: ADMIN, email: "vero.buyer+clerk_test@example.com", fullName: "Vero Compradora", role: "admin", verified: true, province: "Panamá" },
  { clerkUserId: ADMIN2, email: "c14mb10j@gmail.com", fullName: "César Bazán", role: "admin", verified: true, province: "Panamá" },
  { clerkUserId: ERIEL, email: "eriel.tensu@utp.ac.pa", fullName: "Eriel Tensu", role: "user", province: "Herrera", marketPreference: "busco" },
  { clerkUserId: CESAR, email: "cesar.bazan@utp.ac.pa", fullName: "Cesar Bazan", role: "user", province: "Veraguas", marketPreference: "ofrezco" },
];

/** Vecinos sintéticos: dan volumen al catálogo y al panel de admin. */
const SYNTHETIC_NAMES = [
  "Marisol Quintero", "Ramón Adames", "Yariela Castillo", "Efraín Batista",
  "Digna Samudio", "Ovidio Pimentel", "Nidia Bonilla", "Aristides Vega",
] as const;

const SYNTHETIC_ACTORS: Actor[] = SYNTHETIC_NAMES.map((fullName, i) => ({
  clerkUserId: `demo_user_${String(i + 1).padStart(2, "0")}`,
  email: `${fullName.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ /g, ".")}@terrashare.demo`,
  fullName,
  role: "user" as const,
  // Uno bloqueado para poder probar el filtro de estado del panel de admin.
  status: i === 7 ? ("blocked" as const) : ("active" as const),
  verified: i % 3 === 0,
  province: pick(["Bocas del Toro", "Chiriquí", "Coclé", "Colón", "Herrera", "Los Santos", "Panamá", "Veraguas"]),
  marketPreference: i % 2 === 0 ? ("ofrezco" as const) : ("busco" as const),
}));

const ACTORS = [...REAL_ACTORS, ...SYNTHETIC_ACTORS];
const SYNTHETIC_IDS = SYNTHETIC_ACTORS.filter((a) => a.status !== "blocked").map((a) => a.clerkUserId);

// ─── Catálogo de terrenos ────────────────────────────────────────────────────

const PROVINCES: Record<string, string[]> = {
  "Bocas del Toro": ["Changuinola", "Almirante", "Isla Colón"],
  "Chiriquí": ["David", "Boquete", "Bugaba", "Volcán"],
  "Coclé": ["Penonomé", "Antón", "La Pintada", "Natá"],
  "Colón": ["Colón", "Portobelo", "Chagres"],
  "Darién": ["Yaviza", "La Palma", "Metetí"],
  "Herrera": ["Chitré", "Ocú", "Pesé"],
  "Los Santos": ["Las Tablas", "Pedasí", "Tonosí", "Guararé"],
  "Panamá": ["Panamá Este", "Chepo", "San Miguelito"],
  "Panamá Oeste": ["La Chorrera", "Capira", "Arraiján"],
  "Veraguas": ["Santiago", "Soná", "Calobre"],
};

const WATER = [
  "Pozo propio con bomba eléctrica", "Río permanente en el lindero norte",
  "Quebrada natural todo el año", "Acueducto rural conectado",
  "Nacimiento de agua dentro de la finca", "Pozo perforado a 45 m",
];

const ACCESS = [
  "Carretera asfaltada hasta la entrada", "Camino de tierra transitable todo el año",
  "Calle pavimentada a 300 m de la vía principal", "Camino balastrado en buen estado",
  "Acceso directo por la vía Interamericana",
];

const FEATURES = [
  "Riego instalado", "Suelo fértil clase II", "Cercas perimetrales completas",
  "Acceso vehicular 4x4", "Electricidad trifásica disponible", "Galpón de almacenamiento",
  "Pasto mejorado establecido", "Colinda con río", "Topografía suave", "Buen drenaje natural",
  "Casa de campo habitable", "Corral de manejo",
];

type LandUse = "agricultura" | "ganaderia" | "forestal" | "acuicultura" | "mixto" | "otro";

interface LandSpec {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  province: string;
  district: string;
  area: number;
  pricePerMonth: number;
  operation: "alquiler" | "venta" | "ambas";
  salePrice?: number;
  status: "draft" | "active" | "inactive";
  allowedUses: LandUse[];
  verified?: boolean;
  photoCount: number;
  createdDaysAgo: number;
}

/**
 * Terrenos con guion: los de la cuenta principal y los de Alice sostienen los
 * tratos explícitos de más abajo, así que su estado y operación son fijos.
 */
const SCRIPTED_LANDS: LandSpec[] = [
  {
    id: "land_me_01", ownerId: ME, title: "Finca La Esperanza", province: "Panamá", district: "Chepo",
    description: "Finca de 45 hectáreas con pasto mejorado y corral de manejo. Acceso todo el año y quebrada permanente en el lindero. Ideal para ganadería de ceba o cultivo de raíces.",
    area: 45, pricePerMonth: 1250, operation: "alquiler", status: "active",
    allowedUses: ["ganaderia", "agricultura"], verified: true, photoCount: 3, createdDaysAgo: 120,
  },
  {
    id: "land_me_02", ownerId: ME, title: "Parcela Río Claro", province: "Chiriquí", district: "Bugaba",
    description: "Parcela agrícola de 12 hectáreas junto al río Claro, con riego instalado y suelo clase II. Se alquila o se vende; el dueño acepta visita previa.",
    area: 12, pricePerMonth: 780, operation: "ambas", salePrice: 96000, status: "active",
    allowedUses: ["agricultura", "mixto"], verified: true, photoCount: 3, createdDaysAgo: 210,
  },
  {
    id: "land_me_03", ownerId: ME, title: "Lote Cerro Azul", province: "Panamá", district: "Panamá Este",
    description: "Lote de 3 hectáreas en Cerro Azul, clima fresco y vista al valle. Solo venta. Tiene servidumbre inscrita y electricidad a pie de lote.",
    area: 3, pricePerMonth: 0, operation: "venta", salePrice: 145000, status: "active",
    allowedUses: ["otro"], photoCount: 2, createdDaysAgo: 60,
  },
  {
    id: "land_me_04", ownerId: ME, title: "Terreno Las Garzas (borrador)", province: "Los Santos", district: "Tonosí",
    description: "Borrador sin publicar: falta subir el plano y confirmar los linderos con el vecino del sur.",
    area: 28, pricePerMonth: 540, operation: "alquiler", status: "draft",
    allowedUses: ["ganaderia"], photoCount: 1, createdDaysAgo: 9,
  },
  {
    id: "land_me_05", ownerId: ME, title: "Finca El Guayacán", province: "Veraguas", district: "Soná",
    description: "Finca forestal de 80 hectáreas con teca de 8 años. Pausada temporalmente mientras se resuelve el permiso de aprovechamiento.",
    area: 80, pricePerMonth: 1900, operation: "alquiler", status: "inactive",
    allowedUses: ["forestal"], photoCount: 2, createdDaysAgo: 300,
  },
  {
    id: "land_me_06", ownerId: ME, title: "Estanques de Puerto Caimito", province: "Panamá Oeste", district: "La Chorrera",
    description: "Seis estanques acondicionados para acuicultura, con toma de agua y caseta de bombeo. Se alquila por temporada de cosecha.",
    area: 9, pricePerMonth: 990, operation: "alquiler", status: "active",
    allowedUses: ["acuicultura"], photoCount: 2, createdDaysAgo: 75,
  },
  {
    id: "land_alice_01", ownerId: ALICE, title: "Hacienda Los Naranjos", province: "Chiriquí", district: "Boquete",
    description: "Hacienda cafetalera de 22 hectáreas a 1.200 msnm, con beneficio húmedo y casa de trabajadores. Contrato mínimo de 12 meses.",
    area: 22, pricePerMonth: 2100, operation: "alquiler", status: "active",
    allowedUses: ["agricultura", "mixto"], verified: true, photoCount: 3, createdDaysAgo: 240,
  },
  {
    id: "land_alice_02", ownerId: ALICE, title: "Potrero San Antonio", province: "Coclé", district: "Penonomé",
    description: "Potrero de 35 hectáreas con pasto brachiaria establecido, dos abrevaderos y cerca eléctrica perimetral.",
    area: 35, pricePerMonth: 1150, operation: "alquiler", status: "active",
    allowedUses: ["ganaderia"], verified: true, photoCount: 3, createdDaysAgo: 400,
  },
  {
    id: "land_alice_03", ownerId: ALICE, title: "Finca Alto Boquete", province: "Chiriquí", district: "Boquete",
    description: "Terreno de 7 hectáreas para hortalizas de altura, con invernadero de 400 m² y sistema de goteo.",
    area: 7, pricePerMonth: 1400, operation: "alquiler", status: "active",
    allowedUses: ["agricultura"], photoCount: 2, createdDaysAgo: 90,
  },
  {
    id: "land_alice_04", ownerId: ALICE, title: "Lote Volcán Sur", province: "Chiriquí", district: "Volcán",
    description: "Lote de 5 hectáreas con bosque secundario y quebrada. El dueño prioriza proyectos de conservación.",
    area: 5, pricePerMonth: 620, operation: "alquiler", status: "active",
    allowedUses: ["forestal", "otro"], photoCount: 2, createdDaysAgo: 45,
  },
  {
    id: "land_alice_05", ownerId: ALICE, title: "Finca Las Lajas", province: "Chiriquí", district: "David",
    description: "Finca mixta de 60 hectáreas cerca de David, con acceso asfaltado y galpón de 600 m². Se vende o se alquila a largo plazo.",
    area: 60, pricePerMonth: 2600, operation: "ambas", salePrice: 420000, status: "active",
    allowedUses: ["mixto", "ganaderia"], verified: true, photoCount: 3, createdDaysAgo: 150,
  },
  {
    id: "land_bob_01", ownerId: BOB, title: "Quinta El Higo", province: "Coclé", district: "Antón",
    description: "Quinta de 4 hectáreas con frutales en producción y casa de dos recámaras. Ideal para agroturismo.",
    area: 4, pricePerMonth: 700, operation: "alquiler", status: "active",
    allowedUses: ["agricultura", "otro"], photoCount: 2, createdDaysAgo: 30,
  },
];

const TITLE_PREFIXES = [
  "Finca", "Parcela", "Hacienda", "Potrero", "Predio", "Lote", "Estancia", "Granja", "Quinta", "Campo",
];
const TITLE_SUFFIXES = [
  "San Isidro", "La Palmera", "El Roble", "Santa Rita", "Los Cedros", "El Mirador",
  "La Bonita", "Río Grande", "El Progreso", "Las Mercedes", "El Nance", "La Trinidad",
  "Cañaveral", "El Tamarindo", "La Providencia", "Los Higuerones", "El Espino", "La Chorrerita",
];

/** Terrenos de relleno de los vecinos sintéticos, para que el catálogo respire. */
function generateFillerLands(count: number): LandSpec[] {
  const provinceNames = Object.keys(PROVINCES);
  const lands: LandSpec[] = [];

  for (let i = 0; i < count; i++) {
    // Se recorren las provincias por turnos para que el filtro por provincia
    // tenga resultados en todas, en vez de concentrarse por azar en dos o tres.
    const province = provinceNames[i % provinceNames.length];
    const district = pick(PROVINCES[province]);
    const area = between(4, 260);
    const roll = rng();
    const operation = roll < 0.6 ? "alquiler" : roll < 0.85 ? "venta" : "ambas";
    const uses = [pick(["agricultura", "ganaderia", "forestal", "acuicultura", "mixto"] as const)];
    if (rng() < 0.35) {
      const extra = pick(["agricultura", "ganaderia", "forestal", "mixto"] as const);
      if (!uses.includes(extra)) uses.push(extra);
    }

    lands.push({
      id: `land_demo_${String(i + 1).padStart(3, "0")}`,
      ownerId: pick(SYNTHETIC_IDS),
      title: `${pick(TITLE_PREFIXES)} ${pick(TITLE_SUFFIXES)}`,
      description: `Terreno de ${area} hectáreas en ${district}, ${province}. ${pick(WATER)}. ${pick(ACCESS)}. Apto para ${uses.join(" y ")}.`,
      province,
      district,
      area,
      pricePerMonth: operation === "venta" ? 0 : between(280, 3200),
      operation,
      salePrice: operation === "venta" || operation === "ambas" ? area * between(1200, 4000) : undefined,
      status: rng() < 0.88 ? "active" : pick(["draft", "inactive"] as const),
      allowedUses: uses as LandUse[],
      verified: rng() < 0.3,
      photoCount: between(1, 3),
      createdDaysAgo: between(1, 330),
    });
  }
  return lands;
}

function pickFeatures(): string[] {
  const pool = [...FEATURES];
  const picked: string[] = [];
  const n = between(3, 5);
  for (let i = 0; i < n && pool.length > 0; i++) {
    picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return picked;
}

// ─── Tratos con guion ────────────────────────────────────────────────────────

type RequestStatus = "draft" | "pending_owner" | "approved" | "rejected" | "cancelled" | "pending_payment" | "paid";
type ContractStatus = "draft" | "active" | "completed" | "cancelled";
type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "cancelled" | "refunded" | "partially_refunded";

interface DealSpec {
  key: string;
  landId: string;
  tenantId: string;
  operation?: "alquiler" | "venta";
  status: RequestStatus;
  createdDaysAgo: number;
  notes?: string;
  offerAmount?: number;
  months?: number;
  /** Días desde hoy hasta el inicio del periodo; negativo = ya empezó. */
  startsInDays?: number;
  contract?: { status: ContractStatus; signed?: boolean };
  payment?: { status: PaymentStatus; refundedAmount?: number };
  /** Mensajes del chat: `me` = el solicitante, `them` = el dueño. */
  chat?: { from: "tenant" | "owner"; text: string }[];
  /** Reseñas cruzadas tras un contrato completado. */
  reviews?: { from: "tenant" | "owner"; rating: number; comment: string }[];
}

/**
 * Guion completo. Cubre los siete estados de solicitud, los cuatro de contrato
 * y los siete de pago, repartidos entre las dos caras de la cuenta principal
 * (dueña de `land_me_*`, solicitante en los de Alice).
 */
const DEALS: DealSpec[] = [
  // ── La cuenta principal como ARRENDATARIA ──────────────────────────────────
  {
    key: "d01", landId: "land_alice_01", tenantId: ME, status: "paid", createdDaysAgo: 95,
    months: 12, startsInDays: -60,
    notes: "Quiero retomar la producción de café de altura. Tengo experiencia con beneficio húmedo.",
    contract: { status: "active", signed: true },
    payment: { status: "paid" },
    chat: [
      { from: "tenant", text: "Hola Alice, me interesa la hacienda. ¿El beneficio húmedo está operativo?" },
      { from: "owner", text: "¡Hola! Sí, lo usamos la cosecha pasada. Le cambiamos la bomba en marzo." },
      { from: "tenant", text: "Perfecto. ¿Podría visitarla un sábado por la mañana?" },
      { from: "owner", text: "Claro, agenda la visita por la plataforma y te confirmo." },
      { from: "tenant", text: "Listo, ya la agendé. Nos vemos el sábado." },
      { from: "owner", text: "Confirmada. Te espero en la entrada principal a las 9." },
    ],
  },
  {
    key: "d02", landId: "land_alice_02", tenantId: ME, status: "paid", createdDaysAgo: 400,
    months: 10, startsInDays: -360,
    notes: "Engorde de 40 cabezas. Ya trabajé potreros de este tamaño en Coclé.",
    contract: { status: "completed", signed: true },
    payment: { status: "paid" },
    chat: [
      { from: "tenant", text: "Buenas, ¿el potrero aguanta 40 cabezas en verano?" },
      { from: "owner", text: "Sí, con los dos abrevaderos no hemos tenido problema." },
      { from: "tenant", text: "Cerramos entonces. Gracias por la disposición." },
    ],
    reviews: [
      { from: "tenant", rating: 5, comment: "Alice fue clarísima con los linderos y el estado de las cercas. El potrero estaba tal cual lo describió. Repetiría sin dudarlo." },
      { from: "owner", rating: 5, comment: "Cuidó el pasto y entregó el terreno mejor de lo que lo recibió. Pagos siempre puntuales." },
    ],
  },
  {
    key: "d03", landId: "land_alice_03", tenantId: ME, status: "pending_owner", createdDaysAgo: 3,
    months: 8, startsInDays: 25,
    notes: "Quiero producir tomate bajo invernadero. ¿El goteo cubre las 7 hectáreas o solo el invernadero?",
    chat: [
      { from: "tenant", text: "Hola, envié la solicitud. ¿El goteo cubre toda la finca?" },
      { from: "owner", text: "Solo el invernadero por ahora, pero la tubería madre ya está puesta." },
    ],
  },
  {
    key: "d04", landId: "land_alice_04", tenantId: ME, status: "rejected", createdDaysAgo: 22,
    months: 6, startsInDays: 10,
    notes: "Proyecto de vivero forestal con especies nativas.",
    chat: [
      { from: "tenant", text: "¿Aceptaría un vivero forestal en la parte baja?" },
      { from: "owner", text: "Lo siento, ya me comprometí con un proyecto de conservación. Gracias igual." },
    ],
  },
  {
    key: "d05", landId: "land_alice_05", tenantId: ME, operation: "venta", status: "pending_owner",
    createdDaysAgo: 6, offerAmount: 385000,
    notes: "Oferta en firme, pago de contado contra escritura. Financiamiento ya aprobado.",
  },
  {
    key: "d06", landId: "land_bob_01", tenantId: ME, status: "cancelled", createdDaysAgo: 40,
    months: 4, startsInDays: 15,
    notes: "Cancelé porque encontré una finca más cerca de la ciudad.",
    contract: { status: "cancelled" },
    payment: { status: "cancelled" },
  },
  {
    key: "d07", landId: "land_demo_004", tenantId: ME, status: "pending_payment", createdDaysAgo: 5,
    months: 6, startsInDays: 20,
    notes: "Solicitud aprobada, falta completar el pago del primer mes.",
    contract: { status: "draft" },
    payment: { status: "pending" },
  },
  {
    key: "d08", landId: "land_demo_009", tenantId: ME, status: "draft", createdDaysAgo: 1,
    months: 12, startsInDays: 30,
    notes: "Borrador: falta confirmar el periodo con el socio.",
  },

  // ── La cuenta principal como DUEÑA ─────────────────────────────────────────
  {
    key: "d10", landId: "land_me_01", tenantId: BOB, status: "paid", createdDaysAgo: 70,
    months: 12, startsInDays: -45,
    notes: "Ganadería de ceba, 60 cabezas. Referencias disponibles.",
    contract: { status: "active", signed: true },
    payment: { status: "paid" },
    chat: [
      { from: "tenant", text: "Buenas tardes, ¿el corral de manejo incluye báscula?" },
      { from: "owner", text: "Sí, báscula de 2.000 kg recién calibrada." },
      { from: "tenant", text: "Excelente. Procedo con la solicitud." },
      { from: "owner", text: "Perfecto, la apruebo hoy mismo." },
      { from: "tenant", text: "Ya quedó el pago. Gracias por la agilidad." },
    ],
  },
  {
    key: "d11", landId: "land_me_01", tenantId: ERIEL, status: "pending_owner", createdDaysAgo: 2,
    months: 9, startsInDays: 40,
    notes: "Interesado en la parte alta para siembra de yuca. ¿Se puede subdividir el alquiler?",
    chat: [
      { from: "tenant", text: "¿Existe la posibilidad de alquilar solo 15 hectáreas?" },
    ],
  },
  {
    key: "d12", landId: "land_me_02", tenantId: BOB, status: "paid", createdDaysAgo: 380,
    months: 9, startsInDays: -340,
    notes: "Ciclo de sandía y melón para exportación.",
    contract: { status: "completed", signed: true },
    payment: { status: "partially_refunded", refundedAmount: 240 },
    chat: [
      { from: "tenant", text: "El riego funcionó perfecto toda la temporada." },
      { from: "owner", text: "Me alegra. Avísame si quieres repetir el próximo ciclo." },
    ],
    reviews: [
      { from: "tenant", rating: 5, comment: "Terreno impecable y dueño muy atento. El riego instalado nos ahorró semanas de trabajo." },
      { from: "owner", rating: 4, comment: "Buen arrendatario, aunque la entrega se retrasó una semana por la cosecha." },
    ],
  },
  {
    key: "d13", landId: "land_me_02", tenantId: CESAR, operation: "venta", status: "approved",
    createdDaysAgo: 12, offerAmount: 92000,
    notes: "Oferta por debajo del precio de lista, pago 50% contado y 50% a 6 meses.",
    chat: [
      { from: "tenant", text: "¿Consideraría el 50/50 a seis meses?" },
      { from: "owner", text: "Lo estoy evaluando con mi abogado, te confirmo esta semana." },
    ],
  },
  {
    key: "d14", landId: "land_me_06", tenantId: ERIEL, status: "pending_payment", createdDaysAgo: 8,
    months: 5, startsInDays: 12,
    notes: "Cultivo de tilapia, ciclo corto.",
    contract: { status: "draft" },
    payment: { status: "processing" },
  },
  {
    key: "d15", landId: "land_me_06", tenantId: "demo_user_02", status: "rejected", createdDaysAgo: 30,
    months: 3, startsInDays: 5,
    notes: "Necesito los estanques solo tres meses.",
  },
  {
    key: "d16", landId: "land_me_01", tenantId: "demo_user_03", status: "cancelled", createdDaysAgo: 55,
    months: 6, startsInDays: 20,
    notes: "Retiro la solicitud, cambié de zona.",
    payment: { status: "failed" },
  },
  {
    key: "d17", landId: "land_me_05", tenantId: "demo_user_01", status: "paid", createdDaysAgo: 260,
    months: 8, startsInDays: -240,
    notes: "Aprovechamiento forestal de teca.",
    contract: { status: "completed", signed: true },
    payment: { status: "refunded", refundedAmount: 1900 },
    reviews: [
      { from: "tenant", rating: 4, comment: "El permiso se atrasó y hubo que reembolsar, pero la comunicación fue honesta en todo momento." },
    ],
  },
];

// ─── Construcción del grafo ──────────────────────────────────────────────────

interface Built {
  users: Record<string, unknown>[];
  lands: Record<string, unknown>[];
  requests: Record<string, unknown>[];
  contracts: Record<string, unknown>[];
  payments: Record<string, unknown>[];
  chats: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  favorites: Record<string, unknown>[];
  reports: Record<string, unknown>[];
  reviews: Record<string, unknown>[];
  savedSearches: Record<string, unknown>[];
  visits: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  auditEvents: Record<string, unknown>[];
  leads: Record<string, unknown>[];
  /** Terrenos que necesitan foto, para subirlas a GridFS después de insertar. */
  photoPlan: { landId: string; count: number; seed: number }[];
}

const PLATFORM_FEE_RATE = 0.05;

export function buildDemoData(): Built {
  const landSpecs = [...SCRIPTED_LANDS, ...generateFillerLands(24)];
  const landById = new Map(landSpecs.map((l) => [l.id, l]));

  const users = ACTORS.map((a, i) => ({
    clerkUserId: a.clerkUserId,
    email: a.email,
    role: a.role,
    status: a.status ?? "active",
    profile: {
      fullName: a.fullName,
      phone: `+507 6${between(100, 999)}-${between(1000, 9999)}`,
      province: a.province,
      marketPreference: a.marketPreference,
    },
    verified: a.verified ?? false,
    deletedAt: null,
    createdAt: daysAgo(360 - i * 8),
    updatedAt: daysAgo(between(1, 20)),
  }));

  const photoPlan: Built["photoPlan"] = [];
  const lands = landSpecs.map((spec, i) => {
    photoPlan.push({ landId: spec.id, count: spec.photoCount, seed: i + 1 });
    return {
      id: spec.id,
      ownerId: spec.ownerId,
      title: spec.title,
      description: spec.description,
      area: spec.area,
      allowedUses: spec.allowedUses,
      photos: [] as string[],
      location: {
        province: spec.province,
        district: spec.district,
        // Se omite a propósito: la lista por provincia son DISTRITOS, y
        // reutilizarla aquí ponía cosas como «corregimiento: David» dentro de
        // Boquete. Mejor no mostrar el dato que mostrarlo mal.
        corregimiento: undefined,
        lat: 7.5 + rng() * 1.9,
        lng: -82.5 + rng() * 4.5,
      },
      availability: { availableFrom: ymd(daysAgo(between(0, 30))) },
      priceRule: { currency: "USD", pricePerMonth: spec.pricePerMonth },
      status: spec.status,
      operation: spec.operation,
      salePrice: spec.salePrice,
      water: pick(WATER),
      access: pick(ACCESS),
      features: pickFeatures(),
      verified: spec.verified ?? false,
      deletedAt: null,
      createdAt: daysAgo(spec.createdDaysAgo),
      updatedAt: daysAgo(Math.min(spec.createdDaysAgo, between(1, 25))),
    };
  });

  const requests: Record<string, unknown>[] = [];
  const contracts: Record<string, unknown>[] = [];
  const payments: Record<string, unknown>[] = [];
  const chats: Record<string, unknown>[] = [];
  const messages: Record<string, unknown>[] = [];
  const reviews: Record<string, unknown>[] = [];
  const auditEvents: Record<string, unknown>[] = [];
  const notifications: Record<string, unknown>[] = [];

  let auditSeq = 0;
  const audit = (
    actorId: string,
    entity: string,
    action: string,
    entityId: string,
    createdAt: Date,
    metadata?: Record<string, unknown>,
  ) => {
    auditSeq += 1;
    auditEvents.push({
      id: `audit_${String(auditSeq).padStart(5, "0")}`,
      actorId,
      actorRole: ACTORS.find((a) => a.clerkUserId === actorId)?.role ?? "user",
      entity,
      action,
      entityId,
      metadata: metadata ?? {},
      createdAt,
      updatedAt: createdAt,
    });
  };

  let notifSeq = 0;
  const notify = (userId: string, type: string, title: string, body: string, createdAt: Date, read = false) => {
    notifSeq += 1;
    notifications.push({
      id: `notif_${String(notifSeq).padStart(4, "0")}`,
      userId,
      type,
      title,
      body,
      read,
      readAt: read ? createdAt.toISOString() : undefined,
      createdAt,
    });
  };

  for (const deal of DEALS) {
    const land = landById.get(deal.landId);
    if (!land) throw new Error(`Trato ${deal.key}: el terreno ${deal.landId} no existe`);
    const ownerId = land.ownerId;
    if (ownerId === deal.tenantId) throw new Error(`Trato ${deal.key}: el dueño no puede ser el solicitante`);

    const createdAt = daysAgo(deal.createdDaysAgo);
    const updatedAt = daysAgo(Math.max(0, deal.createdDaysAgo - between(1, 3)));
    const operation = deal.operation ?? "alquiler";
    const requestId = `rr_${deal.key}`;

    const startsAt = daysAhead(deal.startsInDays ?? 30);
    const endsAt = new Date(startsAt.getTime() + (deal.months ?? 12) * 30 * DAY);

    requests.push({
      id: requestId,
      landId: deal.landId,
      tenantId: deal.tenantId,
      operation,
      ...(operation === "alquiler"
        ? {
            period: { startDate: ymd(startsAt), endDate: ymd(endsAt) },
            intendedUse: land.allowedUses[0],
          }
        : { offerAmount: deal.offerAmount }),
      notes: deal.notes,
      status: deal.status,
      createdAt,
      updatedAt,
    });
    audit(deal.tenantId, "rental_request", "created", requestId, createdAt);
    if (deal.status === "approved" || deal.status === "paid" || deal.status === "pending_payment") {
      audit(ownerId, "rental_request", "approved", requestId, updatedAt);
    }
    if (deal.status === "rejected") {
      audit(ownerId, "rental_request", "rejected", requestId, updatedAt);
      notify(deal.tenantId, "request_rejected", "Solicitud rechazada",
        `El dueño de "${land.title}" no pudo aceptar tu solicitud.`, updatedAt, deal.createdDaysAgo > 25);
    }
    if (deal.status === "pending_owner") {
      notify(ownerId, "request_received", "Nueva solicitud recibida",
        `Recibiste una solicitud para "${land.title}".`, createdAt);
    }

    // ── Contrato ──
    let contractId: string | undefined;
    if (deal.contract) {
      contractId = `contract_${deal.key}`;
      const signedAt = deal.contract.signed ? ymd(new Date(createdAt.getTime() + 2 * DAY)) : undefined;
      contracts.push({
        id: contractId,
        rentalRequestId: requestId,
        ownerId,
        tenantId: deal.tenantId,
        terms: {
          summary: operation === "venta"
            ? `Compraventa de "${land.title}" por USD ${deal.offerAmount?.toLocaleString("es-PA")}.`
            : `Arrendamiento de "${land.title}" por ${deal.months ?? 12} meses a USD ${land.pricePerMonth}/mes, uso ${land.allowedUses[0]}.`,
          signedAt,
          startsAt: ymd(startsAt),
          endsAt: ymd(endsAt),
        },
        status: deal.contract.status,
        createdAt: new Date(createdAt.getTime() + DAY),
        updatedAt,
      });
      audit(ownerId, "contract", "created", contractId, new Date(createdAt.getTime() + DAY));
      if (signedAt) audit(deal.tenantId, "contract", "signed", contractId, new Date(createdAt.getTime() + 2 * DAY));
      if (deal.contract.status === "completed") {
        audit(ownerId, "contract", "completed", contractId, updatedAt);
        notify(deal.tenantId, "contract_completed", "Contrato completado",
          `El contrato de "${land.title}" se marcó como completado. Ya puedes dejar una reseña.`, updatedAt, true);
      }
      if (deal.contract.status === "cancelled") {
        audit(deal.tenantId, "contract", "cancelled", contractId, updatedAt);
      }
    }

    // ── Pago ──
    if (deal.payment) {
      const amount = operation === "venta"
        ? (deal.offerAmount ?? 0)
        : land.pricePerMonth;
      const platformFeeAmount = Math.round(amount * PLATFORM_FEE_RATE * 100) / 100;
      const refundedAmount = deal.payment.refundedAmount ?? 0;
      const paidAt = new Date(createdAt.getTime() + 3 * DAY);
      payments.push({
        id: `pay_${deal.key}`,
        rentalRequestId: requestId,
        contractId,
        amount,
        currency: "USD",
        platformFeeAmount,
        netAmount: Math.round((amount - platformFeeAmount) * 100) / 100,
        settlementCurrency: "USD",
        status: deal.payment.status,
        refundedAmount,
        refunds: refundedAmount > 0
          ? [{
              id: `re_${deal.key}`,
              amount: refundedAmount,
              reason: deal.payment.status === "refunded"
                ? "Contrato anulado por permiso denegado"
                : "Ajuste parcial acordado con el arrendatario",
              stripeRefundId: `re_demo_${deal.key}`,
              createdAt: new Date(paidAt.getTime() + 20 * DAY),
            }]
          : [],
        stripeSessionId: `cs_demo_${deal.key}`,
        stripePaymentIntentId: `pi_demo_${deal.key}`,
        checkoutUrl: `https://checkout.stripe.com/c/pay/cs_demo_${deal.key}`,
        createdAt: paidAt,
        updatedAt: refundedAmount > 0 ? new Date(paidAt.getTime() + 20 * DAY) : paidAt,
      });
      if (deal.payment.status === "paid" || deal.payment.status === "partially_refunded" || deal.payment.status === "refunded") {
        audit(deal.tenantId, "payment", "paid", `pay_${deal.key}`, paidAt, { amount, currency: "USD" });
        notify(ownerId, "payment_received", "Pago recibido",
          `Se acreditó un pago de USD ${amount.toLocaleString("es-PA")} por "${land.title}".`, paidAt, true);
      }
      if (refundedAmount > 0) {
        audit(ADMIN, "payment", "refunded", `pay_${deal.key}`, new Date(paidAt.getTime() + 20 * DAY), { refundedAmount });
      }
    }

    // ── Chat ──
    if (deal.chat && deal.chat.length > 0) {
      const chatId = `chat_${deal.key}`;
      const chatCreatedAt = new Date(createdAt.getTime() - DAY);
      chats.push({
        id: chatId,
        landId: deal.landId,
        rentalRequestId: requestId,
        participants: [
          { userId: ownerId, role: "owner" },
          { userId: deal.tenantId, role: "tenant" },
        ],
        status: "active",
        createdAt: chatCreatedAt,
        updatedAt: new Date(chatCreatedAt.getTime() + deal.chat.length * 3600_000),
      });
      deal.chat.forEach((m, i) => {
        messages.push({
          id: `msg_${deal.key}_${String(i + 1).padStart(2, "0")}`,
          chatId,
          senderId: m.from === "owner" ? ownerId : deal.tenantId,
          text: m.text,
          viaAssistant: false,
          createdAt: new Date(chatCreatedAt.getTime() + (i + 1) * 3600_000),
        });
      });
      // El último mensaje del interlocutor genera una notificación sin leer.
      const last = deal.chat[deal.chat.length - 1];
      if (last.from === "tenant") {
        notify(ownerId, "chat_message", "Mensaje nuevo",
          `Tienes un mensaje sobre "${land.title}".`, new Date(chatCreatedAt.getTime() + deal.chat.length * 3600_000),
          deal.createdDaysAgo > 20);
      }
    }

    // ── Reseñas ──
    if (deal.reviews && contractId) {
      for (const r of deal.reviews) {
        const senderId = r.from === "owner" ? ownerId : deal.tenantId;
        const receiverId = r.from === "owner" ? deal.tenantId : ownerId;
        const at = new Date(NOW - (deal.createdDaysAgo - (deal.months ?? 12) * 30 + 5) * DAY);
        reviews.push({
          id: `review_${deal.key}_${r.from}`,
          contractId,
          senderId,
          receiverId,
          rating: r.rating,
          comment: r.comment,
          createdAt: at > new Date(NOW) ? daysAgo(5) : at,
          updatedAt: at > new Date(NOW) ? daysAgo(5) : at,
        });
        notify(receiverId, "review_received", "Nueva reseña",
          `Recibiste una reseña de ${r.rating} estrellas.`, daysAgo(5), true);
      }
    }
  }

  // ── Favoritos: la cuenta principal guarda terrenos ajenos ──────────────────
  const favoriteLandIds = ["land_alice_01", "land_alice_03", "land_alice_05", "land_bob_01", "land_demo_002", "land_demo_007"];
  const favorites = favoriteLandIds.map((landId, i) => ({
    userId: ME,
    landId,
    createdAt: daysAgo(3 + i * 4),
    updatedAt: daysAgo(3 + i * 4),
  }));
  // Y otros usuarios guardan los de la cuenta principal (así el dueño ve interés).
  favorites.push(
    { userId: BOB, landId: "land_me_01", createdAt: daysAgo(12), updatedAt: daysAgo(12) },
    { userId: ERIEL, landId: "land_me_01", createdAt: daysAgo(6), updatedAt: daysAgo(6) },
    { userId: CESAR, landId: "land_me_02", createdAt: daysAgo(9), updatedAt: daysAgo(9) },
    { userId: BOB, landId: "land_me_03", createdAt: daysAgo(2), updatedAt: daysAgo(2) },
  );

  // ── Búsquedas guardadas de la cuenta principal ─────────────────────────────
  const savedSearches = [
    {
      id: "search_001", userId: ME, name: "Ganadería en Coclé hasta $1.500",
      filters: { province: "Coclé", use: "ganaderia", maxPrice: 1500, operation: "alquiler" },
      createdAt: daysAgo(28), updatedAt: daysAgo(28),
    },
    {
      id: "search_002", userId: ME, name: "Café en Boquete",
      filters: { province: "Chiriquí", district: "Boquete", use: "agricultura" },
      createdAt: daysAgo(14), updatedAt: daysAgo(14),
    },
    {
      id: "search_003", userId: ME, name: "Lotes en venta bajo $150.000",
      filters: { operation: "venta", maxSalePrice: 150000 },
      createdAt: daysAgo(4), updatedAt: daysAgo(4),
    },
    {
      id: "search_004", userId: BOB, name: "Acuicultura cerca de la capital",
      filters: { province: "Panamá Oeste", use: "acuicultura" },
      createdAt: daysAgo(11), updatedAt: daysAgo(11),
    },
  ];
  notify(ME, "saved_search_match", "Nuevo terreno para «Café en Boquete»",
    "Se publicó «Finca Alto Boquete», que coincide con tu búsqueda guardada.", daysAgo(2));

  // ── Visitas: los cuatro estados, en las dos caras ──────────────────────────
  const visits = [
    // La cuenta principal como solicitante.
    {
      id: "visit_001", landId: "land_alice_01", tenantId: ME, ownerId: ALICE,
      proposedDate: ymd(daysAhead(4)), proposedTime: "09:00",
      message: "Quisiera ver el beneficio húmedo y las cercas del lindero norte.",
      status: "confirmed", responseMessage: "Confirmada. Te espero en la entrada principal.",
      createdAt: daysAgo(6), updatedAt: daysAgo(5),
    },
    {
      id: "visit_002", landId: "land_alice_03", tenantId: ME, ownerId: ALICE,
      proposedDate: ymd(daysAhead(9)), proposedTime: "14:30",
      message: "Me interesa revisar el invernadero y el sistema de goteo.",
      status: "pending", createdAt: daysAgo(2), updatedAt: daysAgo(2),
    },
    {
      id: "visit_003", landId: "land_alice_04", tenantId: ME, ownerId: ALICE,
      proposedDate: ymd(daysAhead(12)), proposedTime: "10:00",
      message: "¿Podríamos vernos el fin de semana?",
      status: "rescheduled", responseMessage: "El sábado no puedo; te propongo el domingo a las 10.",
      createdAt: daysAgo(8), updatedAt: daysAgo(7),
    },
    {
      id: "visit_004", landId: "land_demo_004", tenantId: ME, ownerId: landById.get("land_demo_004")!.ownerId,
      proposedDate: ymd(daysAhead(3)), proposedTime: "16:00",
      message: "Visita rápida para ver el acceso.",
      status: "rejected", responseMessage: "Esta semana estoy fuera del país, disculpa.",
      createdAt: daysAgo(10), updatedAt: daysAgo(9),
    },
    // La cuenta principal como dueña que recibe solicitudes de visita.
    {
      id: "visit_005", landId: "land_me_01", tenantId: BOB, ownerId: ME,
      proposedDate: ymd(daysAhead(5)), proposedTime: "08:30",
      message: "Quiero revisar el corral de manejo antes de traer el ganado.",
      status: "pending", createdAt: daysAgo(1), updatedAt: daysAgo(1),
    },
    {
      id: "visit_006", landId: "land_me_02", tenantId: ERIEL, ownerId: ME,
      proposedDate: ymd(daysAhead(7)), proposedTime: "11:00",
      message: "Interesado en ver el riego instalado.",
      status: "confirmed", responseMessage: "Perfecto, nos vemos en la entrada del río.",
      createdAt: daysAgo(4), updatedAt: daysAgo(3),
    },
    {
      id: "visit_007", landId: "land_me_03", tenantId: CESAR, ownerId: ME,
      proposedDate: ymd(daysAhead(2)), proposedTime: "15:00",
      message: "¿Se puede ver el lote esta semana?",
      status: "rescheduled", responseMessage: "Te propongo el jueves a la misma hora.",
      createdAt: daysAgo(5), updatedAt: daysAgo(4),
    },
    {
      id: "visit_008", landId: "land_me_06", tenantId: "demo_user_02", ownerId: ME,
      proposedDate: ymd(daysAhead(1)), proposedTime: "07:00",
      message: "Visita para evaluar los estanques.",
      status: "rejected", responseMessage: "Los estanques están en mantenimiento hasta fin de mes.",
      createdAt: daysAgo(14), updatedAt: daysAgo(13),
    },
  ];
  notify(ME, "visit_request", "Nueva solicitud de visita",
    `Bob Tester quiere visitar "Finca La Esperanza" el ${ymd(daysAhead(5))} a las 08:30.`, daysAgo(1));
  notify(ME, "visit_update", "Visita confirmada",
    `Alice Tester confirmó tu visita a "Hacienda Los Naranjos".`, daysAgo(5), true);

  // ── Reportes para moderación ──────────────────────────────────────────────
  const reports = [
    {
      id: "report_001", targetType: "land", targetId: "land_demo_011", reason: "informacion_falsa",
      description: "Las fotos no corresponden al terreno; el área declarada no coincide con el plano público.",
      reporterId: ME, status: "open",
      createdAt: daysAgo(2), updatedAt: daysAgo(2),
    },
    {
      id: "report_002", targetType: "land", targetId: "land_demo_017", reason: "fraude",
      description: "El anunciante pide un adelanto por transferencia fuera de la plataforma.",
      reporterId: BOB, status: "open",
      createdAt: daysAgo(4), updatedAt: daysAgo(4),
    },
    {
      id: "report_003", targetType: "user", targetId: "demo_user_08", reason: "spam",
      description: "Envía el mismo mensaje promocional a todos los chats.",
      reporterId: ERIEL, status: "reviewing",
      createdAt: daysAgo(9), updatedAt: daysAgo(6),
    },
    {
      id: "report_004", targetType: "land", targetId: "land_me_06", reason: "otro",
      description: "El precio parece muy bajo para la zona, ¿se puede verificar?",
      reporterId: CESAR, status: "dismissed",
      resolutionNote: "Revisado: el precio es correcto, corresponde a alquiler por temporada.",
      resolvedBy: ADMIN,
      createdAt: daysAgo(20), updatedAt: daysAgo(18),
    },
    {
      id: "report_005", targetType: "chat", targetId: "chat_d04", reason: "contenido_inapropiado",
      description: "Lenguaje ofensivo en la conversación.",
      reporterId: ME, status: "resolved",
      resolutionNote: "Se contactó al usuario y se le dio una advertencia formal.",
      resolvedBy: ADMIN2,
      createdAt: daysAgo(30), updatedAt: daysAgo(27),
    },
    {
      id: "report_006", targetType: "land", targetId: "land_demo_003", reason: "spam",
      description: "Terreno duplicado, ya está publicado por otro usuario.",
      reporterId: "demo_user_04", status: "open",
      createdAt: daysAgo(1), updatedAt: daysAgo(1),
    },
  ];
  audit(ADMIN, "report", "status_changed", "report_004", daysAgo(18), { to: "dismissed" });
  audit(ADMIN2, "report", "status_changed", "report_005", daysAgo(27), { to: "resolved" });

  // ── Leads de la landing ───────────────────────────────────────────────────
  const leads = Array.from({ length: 40 }, (_, i) => ({
    id: `lead_${String(i + 1).padStart(4, "0")}`,
    email: `interesado${i + 1}@correo.demo`,
    source: pick(["landing", "landing", "app-web", "admin-dashboard"] as const),
    createdAt: daysAgo(between(0, 90)),
    updatedAt: daysAgo(between(0, 90)),
  }));

  // Sesiones de la cuenta principal en la auditoría, para que el panel tenga
  // eventos recientes de tipo `auth`.
  for (let i = 0; i < 8; i++) {
    audit(ME, "auth", "created", ME, daysAgo(i * 3 + 1), { event: "login" });
  }

  return {
    users, lands, requests, contracts, payments, chats, messages, favorites,
    reports, reviews, savedSearches, visits, notifications, auditEvents, leads,
    photoPlan,
  };
}

// ─── Escritura ───────────────────────────────────────────────────────────────

/**
 * Colecciones fantasma en camelCase que quedaron de la etapa del driver nativo
 * (antes de #135). Mongoose lee de las minúsculas, así que estos documentos son
 * invisibles para la app y solo confunden al inspeccionar la base.
 */
const GHOST_COLLECTIONS = ["rentalRequests", "chatMessages", "auditEvents", "webhookEvents", "idempotencyKeys", "backupRecords", "savedSearches"];

async function dropGhostCollections(): Promise<string[]> {
  const db = mongoose.connection.db;
  if (!db) return [];
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  const dropped: string[] = [];
  for (const name of GHOST_COLLECTIONS) {
    if (existing.includes(name)) {
      await db.collection(name).drop();
      dropped.push(name);
    }
  }
  return dropped;
}

/** Sube las fotos sintéticas a GridFS y enlaza sus URLs en cada terreno. */
async function seedPhotos(plan: Built["photoPlan"]): Promise<number> {
  let total = 0;
  for (const item of plan) {
    const urls: string[] = [];
    for (let i = 0; i < item.count; i++) {
      const fileId = await storeLandPhoto({
        landId: item.landId,
        buffer: makeLandPhoto(item.seed * 10 + i),
        contentType: "image/png",
        filename: `${item.landId}-${i + 1}.png`,
      });
      urls.push(photoUrl(item.landId, fileId));
      total++;
    }
    await Land.collection.updateOne({ id: item.landId }, { $set: { photos: urls } });
  }
  return total;
}

export interface SeedDemoResult {
  counts: Record<string, number>;
  droppedGhostCollections: string[];
  photos: number;
}

/**
 * Borra y repuebla las colecciones de datos de negocio. No toca `_migrations`
 * (el registro de migraciones aplicadas) para no forzar su reejecución.
 */
export async function seedDemoDatabase(): Promise<SeedDemoResult> {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("[seed-demo] No hay conexión a MongoDB");
  }

  const data = buildDemoData();
  const droppedGhostCollections = await dropGhostCollections();

  // GridFS se limpia a mano: las fotos viejas apuntan a terrenos que ya no existen.
  const db = mongoose.connection.db!;
  const existing = (await db.listCollections().toArray()).map((c) => c.name);
  for (const name of ["landPhotos.files", "landPhotos.chunks"]) {
    if (existing.includes(name)) await db.collection(name).deleteMany({});
  }

  // `Model.collection` escribe con el driver nativo: conserva la forma exacta de
  // los documentos semilla, evita el casteo de Mongoose y usa el nombre de
  // colección real del modelo (el desajuste que originó las fantasma, #135).
  const collections: { name: string; model: mongoose.Model<never>; docs: Record<string, unknown>[] }[] = [
    { name: "users", model: User as never, docs: data.users },
    { name: "lands", model: Land as never, docs: data.lands },
    { name: "rentalrequests", model: RentalRequest as never, docs: data.requests },
    { name: "contracts", model: Contract as never, docs: data.contracts },
    { name: "payments", model: Payment as never, docs: data.payments },
    { name: "chats", model: Chat as never, docs: data.chats },
    { name: "chatmessages", model: ChatMessage as never, docs: data.messages },
    { name: "favorites", model: Favorite as never, docs: data.favorites },
    { name: "reports", model: Report as never, docs: data.reports },
    { name: "reviews", model: Review as never, docs: data.reviews },
    { name: "savedsearches", model: SavedSearch as never, docs: data.savedSearches },
    { name: "visits", model: Visit as never, docs: data.visits },
    { name: "notifications", model: Notification as never, docs: data.notifications },
    { name: "auditevents", model: AuditEvent as never, docs: data.auditEvents },
    { name: "leads", model: Lead as never, docs: data.leads },
  ];

  const counts: Record<string, number> = {};
  for (const { name, model, docs } of collections) {
    await model.collection.deleteMany({});
    if (docs.length > 0) await model.collection.insertMany(docs as never);
    counts[name] = docs.length;
  }

  counts.photos = await seedPhotos(data.photoPlan);

  return { counts, droppedGhostCollections, photos: counts.photos };
}
