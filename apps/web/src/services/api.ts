/**
 * API client para apps/web — conecta con backend-api.
 * Cuando hay sesión de Clerk, envía el JWT real (`Authorization: Bearer`) para
 * que el backend identifique al usuario. Solo cae al bypass de dev
 * (`x-dev-*`) si no hay sesión activa (p. ej. flujos públicos en local).
 */
import type {
  ApiSuccess,
  ChatDto,
  ChatMessageDto,
  CreateLandDto,
  CreateRentalRequestDto,
  ExternalContactDto,
  LandDto,
  PaymentDto,
  PublicOwnerProfileDto,
  ReceiptDto,
  RentalRequestDto,
} from "@terrashare/shared";

/**
 * Nombre de la cabecera de idempotencia (HU-42 #160).
 *
 * Se declara aquí en vez de importarla desde `@terrashare/shared`: ese paquete
 * se resuelve por alias a su código fuente y su `index` re-exporta los esquemas
 * de `zod`. Un import de *valor* desde la raíz arrastraría `zod` al bundle del
 * web —que no lo declara como dependencia— y rompería el build; los imports de
 * tipo se borran en compilación y no lo hacen.
 * Debe coincidir con `packages/shared/src/schemas/payments.ts`.
 */
const IDEMPOTENCY_HEADER = "Idempotency-Key";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

declare global {
  interface Window {
    Clerk?: {
      session?: { getToken: () => Promise<string | null> } | null;
    };
  }
}

const buildHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  // Identidad real: si hay sesión de Clerk, enviamos su JWT. El backend valida
  // el token y deriva el usuario de `sub`. Importante: NO enviamos los headers
  // `x-dev-*` en este caso, porque el middleware prioriza el bypass sobre el
  // token y todos los usuarios colapsarían en uno solo.
  try {
    const token = await window.Clerk?.session?.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      return headers;
    }
  } catch {
    // Sin token utilizable → caemos al fallback de dev.
  }

  if (import.meta.env.DEV) {
    headers["x-dev-role"] = "user";
    headers["x-dev-user-id"] = "web_dev_user";
  }
  return headers;
};

const handleResponse = async (res: Response): Promise<unknown> => {
  if (!res.ok) {
    let body: any;
    try { body = await res.json(); } catch { body = {}; }
    const msg = body?.error?.message || body?.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(msg);
  }
  return res.json();
};

const request = async <T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  extraHeaders?: Record<string, string>,
): Promise<ApiSuccess<T>> => {
  const headers = { ...(await buildHeaders()), ...(extraHeaders ?? {}) };
  const opts: RequestInit = { method, headers };
  if (body != null) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  return (await handleResponse(res)) as ApiSuccess<T>;
};

// ─── Lands ───────────────────────────────────────────────────────────────────

