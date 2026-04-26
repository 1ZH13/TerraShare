const LANDS = [
  {
    id: "1",
    title: "Finca El Tamarindo",
    ownerName: "Manuel Cedeño",
    description: "Terreno fértil ideal para cultivos de ciclo corto. Cuenta con sistema de riego instalado y acceso por carretera principal.",
    areaHectares: 5.2,
    allowedUses: ["agricultura"],
    location: {
      province: "Los Santos",
      district: "Guararé",
      addressLine: "Sector El Tamarindo",
      lat: 7.818,
      lng: -80.327,
    },
    availability: { availableFrom: "2026-05-01" },
    priceRule: { currency: "USD", pricePerMonth: 420 },
    status: "active",
    water: "Pozo y río cercano",
    access: "Carretera asfaltada",
    features: ["Riego instalado", "Acceso vehicular", "Suelo fértil", "Cerca de río"],
    mapPosition: { x: 24, y: 72 },
  },
  {
    id: "2",
    title: "Lote Vista Caisan",
    ownerName: "Rosa Aguilar",
    description: "Pasto establecido perfecto para ganado. Cercas en buen estado y galpón de almacenamiento.",
    areaHectares: 12,
    allowedUses: ["ganaderia"],
    location: {
      province: "Chiriquí",
      district: "Bugaba",
      addressLine: "Corregimiento de Caisán",
      lat: 8.567,
      lng: -82.667,
    },
    availability: { availableFrom: "2026-04-15" },
    priceRule: { currency: "USD", pricePerMonth: 560 },
    status: "active",
    water: "Toma de quebrada",
    access: "Entrada principal compactada",
    features: ["Pasto establecido", "Galpón de almacenamiento", "Cercas perimetrales", "Agua permanente"],
    mapPosition: { x: 70, y: 26 },
  },
  {
    id: "3",
    title: "Parcela Río Indio",
    ownerName: "Carlos Vergara",
    description: "Terreno adaptable para agricultura y ganadería. Suelo profundo y bien drenado.",
    areaHectares: 3.8,
    allowedUses: ["mixto"],
    location: {
      province: "Coclé",
      district: "Penonomé",
      addressLine: "Ribera de Río Indio",
      lat: 8.507,
      lng: -80.359,
    },
    availability: { availableFrom: "2026-04-01" },
    priceRule: { currency: "USD", pricePerMonth: 390 },
    status: "active",
    water: "Sistema de riego",
    access: "Camino rural",
    features: ["Suelo profundo", "Buen drenaje", "Versátil", "Cerca de río"],
    mapPosition: { x: 48, y: 52 },
  },
  {
    id: "4",
    title: "Hacienda Las Lomas",
    ownerName: "Adriana Morales",
    description: "Terreno con buena topografía y acceso a servicios básicos. Ideal para proyectos de exportación.",
    areaHectares: 8.4,
    allowedUses: ["agricultura"],
    location: {
      province: "Veraguas",
      district: "Santiago",
      addressLine: "Altos de Las Lomas",
      lat: 8.103,
      lng: -80.984,
    },
    availability: { availableFrom: "2026-06-01" },
    priceRule: { currency: "USD", pricePerMonth: 510 },
    status: "active",
    water: "Pozo profundo",
    access: "Camino afirmado",
    features: ["Topografía suave", "Acceso a servicios", "Pozo profundo", "Ideal para exportación"],
    mapPosition: { x: 39, y: 40 },
  },
  {
    id: "5",
    title: "Solar El Roble",
    ownerName: "Julio Batista",
    description: "Terreno pequeño pero productivo. Perfecto para pequeños productores.",
    areaHectares: 2.1,
    allowedUses: ["mixto"],
    location: {
      province: "Herrera",
      district: "Chitré",
      addressLine: "Camino a El Roble",
      lat: 7.966,
      lng: -80.431,
    },
    availability: { availableFrom: "2026-04-10" },
    priceRule: { currency: "USD", pricePerMonth: 350 },
    status: "active",
    water: "Río cercano",
    access: "Acceso vehicular",
    features: ["Pequeño pero productivo", "Cerca de río", "Acceso vehicular", "Flexible"],
    mapPosition: { x: 33, y: 64 },
  },
  {
    id: "6",
    title: "Bosque La Esperanza",
    ownerName: "Federico Quintero",
    description: "Terreno con cobertura boscosa y senderos naturales. Buen potencial para agroforestería y turismo rural.",
    areaHectares: 14.6,
    allowedUses: ["forestal"],
    location: {
      province: "Panamá Oeste",
      district: "Capira",
      addressLine: "Faldas de la cordillera",
      lat: 8.715,
      lng: -79.891,
    },
    availability: { availableFrom: "2026-07-01" },
    priceRule: { currency: "USD", pricePerMonth: 640 },
    status: "active",
    water: "Quebrada interna",
    access: "Camino de tierra compactada",
    features: ["Cobertura boscosa", "Senderos naturales", "Aire fresco", "Potencial ecoturístico"],
    mapPosition: { x: 16, y: 30 },
  },
];

