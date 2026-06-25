/**
 * Admin API client — connects to backend-api admin endpoints.
 * Always uses dev bypass headers in development.
 * No authentication tokens required.
 */
import type { ApiSuccess, LandDto, UserSummaryDto } from "@terrashare/shared";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
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
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
};

const request = <T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiSuccess<T>> =>
  fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  }).then(handleResponse) as Promise<ApiSuccess<T>>;

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
