import type { AppRole, EntityStatus } from "../types/domain";

export type UserStatus = Extract<EntityStatus, "active" | "blocked">;

export interface UserSummaryDto {
  id: string;
  clerkUserId: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  profile: {
    fullName: string;
    phone?: string;
  };
}

export type AuthMeResponseDto = UserSummaryDto;

/**
 * Perfil público de un propietario (#150). Solo datos no sensibles para la
 * tarjeta de confianza del detalle de terreno.
 */
export interface PublicOwnerProfileDto {
  id: string;
  displayName: string;
  verified: boolean;
  /** ISO date; null si no se conoce. */
  memberSince: string | null;
  activeLandsCount: number;
  averageRating?: number;
}
