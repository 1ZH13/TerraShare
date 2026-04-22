const USERS_STORAGE_KEY = "terrashare.appweb.users";
const REQUESTS_STORAGE_KEY = "terrashare.appweb.requests";
const SESSION_STORAGE_KEY = "terrashare.appweb.session";
const NETWORK_DELAY_MS = 180;

const seedUsers = [
  {
    id: "usr-owner-1",
    name: "Olga Propietaria",
    email: "owner@terrashare.test",
    password: "123456",
    role: "owner"
  },
  {
    id: "usr-tenant-1",
    name: "Rafael Arrendatario",
    email: "tenant@terrashare.test",
    password: "123456",
    role: "tenant"
  },
  {
    id: "usr-tenant-2",
    name: "Marta Productora",
    email: "marta@terrashare.test",
    password: "123456",
    role: "tenant"
  }
];

const seedLands = [
  {
    id: "land-1",
    ownerId: "usr-owner-1",
    name: "Finca El Tamarindo",
    province: "Los Santos",
    district: "Las Tablas",
    type: "Agricultura",
    monthlyPrice: 420,
    areaHectares: 5,
    availableFrom: "2026-05-01",
    availableTo: "2026-12-31",
    allowedUses: ["agricultura"],
    waterSource: "Pozo y rio cercano",
    summary:
      "Terreno plano con acceso vehicular y punto de carga cercano para produccion continua."
  },
  {
    id: "land-2",
    ownerId: "usr-owner-1",
    name: "Lote Vista Caisan",
    province: "Chiriqui",
    district: "Renacimiento",
    type: "Ganaderia",
    monthlyPrice: 560,
    areaHectares: 9,
    availableFrom: "2026-06-01",
    availableTo: "2027-02-15",
    allowedUses: ["ganaderia", "mixto"],
    waterSource: "Toma de quebrada",
    summary:
      "Lote con pasto natural, cerramiento parcial y espacio para manejo de animales."
  },
  {
    id: "land-3",
    ownerId: "usr-owner-1",
    name: "Parcela Rio Indio",
    province: "Cocle",
    district: "Penonome",
    type: "Mixto",
    monthlyPrice: 390,
    areaHectares: 4,
    availableFrom: "2026-04-25",
    availableTo: "2026-10-30",
    allowedUses: ["agricultura", "ganaderia", "mixto"],
    waterSource: "Sistema de riego",
    summary:
      "Parcela flexible para proyectos de ciclo corto con infraestructura de riego."
  },
  {
    id: "land-4",
    ownerId: "usr-owner-1",
    name: "Finca Alto Verde",
    province: "Veraguas",
    district: "Santiago",
    type: "Agricultura",
    monthlyPrice: 610,
    areaHectares: 11,
    availableFrom: "2026-07-01",
    availableTo: "2027-06-30",
    allowedUses: ["agricultura"],
    waterSource: "Canal secundario",
    summary:
      "Espacio amplio para cultivo extensivo con acceso logistica de carga pesada."
  }
];

const seedRequests = [
  {
    id: "req-100",
    landId: "land-2",
    tenantId: "usr-tenant-1",
    startDate: "2026-08-01",
    endDate: "2026-09-30",
    intendedUse: "engorde de ganado en rotacion",
    message: "Tengo equipo y personal para iniciar en dos semanas.",
    status: "pending_owner",
    createdAt: "2026-04-21T10:00:00.000Z",
    updatedAt: "2026-04-21T10:00:00.000Z"
  },
  {
    id: "req-101",
    landId: "land-1",
    tenantId: "usr-tenant-2",
    startDate: "2026-05-05",
    endDate: "2026-06-05",
    intendedUse: "siembra de maiz",
    message: "Busco contrato corto para ciclo de prueba.",
    status: "approved",
    createdAt: "2026-04-20T18:35:00.000Z",
    updatedAt: "2026-04-20T20:00:00.000Z"
  }
];

