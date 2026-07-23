/**
 * Deriva el mensaje que ve el usuario a partir del cuerpo de error del backend.
 *
 * El backend ya explica los fallos de validación campo a campo en
 * `error.details` («Título debe tener al menos 3 caracteres»), pero la web se
 * quedaba solo con `error.message` y mostraba el genérico en inglés «Invalid
 * request data», que no dice qué hay que corregir (#390).
 */

/** Un fallo de validación por campo, tal y como lo manda el backend. */
export interface ApiErrorDetail {
  field?: string;
  message?: string;
}

interface ApiErrorBody {
  error?: { message?: string; details?: unknown };
  message?: string;
}

export const apiErrorMessage = (
  body: unknown,
  status: number,
  statusText: string,
): string => {
  const parsed = body as ApiErrorBody | null | undefined;

  const raw = parsed?.error?.details;
  const details: ApiErrorDetail[] = Array.isArray(raw) ? (raw as ApiErrorDetail[]) : [];
  const perField = details
    .map((d) => d?.message)
    .filter((m): m is string => typeof m === "string" && m.trim().length > 0);

  // Orden de preferencia: lo más concreto primero. Si no hay detalles
  // utilizables caemos al mensaje general, y en último caso al código HTTP.
  return (
    perField.join(" · ") ||
    parsed?.error?.message ||
    parsed?.message ||
    `HTTP ${status}: ${statusText}`
  );
};
