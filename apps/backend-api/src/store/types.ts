import type { AppRole, AuthContextUser, UserStatus } from "../types";

// Re-export for consumers of store/types
export type { UserStatus } from "../types";

export type LandUse =
  | "agricultura"
  | "ganaderia"
  | "forestal"
  | "acuicultura"
  | "mixto"
  | "otro";

export type LandStatus = "draft" | "active" | "inactive";

export interface LandRecord {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  area: number;
  allowedUses: LandUse[];
  location: {
    province: string;
    district: string;
    corregimiento?: string;
    addressLine?: string;
    lat?: number;
    lng?: number;
  };
  availability: {
    availableFrom?: string;
    availableTo?: string;
  };
  priceRule: {
    currency: "USD" | "PAB";
    pricePerMonth: number;
  };
  status: LandStatus;
  createdAt: string;
  updatedAt: string;
}

export type RentalRequestStatus =
  | "draft"
  | "pending_owner"
  | "approved"
  | "rejected"
  | "cancelled"
  | "pending_payment"
  | "paid";

export interface RentalRequestRecord {
  id: string;
  landId: string;
  tenantId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  intendedUse: string;
  notes?: string;
  status: RentalRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export type ContractStatus = "draft" | "active" | "completed" | "cancelled";

export interface ContractRecord {
  id: string;
  rentalRequestId: string;
  ownerId: string;
  tenantId: string;
  terms: {
    summary: string;
    signedAt?: string;
    startsAt: string;
    endsAt: string;
  };
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

export interface PaymentRecord {
  id: string;
  rentalRequestId: string;
  contractId?: string;
  amount: number;
  currency: "USD" | "PAB";
  status: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  checkoutUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChatStatus = "active" | "archived";

export interface ChatParticipant {
  userId: string;
  role: "owner" | "tenant" | "admin";
}

export interface ChatRecord {
  id: string;
  landId?: string;
  rentalRequestId?: string;
  participants: ChatParticipant[];
  status: ChatStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface AuditEventRecord {
  id: string;
  actorId: string;
  actorRole: AppRole;
  entity:
    | "auth"
    | "user"
    | "land"
    | "rental_request"
    | "contract"
    | "payment"
    | "chat";
  action:
    | "created"
    | "updated"
    | "deleted"
    | "approved"
    | "rejected"
    | "cancelled"
    | "paid"
    | "status_changed";
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type LeadSource = "landing" | "app-web" | "admin-dashboard";

export interface LeadRecord {
  id: string;
  email: string;
  source: LeadSource;
  createdAt: string;
}

export interface InMemoryStore {
  users: Map<string, AuthContextUser>;
  lands: Map<string, LandRecord>;
  rentalRequests: Map<string, RentalRequestRecord>;
  contracts: Map<string, ContractRecord>;
  payments: Map<string, PaymentRecord>;
  chats: Map<string, ChatRecord>;
  chatMessages: Map<string, ChatMessageRecord[]>;
  auditEvents: Map<string, AuditEventRecord>;
  leads: Map<string, LeadRecord>;
}

export interface UserRecord extends AuthContextUser {
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserSummary {
  id: string;
  clerkUserId: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  profile: { fullName: string; phone?: string };
  createdAt: string;
}

export interface AdminLandSummary {
  id: string;
  ownerId: string;
  ownerEmail: string;
  title: string;
  status: LandStatus;
  createdAt: string;
}
