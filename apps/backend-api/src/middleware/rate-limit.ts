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

export function rateLimitByUser(limit: number = MAX_REQUESTS_USER): MiddlewareHandler {
  return async (c, next) => {
    cleanExpiredEntries();

    const authUser = c.get("authUser");
    if (!authUser) {
      await next();
      return;
    }

    const userId = authUser.id;
    const key = `user:${userId}`;
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

export function rateLimitByIPAndUser(limit: number = MAX_REQUESTS_USER): MiddlewareHandler {
  return async (c, next) => {
    cleanExpiredEntries();

    const ip = getClientIP(c);
    const authUser = c.get("authUser");
    const userId = authUser?.id;

    const ipKey = `ip:${ip}`;
    const now = Date.now();

    let ipEntry = inMemoryStore.get(ipKey);
    if (!ipEntry || ipEntry.resetAt < now) {
      ipEntry = { count: 0, resetAt: now + WINDOW_MS };
    }
    ipEntry.count++;
    inMemoryStore.set(ipKey, ipEntry);

    c.header("X-RateLimit-Limit", String(limit));
    c.header("X-RateLimit-Remaining", String(Math.max(0, limit - ipEntry.count)));
    c.header("X-RateLimit-Reset", String(Math.ceil(ipEntry.resetAt / 1000)));

    if (ipEntry.count > MAX_REQUESTS_IP) {
      return c.json(
        { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
        429,
      );
    }

    if (userId) {
      const userKey = `user:${userId}`;
      let userEntry = inMemoryStore.get(userKey);
      if (!userEntry || userEntry.resetAt < now) {
        userEntry = { count: 0, resetAt: now + WINDOW_MS };
      }
      userEntry.count++;
      inMemoryStore.set(userKey, userEntry);

      if (userEntry.count > limit) {
        return c.json(
          { error: { code: "RATE_LIMIT_EXCEEDED", message: "Too many requests. Please try again later." } },
          429,
        );
      }
    }

    await next();
  };
}

setInterval(cleanExpiredEntries, WINDOW_MS);