const DEFAULT_CHAT_MESSAGES = {
  1: [
    {
      id: "1-seed-1",
      role: "owner",
      text: "Hola, soy Manuel. El terreno está disponible de inmediato y puedo compartir más fotos si las necesitas.",
      createdAt: "2026-04-22T09:00:00.000Z",
    },
  ],
  2: [
    {
      id: "2-seed-1",
      role: "owner",
      text: "Hola, Rosa por aquí. El lote tiene agua permanente y cercas recientes.",
      createdAt: "2026-04-22T09:10:00.000Z",
    },
  ],
  3: [
    {
      id: "3-seed-1",
      role: "owner",
      text: "Te puedo confirmar disponibilidad para este mes y coordinar una visita.",
      createdAt: "2026-04-22T09:20:00.000Z",
    },
  ],
};

export const LAND_USE_LABELS = {
  agricultura: "Agricultura",
  ganaderia: "Ganadería",
  forestal: "Forestal",
  acuicultura: "Acuicultura",
  mixto: "Mixto",
  otro: "Otro",
};

export function getLands() {
  return LANDS;
}

export function getLandById(id) {
  return LANDS.find((land) => land.id === id) ?? null;
}

export function getLandPrimaryUse(land) {
  return land?.allowedUses?.[0] ?? "otro";
}

export function formatLandUse(use) {
  return LAND_USE_LABELS[use] ?? use;
}

export function getDistinctValues(keySelector) {
  return [...new Set(LANDS.map(keySelector).filter(Boolean))];
}

export function filterLands(lands, filters = {}) {
  const query = (filters.query ?? "").trim().toLowerCase();
  const typeFilter = filters.type ?? "Todos";
  const provinceFilter = filters.province ?? "Todas";
  const maxPrice = filters.maxPrice ?? Number.POSITIVE_INFINITY;

  return lands.filter((land) => {
    const type = getLandPrimaryUse(land);
    const price = land.priceRule?.pricePerMonth ?? 0;
    const matchesType = typeFilter === "Todos" || type === typeFilter;
    const matchesProvince = provinceFilter === "Todas" || land.location?.province === provinceFilter;
    const matchesPrice = Number.isFinite(maxPrice) ? price <= maxPrice : true;
    const haystack = [
      land.title,
      land.location?.province,
      land.location?.district,
      land.description,
      land.water,
      land.access,
      type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesQuery = !query || haystack.includes(query);

    return matchesType && matchesProvince && matchesPrice && matchesQuery;
  });
}

export function getChatSeedMessages(landId) {
  return DEFAULT_CHAT_MESSAGES[landId] ?? [];
}

export function normalizeReserveLand(land) {
  if (!land) return null;

  const province = land.province ?? land.location?.province ?? "";
  const district = land.district ?? land.location?.district ?? "";
  const type = land.type ? land.type : formatLandUse(getLandPrimaryUse(land));
  const areaHectares = land.areaHectares ?? land.area ?? 0;
  const monthlyPrice = land.monthlyPrice ?? land.priceRule?.pricePerMonth ?? 0;
  const availableFrom = land.availableFrom ?? land.availability?.availableFrom ?? "";

  return {
    id: land.id,
    type,
    title: land.title,
    province,
    district,
    areaHectares,
    monthlyPrice,
    availableFrom,
  };
}
