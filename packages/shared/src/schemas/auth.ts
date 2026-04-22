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