export const RENTAL_REQUEST_STATUS = {
  draft: "draft",
  pendingOwner: "pending_owner",
  approved: "approved",
  rejected: "rejected",
  cancelled: "cancelled"
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const delay = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const normalizeEmail = (email) => email.trim().toLowerCase();

const sanitizeUser = (user) => {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
};

const safeReadList = (storageKey) => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getAllUsers = () => {
  const customUsers = safeReadList(USERS_STORAGE_KEY);
  return [...seedUsers, ...customUsers];
};

const getRequests = () => {
  const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(seedRequests));
    return clone(seedRequests);
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // If storage is corrupted, recover with seed data.
  }

  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(seedRequests));
  return clone(seedRequests);
};

const saveRequests = (requests) => {
  localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
};

const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const isDateInRange = (date, start, end) => date >= start && date <= end;

const hasOverlap = (firstStart, firstEnd, secondStart, secondEnd) =>
  firstStart <= secondEnd && secondStart <= firstEnd;

const enrichRequest = (request) => {
  const land = seedLands.find((item) => item.id === request.landId);
  const tenant = getAllUsers().find((user) => user.id === request.tenantId);

  return {
    ...request,
    landName: land?.name || "Terreno no encontrado",
    ownerId: land?.ownerId || null,
    tenantName: tenant?.name || "Arrendatario no encontrado",
    tenantEmail: tenant?.email || "",
    monthlyPrice: land?.monthlyPrice || 0,
    landType: land?.type || ""
  };
};

const withResponse = async (payload) => {
  await delay(NETWORK_DELAY_MS);
  return clone(payload);
};

const withError = async (message) => {
  await delay(NETWORK_DELAY_MS);
  throw new Error(message);
};

const ensureSession = () => {
  const userId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!userId) {
    return null;
  }

  const user = getAllUsers().find((item) => item.id === userId);
  if (!user) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }

  return sanitizeUser(user);
};

const listLands = async (filters = {}) => {
  const {
    type = "all",
    location = "",
    maxPrice = "",
    availableOn = ""
  } = filters;

  const normalizedLocation = location.trim().toLowerCase();
  const maxPriceValue = maxPrice === "" ? null : Number(maxPrice);

  const rows = seedLands
    .filter((land) => {
      if (type !== "all" && land.type !== type) {
        return false;
      }

      if (normalizedLocation) {
        const locationValue = `${land.province} ${land.district} ${land.name}`.toLowerCase();
        if (!locationValue.includes(normalizedLocation)) {
          return false;
        }
      }

      if (maxPriceValue !== null && !Number.isNaN(maxPriceValue)) {
        if (land.monthlyPrice > maxPriceValue) {
          return false;
        }
      }

      if (availableOn) {
        if (!isDateInRange(availableOn, land.availableFrom, land.availableTo)) {
          return false;
        }
      }

      return true;
    })
    .sort((first, second) => first.monthlyPrice - second.monthlyPrice);

  return withResponse(rows);
};

const getLandById = async (landId) => {
  const land = seedLands.find((item) => item.id === landId);
  if (!land) {
    return withError("No encontramos ese terreno.");
  }

  return withResponse(land);
};

const login = async ({ email, password }) => {
  const candidate = getAllUsers().find(
    (user) => normalizeEmail(user.email) === normalizeEmail(email)
  );

  if (!candidate || candidate.password !== password) {
    return withError("Credenciales invalidas.");
  }

  localStorage.setItem(SESSION_STORAGE_KEY, candidate.id);
  return withResponse(sanitizeUser(candidate));
};

