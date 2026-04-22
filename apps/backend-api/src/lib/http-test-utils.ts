import { createApp } from "../app";

export async function requestJson(
  path: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  },
) {
  process.env.ALLOW_DEV_AUTH_BYPASS = "true";
  process.env.CLERK_JWKS_URL = process.env.CLERK_JWKS_URL ?? "https://example.test/.well-known/jwks.json";
  process.env.CLERK_ISSUER = process.env.CLERK_ISSUER ?? "https://example.test";

  const app = createApp();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(init?.headers ?? {}),
  };

  const response = await app.request(path, {
    method: init?.method ?? "GET",
    headers,
    body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : null;
  return { response, payload };
}
