import type { Context } from "hono";
import type { z } from "@terrashare/shared";

import { failure } from "./api-response";

/**
 * Validación de payloads con los schemas Zod compartidos de
 * `@terrashare/shared` (#139).
 *
 * Antes cada endpoint validaba a mano (`if (!body.x)`), con mensajes y códigos
 * dispares y huecos (p. ej. un body no-JSON caía al handler y devolvía 500 en
 * vez de 400). Este helper centraliza la validación: un fallo produce siempre
 * `400 VALIDATION_ERROR` con detalle por campo.
 *
 * Importante: varios endpoints aceptan campos que aún no viven en el schema
 * compartido (p. ej. `operation`/`salePrice` en terrenos). Por eso el resultado
 * expone tanto `data` (parseado y coaccionado, útil para filtros y campos
 * tipados) como `raw` (el cuerpo original), para que el handler pueda conservar
 * esos campos extra sin que Zod los descarte.
 */

interface ValidationDetail {
  field: string;
  message: string;
}

function toDetails(error: z.ZodError): ValidationDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    message: issue.message,
  }));
}

type ValidationResult<T> =
  | { success: true; data: T; raw: unknown }
  | { success: false; response: Response };

/** Valida un valor ya disponible (p. ej. query params) contra un schema. */
export function validate<S extends z.ZodTypeAny>(
  c: Context,
  schema: S,
  value: unknown,
): ValidationResult<z.output<S>> {
  const result = schema.safeParse(value);
  if (!result.success) {
    return {
      success: false,
      response: failure(c, 400, "VALIDATION_ERROR", "Invalid request data", toDetails(result.error)),
    };
  }
  return { success: true, data: result.data, raw: value };
}

/**
 * Lee el cuerpo JSON de la petición y lo valida. Un cuerpo ausente o no-JSON se
 * trata como `null` y produce un 400 con detalle (nunca un 500).
 */
export async function validateBody<S extends z.ZodTypeAny>(
  c: Context,
  schema: S,
): Promise<ValidationResult<z.output<S>>> {
  const raw = await c.req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      success: false,
      response: failure(c, 400, "VALIDATION_ERROR", "Invalid request data", toDetails(result.error)),
    };
  }
  return { success: true, data: result.data, raw };
}
