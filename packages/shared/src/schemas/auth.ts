import { z } from "zod";
import type { AppRole, EntityStatus } from "../types/domain";

export const UserStatusSchema = z.enum(["active", "blocked"]);

export const UserSummarySchema = z.object({
  id: z.string().min(1),
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["user", "admin"]) as z.ZodType<AppRole>,
  status: UserStatusSchema,
  profile: z.object({
    fullName: z.string().min(1),
    phone: z.string().optional(),
  }),
});

export type UserSummaryInput = z.input<typeof UserSummarySchema>;
export type UserSummaryOutput = z.output<typeof UserSummarySchema>;

/**
 * Actualización parcial de perfil (`PATCH /auth/profile`). Todos los campos son
 * opcionales pero se exige al menos uno para evitar peticiones vacías.
 */
export const UpdateProfileSchema = z
  .object({
    fullName: z.string().min(1).optional(),
    phone: z.string().optional(),
    province: z.string().optional(),
    marketPreference: z.enum(["busco", "ofrezco"]).optional(),
  })
  .refine(
    (data) =>
      data.fullName !== undefined ||
      data.phone !== undefined ||
      data.province !== undefined ||
      data.marketPreference !== undefined,
    { message: "Provide fullName, phone, province and/or marketPreference" },
  );

export type UpdateProfileInput = z.input<typeof UpdateProfileSchema>;
export type UpdateProfileOutput = z.output<typeof UpdateProfileSchema>;
