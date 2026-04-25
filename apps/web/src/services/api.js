/**
 * API client para apps/web — conecta con backend-api.
 *
 * Base URL: VITE_API_BASE_URL (definida en .env)
 * Auth: Authorization: Bearer <clerk_token>
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

let authTokenFn = () => null;
export const setTokenFn = (fn) => {
  authTokenFn = fn;
};

const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = authTokenFn();
  if (token) headers["Authorization"] = `Bearer ${token}`;
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
  if (filters.type && filters.type !== "all") params.set("use", filters.type);
  if (filters.location) {
    params.set("province", filters.location);
  }
  if (filters.maxPrice) params.set("priceMax", filters.maxPrice);
  if (filters.availableOn) params.set("availableFrom", filters.availableOn);
  params.set("sort", filters.sort || "createdAt");
  params.set("order", filters.order || "desc");
  if (filters.page) params.set("page", filters.page);
  if (filters.pageSize) params.set("pageSize", filters.pageSize);

  const qs = params.toString();
  const res = await request("GET", `/api/v1/lands${qs ? `?${qs}` : ""}`);
  const items = res?.data?.items ?? [];
  return items.map(adaptLandForCatalog);
};

/** POST /api/v1/rental-requests */
export const createRentalRequest = async (payload) => {
  const res = await request("POST", "/api/v1/rental-requests", payload);
  return res?.data ?? null;
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

export const api = {
  setTokenFn,
  listLands,
  getLandById,
  createRentalRequest,
  createCheckoutSession,
  getPaymentsByRequest,
  adaptLand,
  getChats,
  createChat,
  getMessages,
  sendMessage,
};