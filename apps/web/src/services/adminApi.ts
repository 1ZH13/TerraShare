/**
 * Admin API client — connects to backend-api admin endpoints.
 *
 * Cuando hay sesión de Clerk envía su JWT real (`Authorization: Bearer`), igual
 * que `services/api.ts`. El bypass de dev (`x-dev-*`) solo actúa como respaldo
 * sin sesión: antes era la única identidad que se enviaba, así que en producción
 * el panel admin viajaba sin autenticación (#262).
 */
import type {
  ApiSuccess,
  LandDto,
  UserSummaryDto,
  PaymentDto,
  ReconciliationReportDto,
} from "@terrashare/shared";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const buildHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

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
    headers["x-dev-role"] = "admin";
    headers["x-dev-user-id"] = "web_dev_admin";
  }
  return headers;
};

const handleResponse = async (res: Response): Promise<unknown> => {
  if (!res.ok) {
    let err: any;
    try { err = await res.json(); } catch { err = {}; }
    if (res.status === 401 || res.status === 403) {
      throw new Error(err?.error?.message || "No tienes permisos de administrador.");
    }
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
};

const request = async <T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiSuccess<T>> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: await buildHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return (await handleResponse(res)) as ApiSuccess<T>;
};

interface AdminUserFilters {
  role?: string;
  status?: string;
  search?: string;
}

interface AdminLandFilters {
  status?: string;
  search?: string;
}

// ─── Users ───────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/users?role=&status=&search= */
export const listAdminUsers = (filters: AdminUserFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return request<UserSummaryDto[]>("GET", `/api/v1/admin/users${qs ? `?${qs}` : ""}`);
};

/** GET /api/v1/admin/users/:userId */
export const getAdminUser = (userId: string) =>
  request<UserSummaryDto>("GET", `/api/v1/admin/users/${userId}`);

/** PATCH /api/v1/admin/users/:userId/status — { status: "active"|"blocked" } */
export const updateUserStatus = (userId: string, status: string) =>
  request<UserSummaryDto>("PATCH", `/api/v1/admin/users/${userId}/status`, { status });

// ─── Lands ───────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/lands?status=&search= */
export const listAdminLands = (filters: AdminLandFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return request<LandDto[]>("GET", `/api/v1/admin/lands${qs ? `?${qs}` : ""}`);
};

/** PATCH /api/v1/admin/lands/:landId/status — { status: "active"|"inactive"|"rejected" } */
export const updateLandStatus = (landId: string, status: string) =>
  request<LandDto>("PATCH", `/api/v1/admin/lands/${landId}/status`, { status });

/** GET /api/v1/admin/rental-requests */
export const listAdminRentalRequests = (filters: AdminLandFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return request("GET", `/api/v1/admin/rental-requests${qs ? `?${qs}` : ""}`);
};

/** GET /api/v1/admin/summary */
export const getAdminSummary = () => request("GET", "/api/v1/admin/summary");

// ─── Pagos / Conciliación (HU-41 #159) ────────────────────────────────────────

/** GET /api/v1/payments/reconciliation */
export const getReconciliation = () =>
  request<ReconciliationReportDto>("GET", "/api/v1/payments/reconciliation");

// ─── Pagos / Reembolsos (HU-43 #161) ──────────────────────────────────────────

/** GET /api/v1/payments — como admin, devuelve todos los pagos. */
export const listAdminPayments = (status?: string) => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<PaymentDto[]>("GET", `/api/v1/payments${qs}`);
};

/** POST /api/v1/payments/:id/refund — reembolso total (sin amount) o parcial. */
export const refundPayment = (
  paymentId: string,
  input: { amount?: number; reason?: string } = {},
) => request<PaymentDto>("POST", `/api/v1/payments/${paymentId}/refund`, input);

// ─── Leads ───────────────────────────────────────────────────────────────────

export interface AdminLead {
  id: string;
  email: string;
  source: string;
  createdAt?: string;
}

interface AdminLeadFilters {
  source?: string;
  search?: string;
}

/** GET /api/v1/admin/leads?source=&search= */
export const listAdminLeads = (filters: AdminLeadFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.source) params.set("source", filters.source);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return request<{ leads: AdminLead[]; total: number }>(
    "GET",
    `/api/v1/admin/leads${qs ? `?${qs}` : ""}`,
  );
};

// ─── Reports (moderación) ────────────────────────────────────────────────────

export type ReportTargetType = "land" | "user" | "chat";
export type ReportReason = "spam" | "fraude" | "contenido_inapropiado" | "informacion_falsa" | "otro";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface AdminReportSummary {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
  reason: ReportReason;
  status: ReportStatus;
  reporterId: string;
  reporterEmail: string;
  createdAt?: string;
}

export interface AdminReportDetail extends AdminReportSummary {
  description?: string;
  reporterName?: string | null;
  resolutionNote?: string;
  resolvedBy?: string;
  updatedAt?: string;
}

interface AdminReportFilters {
  status?: string;
  targetType?: string;
  search?: string;
}

/** GET /api/v1/admin/reports?status=&targetType=&search= */
export const listAdminReports = (filters: AdminReportFilters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.targetType) params.set("targetType", filters.targetType);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return request<{ items: AdminReportSummary[]; total: number }>(
    "GET",
    `/api/v1/admin/reports${qs ? `?${qs}` : ""}`,
  );
};

/** GET /api/v1/admin/reports/:reportId */
export const getAdminReport = (reportId: string) =>
  request<AdminReportDetail>("GET", `/api/v1/admin/reports/${reportId}`);

/** PATCH /api/v1/admin/reports/:reportId — { status, resolutionNote? } */
export const updateReportStatus = (reportId: string, status: ReportStatus, resolutionNote?: string) =>
  request<AdminReportDetail>("PATCH", `/api/v1/admin/reports/${reportId}`, { status, resolutionNote });
