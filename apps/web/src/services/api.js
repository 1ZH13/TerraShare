/**
 * API client para apps/web — conecta con backend-api.
 * Always uses dev bypass headers in development.
 * No authentication tokens required.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  if (import.meta.env.DEV) {
    headers["x-dev-role"] = "user";
    headers["x-dev-user-id"] = "web_dev_user";
  }
  return headers;
};

const handleResponse = async (res) => {
  if (!res.ok) {
    let body;
    try { body = await res.json(); } catch { body = {}; }
    const msg = body?.error?.message || body?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json();
};

const request = async (method, path, body) => {
  const opts = { method, headers: buildHeaders() };
  if (body != null) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return handleResponse(res);
};

// ─── Lands ───────────────────────────────────────────────────────────────────

/** GET /api/v1/lands — listado con filtros (use, province, district, priceMax, availableFrom, sort, order) */
export const listLands = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.set("use", filters.type);
  if (filters.province) params.set("province", filters.province);
  if (filters.district) params.set("district", filters.district);
  if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
  if (filters.availableFrom) params.set("availableFrom", filters.availableFrom);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();
  const res = await request("GET", `/api/v1/lands${qs ? `?${qs}` : ""}`);
  return res?.data?.items ?? res?.data ?? [];
};

/** GET /api/v1/lands/me - lista lands del usuario actual */
export const getMyLands = async () => {
  const res = await request("GET", "/api/v1/lands/me");
  return res?.data ?? [];
};

/** POST /api/v1/rental-requests */
export const createRentalRequest = async (payload) => {
  const res = await request("POST", "/api/v1/rental-requests", payload);
  return res?.data ?? null;
};

/** GET /api/v1/rental-requests */
export const listRentalRequests = async () => {
  const res = await request("GET", "/api/v1/rental-requests");
  return res?.data ?? [];
};

/** GET /api/v1/lands/:landId */
export const getLandById = async (landId) => {
  const res = await request("GET", `/api/v1/lands/${landId}`);
  return res?.data ?? null;
};

// ─── Payments ─────────────────────────────────────────────────────────────────

/** POST /api/v1/payments/checkout-session */
export const createCheckoutSession = async ({ rentalRequestId, currency = "USD", successUrl, cancelUrl }) => {
  const res = await request("POST", "/api/v1/payments/checkout-session", {
    rentalRequestId,
    currency,
    successUrl,
    cancelUrl,
  });
  return res?.data ?? null;
};

/** GET /api/v1/payments?rentalRequestId=x */
export const getPaymentsByRequest = async (rentalRequestId) => {
  const res = await request("GET", `/api/v1/payments?rentalRequestId=${rentalRequestId}`);
  return res?.data ?? [];
};

/** GET /api/v1/payments - lista todos los pagos del usuario */
export const getMyPayments = async () => {
  const res = await request("GET", "/api/v1/payments");
  return res?.data ?? [];
};

const adaptLandForCatalog = (land) => {
  if (!land) return null;
  return {
    ...land,
    priceRule: {
      ...land.priceRule,
      pricePerMonth: land.priceRule?.pricePerMonth ?? land.monthlyPrice ?? 0,
    },
    location: {
      ...land.location,
      province: land.location?.province ?? "",
      district: land.location?.district ?? "",
    },
    areaHectares: land.area ?? 0,
    type: land.allowedUses?.[0] ?? "",
    features: land.features ?? [],
    water: land.water ?? "No especificado",
    access: land.access ?? "No especificado",
    mapPosition: land.mapPosition ?? { x: 50, y: 50 },
  };
};

export const adaptLand = (land) => {
  if (!land) return null;
  return {
    ...land,
    monthlyPrice: land.priceRule?.pricePerMonth ?? land.monthlyPrice ?? 0,
    province: land.location?.province ?? land.province ?? "",
    district: land.location?.district ?? land.district ?? "",
    areaHectares: land.area ?? land.areaHectares ?? 0,
    type: land.allowedUses?.[0] ?? land.type ?? "",
    availableFrom: land.availability?.availableFrom ?? land.availableFrom ?? "",
    availableTo: land.availability?.availableTo ?? land.availableTo ?? "",
  };
};

export const getChats = async () => {
  const res = await request("GET", "/api/v1/chats");
  return res?.data ?? [];
};

export const createChat = async ({ landId, rentalRequestId, participants }) => {
  const res = await request("POST", "/api/v1/chats", { landId, rentalRequestId, participants });
  return res?.data ?? null;
};

export const getMessages = async (chatId) => {
  const res = await request("GET", `/api/v1/chats/${chatId}/messages`);
  return res?.data ?? [];
};

export const sendMessage = async (chatId, text) => {
  const res = await request("POST", `/api/v1/chats/${chatId}/messages`, { text });
  return res?.data ?? null;
};

export const getExternalContact = async (chatId) => {
  const res = await request("GET", `/api/v1/chats/${chatId}/external-contact`);
  return res?.data ?? null;
};

export const api = {
  listLands,
  getMyLands,
  getLandById,
  createRentalRequest,
  listRentalRequests,
  createCheckoutSession,
  getPaymentsByRequest,
  getMyPayments,
  adaptLand,
  getChats,
  createChat,
  getMessages,
  sendMessage,
  getExternalContact,
};
