import { describe, expect, it } from "bun:test";

import { mapStripeError } from "./stripe-errors";

describe("mapStripeError (#265)", () => {
  it("mapea resource_missing (intent inexistente) a 404, no a 500", () => {
    const err = {
      type: "StripeInvalidRequestError",
      code: "resource_missing",
      statusCode: 404,
      message: "No such payment_intent: 'pi_e2e'",
    };
    const mapped = mapStripeError(err);
    expect(mapped.status).toBe(404);
    expect(mapped.code).toBe("NOT_FOUND");
  });

  it("mapea charge_already_refunded a 422 con mensaje de negocio", () => {
    const err = {
      type: "StripeInvalidRequestError",
      code: "charge_already_refunded",
      statusCode: 400,
    };
    const mapped = mapStripeError(err);
    expect(mapped.status).toBe(422);
    expect(mapped.code).toBe("BUSINESS_RULE_VIOLATION");
    expect(mapped.message).toContain("ya fue reembolsado");
  });

  it("mapea un error de solicitud genérico (importe inválido) a 422", () => {
    const err = {
      type: "StripeInvalidRequestError",
      code: "parameter_invalid_integer",
      statusCode: 400,
      message: "Invalid amount",
    };
    const mapped = mapStripeError(err);
    expect(mapped.status).toBe(422);
    expect(mapped.code).toBe("BUSINESS_RULE_VIOLATION");
    expect(mapped.message).toContain("Invalid amount");
  });

  it("mapea un fallo de conexión a 503 upstream (reintenta), no a INTERNAL_ERROR", () => {
    const err = {
      type: "StripeConnectionError",
      message: "An error occurred with our connection to Stripe",
    };
    const mapped = mapStripeError(err);
    expect(mapped.status).toBe(503);
    expect(mapped.code).toBe("STRIPE_UPSTREAM_ERROR");
    expect(mapped.message).toContain("Reintenta");
  });

  it("mapea un 5xx del lado de Stripe (StripeAPIError) a 503 upstream", () => {
    const err = {
      type: "StripeAPIError",
      statusCode: 500,
      message: "Stripe internal error",
    };
    const mapped = mapStripeError(err);
    expect(mapped.status).toBe(503);
    expect(mapped.code).toBe("STRIPE_UPSTREAM_ERROR");
  });

  it("mapea rate limit (429) a 503 upstream", () => {
    const err = { type: "StripeRateLimitError", statusCode: 429 };
    const mapped = mapStripeError(err);
    expect(mapped.status).toBe(503);
    expect(mapped.code).toBe("STRIPE_UPSTREAM_ERROR");
  });

  it("ante un error desconocido/sin campos, cae a 422 (no 500)", () => {
    const mapped = mapStripeError(new Error("boom"));
    expect(mapped.status).toBe(422);
    expect(mapped.code).toBe("BUSINESS_RULE_VIOLATION");
  });
});
