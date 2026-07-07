import type { ErrorHandler } from "hono";
import { failure } from "../lib/api-response";

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler: ErrorHandler = (error, c) => {
  const requestId = c.get("requestId") ?? "unknown";
  const traceId = c.get("traceId") ?? "unknown";
  const appError = error as AppError;

  console.error(JSON.stringify({
    level: "error",
    timestamp: new Date().toISOString(),
    requestId,
    traceId,
    error: appError.message,
    stack: appError.stack,
  }));

  const statusCode = appError.statusCode ?? 500;
  const code = (appError.code as any) ?? "INTERNAL_ERROR";

  return failure(c, statusCode as any, code, appError.message);
};
