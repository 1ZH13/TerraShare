export type ContractStatus =
  | "draft"
  | "active"
  | "completed"
  | "cancelled";

export interface ContractTermsDto {
  summary: string;
  signedAt?: string;
  startsAt: string;
  endsAt: string;
}

export interface ContractDto {
  id: string;
  rentalRequestId: string;
  ownerId: string;
  tenantId: string;
  terms: ContractTermsDto;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContractDto {
  rentalRequestId: string;
  terms: ContractTermsDto;
}

export interface UpdateContractStatusDto {
  status: Exclude<ContractStatus, "draft">;
  reason?: string;
}
