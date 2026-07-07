import type { Context } from "hono";
import type { MiddlewareHandler } from "hono";

import { env } from "../config/env";

const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy":
    "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
};

function isHttps(c: Context): boolean {
  const xfp = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  if (xfp === "https") return true;
  try {
    return new URL(c.req.url).protocol === "https:";
  } catch {
    return false;
  }
}

export const securityHeaders: MiddlewareHandler = async (c, next) => {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    c.header(key, value);
  }
  if (env.isProduction && isHttps(c)) {
    c.header("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  }
  await next();
};
