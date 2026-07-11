import { z } from "zod";

/**
 * Captura de leads desde la landing / app / panel (#139). `source` por defecto
 * "landing"; el email se normaliza (trim + minúsculas) en el backend.
 */
export const CreateLeadSchema = z.object({
  email: z.string().email("Formato de email inválido"),
  source: z.enum(["landing", "app-web", "admin-dashboard"]).optional(),
});

export type CreateLeadInput = z.input<typeof CreateLeadSchema>;
export type CreateLeadOutput = z.output<typeof CreateLeadSchema>;
