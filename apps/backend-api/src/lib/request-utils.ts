import type { Context } from "hono";

export function getNumericQuery(
  c: Context,
  key: string,
  fallback: number,
  options?: { min?: number; max?: number },
) {
  const raw = c.req.query(key);
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (Number.isNaN(value)) {
    return fallback;
  }

  if (options?.min !== undefined && value < options.min) {
    return options.min;
  }

  if (options?.max !== undefined && value > options.max) {
    return options.max;
  }

  return value;
}

export function getOptionalNumericQuery(c: Context, key: string): number | undefined {
  const raw = c.req.query(key);
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  return Number.isNaN(value) ? undefined : value;
}

export function getBooleanQuery(c: Context, key: string, fallback = false) {
  const raw = c.req.query(key);
  if (!raw) {
    return fallback;
  }
  return raw === "true";
}
