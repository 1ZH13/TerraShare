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
