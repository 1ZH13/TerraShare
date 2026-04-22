/**
 * Admin API client — connects to backend-api admin endpoints.
 * Auth: Bearer token from Clerk via setTokenFn.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

let authTokenFn = () => null;
export const setTokenFn = (fn) => { authTokenFn = fn; };

const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const token = authTokenFn();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
};

const handleResponse = async (res) => {
  if (!res.ok) {
    let err;
    try { err = await res.json(); } catch { err = {}; }
    throw new Error(err?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
};

const request = (method, path, body) =>
  fetch(`${BASE_URL}${path}`, {
    method,
    headers: buildHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  }).then(handleResponse);

// ─── Users ───────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/users?role=&status=&search= */
export const listAdminUsers = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.role) params.set("role", filters.role);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return request("GET", `/api/v1/admin/users${qs ? `?${qs}` : ""}`);
};

/** GET /api/v1/admin/users/:userId */
export const getAdminUser = (userId) =>
  request("GET", `/api/v1/admin/users/${userId}`);

/** PATCH /api/v1/admin/users/:userId/status — { status: "active"|"blocked" } */
export const updateUserStatus = (userId, status) =>
  request("PATCH", `/api/v1/admin/users/${userId}/status`, { status });

// ─── Lands ───────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/lands?status=&search= */
export const listAdminLands = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return request("GET", `/api/v1/admin/lands${qs ? `?${qs}` : ""}`);
};

/** PATCH /api/v1/admin/lands/:landId/status — { status: "active"|"inactive"|"rejected" } */
export const updateLandStatus = (landId, status) =>
  request("PATCH", `/api/v1/admin/lands/${landId}/status`, { status });
