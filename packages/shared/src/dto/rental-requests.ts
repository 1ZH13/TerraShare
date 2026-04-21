export type RentalRequestStatus =
  | "draft"
  | "pending_owner"
  | "approved"
  | "rejected"
  | "cancelled"
  | "pending_payment"
  | "paid";

export interface RentalPeriodDto {
  startDate: string;
  endDate: string;
}

export interface RentalRequestDto {
  id: string;
  landId: string;
  tenantId: string;
  period: RentalPeriodDto;
  intendedUse: string;
  notes?: string;
  status: RentalRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRentalRequestDto {
  landId: string;
  period: RentalPeriodDto;
  intendedUse: string;
  notes?: string;
}

export interface UpdateRentalRequestStatusDto {
  status: Exclude<RentalRequestStatus, "draft">;
  reason?: string;
}
