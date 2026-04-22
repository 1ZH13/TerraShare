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
  | "INTERNAL_ERROR";

type SuccessStatus = 200 | 201 | 202;
type FailureStatus = 400 | 401 | 403 | 404 | 409 | 422 | 500;

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
