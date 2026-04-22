const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").trim();
const baseUrl = configuredBaseUrl ? configuredBaseUrl.replace(/\/$/, "") : "";

function resolveUrl(path) {
  return baseUrl ? `${baseUrl}${path}` : path;
}

async function request(path, token, options = {}) {
  const method = options.method || "GET";
  const body = options.body;
  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
  };

  const response = await fetch(resolveUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    return {
      ok: false,
      status: response.status,
      code: payload?.error?.code,
      message:
        payload?.error?.message ||
        `Request failed with status ${response.status}`,
      requestId: payload?.error?.requestId,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload.data,
    requestId: payload.meta?.requestId,
  };
}

export function getAuthMe(token) {
  return request("/api/v1/auth/me", token);
}

export function pingAdmin(token) {
  return request("/api/v1/auth/admin/ping", token);
}

export function getPendingLands(token) {
  return request("/api/v1/admin/lands/pending", token);
}

export function moderateLand(token, landId, decision, reason = "") {
  return request(`/api/v1/admin/lands/${landId}/moderate`, token, {
    method: "PATCH",
    body: {
      decision,
      reason,
    },
  });
}

export function getUsers(token) {
  return request("/api/v1/admin/users", token);
}

export function setUserStatus(token, userId, status, reason = "") {
  return request(`/api/v1/admin/users/${userId}/status`, token, {
    method: "PATCH",
    body: {
      status,
      reason,
    },
  });
}

export function getAuditEvents(token) {
  return request("/api/v1/audit-events", token);
}
