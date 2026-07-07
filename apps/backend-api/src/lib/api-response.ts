import type { Context } from "hono";

interface ErrorDetail {
  field: string;
  message: string;
}

type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "BUSINESS_RULE_VIOLATION"
  | "INVALID_TRANSITION"
  | "STRIPE_NOT_CONFIGURED"
  | "INTERNAL_ERROR";

export const ERROR_CATALOG = {
  VALIDATION_ERROR: { status: 400, message: "Invalid request data" },
  UNAUTHORIZED: { status: 401, message: "Authentication required" },
  FORBIDDEN: { status: 403, message: "Insufficient permissions" },
  NOT_FOUND: { status: 404, message: "Resource not found" },
  CONFLICT: { status: 409, message: "Resource conflict" },
  BUSINESS_RULE_VIOLATION: { status: 422, message: "Business rule violated" },
  INVALID_TRANSITION: { status: 422, message: "Invalid state transition" },
  STRIPE_NOT_CONFIGURED: { status: 503, message: "Payment service unavailable" },
  INTERNAL_ERROR: { status: 500, message: "Internal server error" },
  RATE_LIMIT_EXCEEDED: { status: 429, message: "Rate limit exceeded" },
} as const;

type SuccessStatus = 200 | 201 | 202;
type FailureStatus = 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503;

function getRequestId(c: Context): string {
  return c.get("requestId") ?? crypto.randomUUID();
}

export function success<T>(
  c: Context,
  data: T,
  status: SuccessStatus = 200,
): Response {
  return c.json(
    {
      ok: true,
      data,
      meta: {
        requestId: getRequestId(c),
      },
    },
    status,
  );
}

export function failure(
  c: Context,
  status: FailureStatus,
  code: ErrorCode,
  message: string,
  details?: ErrorDetail[],
): Response {
  return c.json(
    {
      ok: false,
      error: {
        code,
        message,
        details,
        requestId: getRequestId(c),
      },
    },
    status,
  );
}