const register = async ({ name, email, password }) => {
  const cleanName = name.trim();
  const cleanEmail = normalizeEmail(email);

  if (cleanName.length < 3) {
    return withError("El nombre debe tener al menos 3 caracteres.");
  }

  if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
    return withError("Ingresa un correo valido.");
  }

  if (password.length < 6) {
    return withError("La contrasena debe tener al menos 6 caracteres.");
  }

  const exists = getAllUsers().some((user) => normalizeEmail(user.email) === cleanEmail);
  if (exists) {
    return withError("Ese correo ya esta registrado.");
  }

  const customUsers = safeReadList(USERS_STORAGE_KEY);
  const newUser = {
    id: `usr-custom-${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    password,
    role: "tenant"
  };

  customUsers.push(newUser);
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(customUsers));
  localStorage.setItem(SESSION_STORAGE_KEY, newUser.id);

  return withResponse(sanitizeUser(newUser));
};

const logout = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
};

const getSessionUser = () => ensureSession();

const createRentalRequest = async ({
  tenantId,
  landId,
  startDate,
  endDate,
  intendedUse,
  message
}) => {
  const tenant = getAllUsers().find((user) => user.id === tenantId);
  if (!tenant) {
    return withError("Sesion invalida. Inicia sesion nuevamente.");
  }

  if (tenant.role !== "tenant") {
    return withError("Solo el arrendatario puede crear solicitudes.");
  }

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
    return withError("Debes indicar fechas validas para la solicitud.");
  }

  if (startDate > endDate) {
    return withError("La fecha de inicio no puede ser mayor a la fecha final.");
  }

  const land = seedLands.find((item) => item.id === landId);
  if (!land) {
    return withError("El terreno seleccionado no existe.");
  }

  if (!isDateInRange(startDate, land.availableFrom, land.availableTo)) {
    return withError("La fecha de inicio esta fuera del rango disponible del terreno.");
  }

  if (!isDateInRange(endDate, land.availableFrom, land.availableTo)) {
    return withError("La fecha de fin esta fuera del rango disponible del terreno.");
  }

  if (intendedUse.trim().length < 5) {
    return withError("Describe mejor el uso propuesto (minimo 5 caracteres).");
  }

  const now = new Date().toISOString();
  const request = {
    id: `req-${Date.now()}`,
    landId,
    tenantId,
    startDate,
    endDate,
    intendedUse: intendedUse.trim(),
    message: message.trim(),
    status: RENTAL_REQUEST_STATUS.pendingOwner,
    createdAt: now,
    updatedAt: now
  };

  const requests = getRequests();
  requests.push(request);
  saveRequests(requests);

  return withResponse(enrichRequest(request));
};

const listTenantRequests = async (tenantId) => {
  const requests = getRequests()
    .filter((request) => request.tenantId === tenantId)
    .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
    .map((request) => enrichRequest(request));

  return withResponse(requests);
};

const listOwnerRequests = async (ownerId) => {
  const ownedLandIds = seedLands
    .filter((land) => land.ownerId === ownerId)
    .map((land) => land.id);

  const requests = getRequests()
    .filter((request) => ownedLandIds.includes(request.landId))
    .sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt))
    .map((request) => enrichRequest(request));

  return withResponse(requests);
};

const updateRentalRequestStatus = async ({ ownerId, requestId, status }) => {
  const nextStatusAllowed = [
    RENTAL_REQUEST_STATUS.approved,
    RENTAL_REQUEST_STATUS.rejected
  ];

  if (!nextStatusAllowed.includes(status)) {
    return withError("Estado no permitido para esta accion.");
  }

  const requests = getRequests();
  const currentRequest = requests.find((request) => request.id === requestId);
  if (!currentRequest) {
    return withError("No encontramos la solicitud que quieres actualizar.");
  }

  const land = seedLands.find((item) => item.id === currentRequest.landId);
  if (!land || land.ownerId !== ownerId) {
    return withError("Solo el propietario del terreno puede decidir sobre esta solicitud.");
  }

  if (currentRequest.status !== RENTAL_REQUEST_STATUS.pendingOwner) {
    return withError("Solo las solicitudes pendientes pueden cambiar de estado.");
  }

  if (status === RENTAL_REQUEST_STATUS.approved) {
    const overlap = requests.some((request) => {
      if (request.id === currentRequest.id) {
        return false;
      }

      if (request.landId !== currentRequest.landId) {
        return false;
      }

      if (request.status !== RENTAL_REQUEST_STATUS.approved) {
        return false;
      }

      return hasOverlap(
        request.startDate,
        request.endDate,
        currentRequest.startDate,
        currentRequest.endDate
      );
    });

    if (overlap) {
      return withError(
        "No se puede aprobar porque existe un alquiler aprobado que se solapa en fechas."
      );
    }
  }

  currentRequest.status = status;
  currentRequest.updatedAt = new Date().toISOString();
  saveRequests(requests);

  return withResponse(enrichRequest(currentRequest));
};

export const api = {
  getSessionUser,
  login,
  register,
  logout,
  listLands,
  getLandById,
  createRentalRequest,
  listTenantRequests,
  listOwnerRequests,
  updateRentalRequestStatus
};
