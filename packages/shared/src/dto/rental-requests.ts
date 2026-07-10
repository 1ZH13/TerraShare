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

export type DealOperation = "alquiler" | "venta";

export interface RentalRequestDto {
  id: string;
  landId: string;
  tenantId: string;
  operation?: DealOperation;
  period?: RentalPeriodDto;
  intendedUse?: string;
  offerAmount?: number;
  notes?: string;
  status: RentalRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRentalRequestDto {
  landId: string;
  operation?: DealOperation;
  period?: RentalPeriodDto;
  intendedUse?: string;
  offerAmount?: number;
  notes?: string;
}

export interface UpdateRentalRequestStatusDto {
  status: Exclude<RentalRequestStatus, "draft">;
  reason?: string;
}
