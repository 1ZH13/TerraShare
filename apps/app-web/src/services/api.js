/**
 * API client para TerraShare — conecta app-web con backend-api.
 *
 * Base URL: VITE_API_BASE_URL (definida en .env)
 * Auth: Authorization: Bearer <clerk_token> (usado automaticamente por authTokenFn)
 *
 * Rutas disponibles:
 *   GET    /api/v1/lands                              — listado con filtros
 *   GET    /api/v1/lands/:landId                     — detalle de terreno
 *   POST   /api/v1/rental-requests                   — crear solicitud
 *   GET    /api/v1/rental-requests?tenantId=X        — solicitudes del arrendatario
 *   GET    /api/v1/rental-requests?ownerId=X         — bandeja del propietario
 *   PATCH  /api/v1/rental-requests/:requestId/status — aprobar/rechazar
 *
 * Docs: apps/backend-api/docs/API_ENDPOINTS.md
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

/** Fn para obtener el Clerk token actual — inyectada por el caller via setTokenFn */
let authTokenFn = () => null;
export const setTokenFn = (fn) => {
  authTokenFn = fn;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = authTokenFn();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (res) => {
  if (!res.ok) {
    let errorBody;
    try {
      errorBody = await res.json();
    } catch {
      errorBody = { message: res.statusText };
    }
    const message =
      errorBody?.error?.message ||
      errorBody?.message ||
      `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(message);
  }
  return res.json();
};

const request = async (method, path, body) => {
  const opts = {
    method,
    headers: buildHeaders()
  };
  if (body != null) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return handleResponse(res);
};

// ─── Lands ───────────────────────────────────────────────────────────────────

/**
 *GET /api/v1/lands
 * Filtros: type, province, district, priceMax, availableOn, use, page, pageSize
 */
export const listLands = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type && filters.type !== "all") params.set("use", filters.type);
  if (filters.location) {
    params.set("province", filters.location);
    params.set("district", filters.location);
  }
  if (filters.maxPrice) params.set("priceMax", filters.maxPrice);
  if (filters.availableOn) params.set("availableFrom", filters.availableOn);
  params.set("sort", "price");
  params.set("order", "asc");

  const qs = params.toString();
  const path = `/api/v1/lands${qs ? `?${qs}` : ""}`;
  const response = await request("GET", path);
  // Backend returns { items: [...], pagination: {...} }
  return response?.data?.items ?? [];
};

/** GET /api/v1/lands/:landId */
export const getLandById = async (landId) => {
  const response = await request("GET", `/api/v1/lands/${landId}`);
  // Backend wraps in { ok, data: land, meta }
  return response?.data ?? null;
};

// ─── Rental Requests ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/rental-requests
 * Body: { landId, startDate, endDate, intendedUse, message }
 */
export const createRentalRequest = async (payload) => {
  const data = await request("POST", "/api/v1/rental-requests", payload);
  return data?.data ?? null;
};

/**
 * GET /api/v1/rental-requests?tenantId=X  — solicitudes del arrendatario
 * GET /api/v1/rental-requests?ownerId=X   — bandeja del propietario
 */
export const listRentalRequests = async ({ tenantId, ownerId } = {}) => {
  const params = new URLSearchParams();
  if (tenantId) params.set("tenantId", tenantId);
  if (ownerId) params.set("ownerId", ownerId);
  const qs = params.toString();
  const path = `/api/v1/rental-requests${qs ? `?${qs}` : ""}`;
  const response = await request("GET", path);
  // Backend returns { items: [...], pagination: {...} }
  return response?.data?.items ?? [];
};

/**
 * PATCH /api/v1/rental-requests/:requestId/status
 * Body: { status: "approved" | "rejected" }
 */
export const updateRentalRequestStatus = async (requestId, status) => {
  const response = await request(
    "PATCH",
    `/api/v1/rental-requests/${requestId}/status`,
    { status }
  );
  return response?.data ?? null;
};;

// ─── Field adapters — traducen registros del backend al formato que espera el UI ───
// эти функции обеспечивают совместимость между форматами данных.

/**
 * Traduce un LandRecord del backend al formato que espera app-web.
 * Backend: priceRule.pricePerMonth, location.{province,district}, area, allowedUses, availability
 * UI:     monthlyPrice, province, district, areaHectares, type, availableFrom, availableTo
 */
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

/**
 * Traduce RentalRequestRecord del backend — enriquece con datos de terreno y tenant.
 * El backend no incluye enrich automatique; para eso necesitamos el store.
 * Aqui solo normalizamos los campos del registro plano.
 */
export const adaptRentalRequest = (request, extra = {}) => ({
  ...request,
  ...extra,
  landName: extra.landName ?? request.landName ?? "Terreno",
  tenantName: extra.tenantName ?? request.tenantName ?? "",
  tenantEmail: extra.tenantEmail ?? request.tenantEmail ?? "",
  monthlyPrice: extra.monthlyPrice ?? request.monthlyPrice ?? 0,
  landType: extra.landType ?? request.landType ?? "",
});

// ─── Auth helpers (para uso interno del app-web) ───────────────────────────────

/** GET /api/v1/auth/me — datos del usuario autenticado via Clerk */
export const getMe = async () => {
  const response = await request("GET", "/api/v1/auth/me");
  return response?.data ?? null;
};

export const api = {
  setTokenFn,
  listLands,
  getLandById,
  createRentalRequest,
  listRentalRequests,
  updateRentalRequestStatus,
  getMe
};