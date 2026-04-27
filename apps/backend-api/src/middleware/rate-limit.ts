import type { MiddlewareHandler } from "hono";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_IP = 100;
const MAX_REQUESTS_USER = 200;

function cleanExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.resetAt < now) {
      inMemoryStore.delete(key);
    }
  }
}

function getClientIP(c: { req: { header: (name: string) => string | undefined } }): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

export function rateLimitByIP(limit: number = MAX_REQUESTS_IP): MiddlewareHandler {
  return async (c, next) => {
    cleanExpiredEntries();

    const ip = getClientIP(c);
    const key = `ip:${ip}`;
    const now = Date.now();

    let entry = inMemoryStore.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + WINDOW_MS };
    }

    entry.count++;
    inMemoryStore.set(key, entry);

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(Math.max(0, limit - entry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > limit) {
      return c.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
        429,
      );
    }

    await next();
  };
}

setInterval(cleanExpiredEntries, WINDOW_MS);