export interface CatalogFilters {
  type?: string;
  province?: string;
  district?: string;
  priceMax?: number;
  availableFrom?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

/** GET /api/v1/lands — listado con filtros (use, province, district, priceMax, availableFrom, sort, order) */
export const listLands = async (filters: CatalogFilters = {}): Promise<LandDto[]> => {
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
  const res = await request<{ items?: LandDto[] } | LandDto[]>(
    "GET",
    `/api/v1/lands${qs ? `?${qs}` : ""}`,
  );
  const data = res?.data as any;
  return data?.items ?? data ?? [];
};

/** GET /api/v1/lands/me - lista lands del usuario actual */
export const getMyLands = async (): Promise<LandDto[]> => {
  const res = await request<LandDto[]>("GET", "/api/v1/lands/me");
  return res?.data ?? [];
};

/** POST /api/v1/rental-requests */
export const createRentalRequest = async (
  payload: CreateRentalRequestDto,
): Promise<RentalRequestDto | null> => {
  const res = await request<RentalRequestDto>("POST", "/api/v1/rental-requests", payload);
  return res?.data ?? null;
};

/** GET /api/v1/rental-requests */
export const listRentalRequests = async (): Promise<RentalRequestDto[]> => {
  const res = await request<RentalRequestDto[]>("GET", "/api/v1/rental-requests");
  return res?.data ?? [];
};

/** GET /api/v1/rental-requests/:requestId */
export const getRentalRequestById = async (requestId: string): Promise<RentalRequestDto | null> => {
  const res = await request<RentalRequestDto>("GET", `/api/v1/rental-requests/${requestId}`);
  return res?.data ?? null;
};

/** GET /api/v1/lands/:landId */
export const getLandById = async (landId: string): Promise<LandDto | null> => {
  const res = await request<LandDto>("GET", `/api/v1/lands/${landId}`);
  return res?.data ?? null;
};

/** GET /api/v1/users/:userId/public — perfil público del propietario (#150). */
export const getOwnerPublicProfile = async (
  userId: string,
): Promise<PublicOwnerProfileDto | null> => {
  const res = await request<PublicOwnerProfileDto>("GET", `/api/v1/users/${userId}/public`);
  return res?.data ?? null;
};

/** POST /api/v1/lands — publica un terreno nuevo. */
export const createLand = async (dto: CreateLandDto): Promise<LandDto> => {
  const res = await request<LandDto>("POST", "/api/v1/lands", dto);
  return res.data;
};

// ─── Fotos de terrenos (#148) ─────────────────────────────────────────────────

/** Convierte una URL relativa de foto (`/api/v1/lands/…`) en absoluta al backend. */
export const photoSrc = (path: string): string =>
  path.startsWith("http") ? path : `${BASE_URL}${path}`;

/**
 * POST /api/v1/lands/:landId/photos — sube una foto (multipart).
 * No usa `request()` porque este envía JSON; aquí va `FormData`, cuyo
 * `Content-Type` (con boundary) debe fijar el navegador, no nosotros.
 */
export const uploadLandPhoto = async (
  landId: string,
  file: File,
): Promise<{ url: string; photos: string[] }> => {
  const headers = await buildHeaders();
  delete headers["Content-Type"]; // deja que el navegador ponga el boundary
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE_URL}/api/v1/lands/${landId}/photos`, {
    method: "POST",
    headers,
    body: fd,
  });
  const body = (await handleResponse(res)) as ApiSuccess<{ url: string; photos: string[] }>;
  return body.data;
};

/** DELETE /api/v1/lands/:landId/photos/:fileId — quita una foto. */
export const deleteLandPhoto = async (
  landId: string,
  fileId: string,
): Promise<{ photos: string[] }> => {
  const res = await request<{ photos: string[] }>(
    "DELETE",
    `/api/v1/lands/${landId}/photos/${fileId}`,
  );
  return res.data;
};

// ─── Favorites (#147) ─────────────────────────────────────────────────────────

/** GET /api/v1/users/me/favorites — terrenos guardados por el usuario. */
export const getMyFavorites = async (): Promise<LandDto[]> => {
  const res = await request<LandDto[]>("GET", "/api/v1/users/me/favorites");
  return res?.data ?? [];
};

/** POST /api/v1/users/me/favorites/:landId — guarda un terreno (idempotente). */
export const addFavorite = async (landId: string): Promise<void> => {
  await request("POST", `/api/v1/users/me/favorites/${landId}`);
};

/** DELETE /api/v1/users/me/favorites/:landId — quita un terreno de guardados. */
export const removeFavorite = async (landId: string): Promise<void> => {
  await request("DELETE", `/api/v1/users/me/favorites/${landId}`);
};

// ─── Payments ─────────────────────────────────────────────────────────────────

interface CheckoutSessionInput {
  rentalRequestId: string;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  /** Clave de idempotencia para evitar sesiones/cobros duplicados (HU-42 #160). */
  idempotencyKey?: string;
}

/** POST /api/v1/payments/checkout-session */
export const createCheckoutSession = async ({
  rentalRequestId,
  currency = "USD",
  successUrl,
  cancelUrl,
  idempotencyKey,
}: CheckoutSessionInput): Promise<any> => {
  const res = await request(
    "POST",
    "/api/v1/payments/checkout-session",
    { rentalRequestId, currency, successUrl, cancelUrl },
    idempotencyKey ? { [IDEMPOTENCY_HEADER]: idempotencyKey } : undefined,
  );
  return res?.data ?? null;
};

/** POST /api/v1/payments/create-intent */
export const createPaymentIntent = async ({
  rentalRequestId,
  currency = "USD",
}: {
  rentalRequestId: string;
  currency?: string;
}): Promise<any> => {
  const res = await request("POST", "/api/v1/payments/create-intent", { rentalRequestId, currency });
  return res?.data ?? null;
};

/** GET /api/v1/payments?rentalRequestId=x */
export const getPaymentsByRequest = async (rentalRequestId: string): Promise<PaymentDto[]> => {
  const res = await request<PaymentDto[]>(
    "GET",
    `/api/v1/payments?rentalRequestId=${rentalRequestId}`,
  );
  return res?.data ?? [];
};

/** GET /api/v1/payments - lista todos los pagos del usuario */
export const getMyPayments = async (): Promise<PaymentDto[]> => {
  const res = await request<PaymentDto[]>("GET", "/api/v1/payments");
  return res?.data ?? [];
};

/** GET /api/v1/payments/:id/receipt — datos del recibo descargable (HU-43 #161) */
export const getReceipt = async (paymentId: string): Promise<ReceiptDto | null> => {
  const res = await request<ReceiptDto>("GET", `/api/v1/payments/${paymentId}/receipt`);
  return res?.data ?? null;
};

/**
 * POST /api/v1/payments/confirm — verifica el estado del pago directamente
 * contra Stripe (no depende del webhook). Devuelve el estado resultante.
 */
export const confirmPayment = async (
  rentalRequestId: string,
): Promise<{ status?: string; paymentId?: string } | null> => {
  const res = await request<{ status?: string; paymentId?: string; rentalRequestId?: string }>(
    "POST",
    "/api/v1/payments/confirm",
    { rentalRequestId },
  );
  return res?.data ?? null;
};

type LandLike = Record<string, any>;

const adaptLandForCatalog = (land: LandLike | null | undefined) => {
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
    // #138: sin "No especificado" por defecto; el backend ya sirve estos campos
    // y la UI oculta los ausentes.
    water: land.water,
    access: land.access,
    mapPosition: land.mapPosition ?? { x: 50, y: 50 },
  };
};

export const adaptLand = (land: LandLike | null | undefined) => {
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

export const getChats = async (): Promise<ChatDto[]> => {
  const res = await request<ChatDto[]>("GET", "/api/v1/chats");
  return res?.data ?? [];
};

export const createChat = async ({
  landId,
  rentalRequestId,
  participants,
}: {
  landId?: string;
  rentalRequestId?: string;
  participants?: unknown;
}): Promise<ChatDto | null> => {
  const res = await request<ChatDto>("POST", "/api/v1/chats", { landId, rentalRequestId, participants });
  return res?.data ?? null;
};

export const getMessages = async (chatId: string): Promise<ChatMessageDto[]> => {
  const res = await request<ChatMessageDto[]>("GET", `/api/v1/chats/${chatId}/messages`);
  return res?.data ?? [];
};

export const sendMessage = async (chatId: string, text: string): Promise<ChatMessageDto | null> => {
  const res = await request<ChatMessageDto>("POST", `/api/v1/chats/${chatId}/messages`, { text });
  return res?.data ?? null;
};

export const getExternalContact = async (chatId: string): Promise<ExternalContactDto | null> => {
  const res = await request<ExternalContactDto>("GET", `/api/v1/chats/${chatId}/external-contact`);
  return res?.data ?? null;
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface UserProfile {
  fullName?: string;
  phone?: string;
  province?: string;
  marketPreference?: "busco" | "ofrezco";
}

interface MeResponse {
  id: string;
  email: string;
  role: string;
  profile: UserProfile;
}

/** GET /api/v1/auth/me */
export const getMe = async (): Promise<MeResponse | null> => {
  const res = await request<MeResponse>("GET", "/api/v1/auth/me");
  return res?.data ?? null;
};

/** PATCH /api/v1/auth/profile — update fullName / phone */
export const updateMyProfile = async (payload: UserProfile): Promise<MeResponse | null> => {
  const res = await request<MeResponse>("PATCH", "/api/v1/auth/profile", payload);
  return res?.data ?? null;
};

export type ReportTargetType = "land" | "user" | "chat";
export type ReportReason = "spam" | "fraude" | "contenido_inapropiado" | "informacion_falsa" | "otro";

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  description?: string;
}

/** POST /api/v1/reports — reporta un terreno/usuario/chat (usuario autenticado). */
export const createReport = async (input: CreateReportInput): Promise<{ id: string } | null> => {
  const res = await request<{ id: string }>("POST", "/api/v1/reports", input);
  return res?.data ?? null;
};

// ─── Reviews (#97) ────────────────────────────────────────────────────────────

export interface ReviewDto {
  id: string;
  contractId: string;
  senderId: string;
  receiverId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface RatingDto {
  averageRating: number;
  totalReviews: number;
}

/** POST /api/v1/reviews — dejar una reseña. */
export const createReview = async (input: {
  contractId: string;
  receiverId: string;
  rating: number;
  comment?: string;
}): Promise<ReviewDto | null> => {
  const res = await request<ReviewDto>("POST", "/api/v1/reviews", input);
  return res?.data ?? null;
};

/** GET /api/v1/users/:userId/reviews — reseñas de un usuario. */
export const getReviewsByUser = async (userId: string, contractId?: string): Promise<ReviewDto[]> => {
  const params = contractId ? `?contractId=${encodeURIComponent(contractId)}` : "";
  const res = await request<ReviewDto[]>("GET", `/api/v1/users/${userId}/reviews${params}`);
  return res?.data ?? [];
};

/** GET /api/v1/users/:userId/rating — calificación promedio. */
export const getRatingByUser = async (userId: string): Promise<RatingDto> => {
  const res = await request<RatingDto>("GET", `/api/v1/users/${userId}/rating`);
  return res?.data ?? { averageRating: 0, totalReviews: 0 };
};

// ─── Saved Searches (HU-99 / #325) ──────────────────────────────────────────

export interface SavedSearchDto {
  id: string;
  userId: string;
  name: string;
  filters: Record<string, unknown>;
  createdAt: string;
}

/** POST /api/v1/users/me/saved-searches — guardar un filtro con nombre. */
export const createSavedSearch = async (input: {
  name: string;
  filters: Record<string, unknown>;
}): Promise<SavedSearchDto | null> => {
  const res = await request<SavedSearchDto>("POST", "/api/v1/users/me/saved-searches", input);
  return res?.data ?? null;
};

/** GET /api/v1/users/me/saved-searches — listar mis búsquedas guardadas. */
export const listSavedSearches = async (): Promise<SavedSearchDto[]> => {
  const res = await request<SavedSearchDto[]>("GET", "/api/v1/users/me/saved-searches");
  return res?.data ?? [];
};

/** DELETE /api/v1/users/me/saved-searches/:id — eliminar una búsqueda guardada. */
export const deleteSavedSearch = async (id: string): Promise<boolean> => {
  const res = await request<unknown>("DELETE", `/api/v1/users/me/saved-searches/${id}`);
  return res?.ok ?? false;
};

export const api = {
  listLands,
  getMyLands,
  getLandById,
  createRentalRequest,
  listRentalRequests,
  getRentalRequestById,
  createCheckoutSession,
  getPaymentsByRequest,
  getMyPayments,
  confirmPayment,
  adaptLand,
  getChats,
  createChat,
  getMessages,
  sendMessage,
  getExternalContact,
  createReport,
  getMyFavorites,
  addFavorite,
  removeFavorite,
  createReview,
  getReviewsByUser,
  getRatingByUser,
  createSavedSearch,
  listSavedSearches,
  deleteSavedSearch,
};
