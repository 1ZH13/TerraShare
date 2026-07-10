import mongoose, { Schema, Document } from "mongoose";

export type LandUse = "agricultura" | "ganaderia" | "forestal" | "acuicultura" | "mixto" | "otro";
export type LandStatus = "draft" | "active" | "inactive";
export type LandOperation = "alquiler" | "venta" | "ambas";
export type RentalRequestStatus = "draft" | "pending_owner" | "approved" | "rejected" | "cancelled" | "pending_payment" | "paid";
export type ContractStatus = "draft" | "active" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "cancelled";
export type ChatStatus = "active" | "archived";
export type LeadSource = "landing" | "app-web" | "admin-dashboard";
export type UserStatus = "active" | "blocked";
export type AppRole = "user" | "admin";

export interface IUser extends Document {
  clerkUserId: string;
  email: string;
  role: AppRole;
  status: UserStatus;
  profile: { fullName: string; phone?: string; province?: string; marketPreference?: "busco" | "ofrezco" };
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILand extends Document {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  area: number;
  allowedUses: LandUse[];
  photos?: string[];
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
  operation: LandOperation;
  salePrice?: number;
  water?: string;
  access?: string;
  features?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IRentalRequest extends Document {
  id: string;
  landId: string;
  tenantId: string;
  operation: "alquiler" | "venta";
  period?: {
    startDate: string;
    endDate: string;
  };
  intendedUse?: string;
  offerAmount?: number;
  notes?: string;
  status: RentalRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContract extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IPayment extends Document {
  id: string;
  rentalRequestId: string;
  contractId?: string;
  amount: number;
  currency: "USD" | "PAB";
  status: PaymentStatus;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  checkoutUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatParticipant {
  userId: string;
  role: "owner" | "tenant" | "admin";
}

export interface IChat extends Document {
  id: string;
  landId?: string;
  rentalRequestId?: string;
  participants: IChatParticipant[];
  status: ChatStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IChatMessage extends Document {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Date;
}

export interface IAuditEvent extends Document {
  id: string;
  actorId: string;
  actorRole: AppRole;
  entity: "auth" | "user" | "land" | "rental_request" | "contract" | "payment" | "chat";
  action: "created" | "updated" | "deleted" | "approved" | "rejected" | "cancelled" | "paid" | "status_changed";
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ILead extends Document {
  id: string;
  email: string;
  source: LeadSource;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  clerkUserId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  status: { type: String, enum: ["active", "blocked"], default: "active" },
  profile: {
    fullName: { type: String, required: true },
    phone: String,
    province: String,
    marketPreference: { type: String, enum: ["busco", "ofrezco"] },
  },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

const LandSchema = new Schema<ILand>({
  id: { type: String, required: true, unique: true },
  ownerId: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  area: { type: Number, required: true },
  allowedUses: [{ type: String, enum: ["agricultura", "ganaderia", "forestal", "acuicultura", "mixto", "otro"] }],
  photos: [String],
  location: {
    province: { type: String, required: true },
    district: { type: String, required: true },
    corregimiento: String,
    addressLine: String,
    lat: Number,
    lng: Number,
  },
  availability: {
    availableFrom: String,
    availableTo: String,
  },
  priceRule: {
    currency: { type: String, enum: ["USD", "PAB"], default: "USD" },
    pricePerMonth: { type: Number, required: true },
  },
  status: { type: String, enum: ["draft", "active", "inactive"], default: "active" },
  operation: { type: String, enum: ["alquiler", "venta", "ambas"], default: "alquiler" },
  salePrice: Number,
  water: String,
  access: String,
  features: [String],
}, { timestamps: true });

LandSchema.index({ title: "text", description: "text" });
LandSchema.index({ "location.lat": 1, "location.lng": 1 });

const RentalRequestSchema = new Schema<IRentalRequest>({
  id: { type: String, required: true, unique: true },
  landId: { type: String, required: true },
  tenantId: { type: String, required: true },
  // Tipo de trato: alquiler (07) o compra/venta (28). Por defecto alquiler para
  // compatibilidad con las solicitudes existentes (#249).
  operation: { type: String, enum: ["alquiler", "venta"], default: "alquiler" },
  // period/intendedUse solo aplican al alquiler; offerAmount solo a la compra.
  period: {
    startDate: { type: String },
    endDate: { type: String },
  },
  intendedUse: { type: String },
  offerAmount: { type: Number },
  notes: String,
  status: { type: String, enum: ["draft", "pending_owner", "approved", "rejected", "cancelled", "pending_payment", "paid"], default: "draft" },
}, { timestamps: true });

const ContractSchema = new Schema<IContract>({
  id: { type: String, required: true, unique: true },
  rentalRequestId: { type: String, required: true },
  ownerId: { type: String, required: true },
  tenantId: { type: String, required: true },
  terms: {
    summary: { type: String, required: true },
    signedAt: String,
    startsAt: { type: String, required: true },
    endsAt: { type: String, required: true },
  },
  status: { type: String, enum: ["draft", "active", "completed", "cancelled"], default: "draft" },
}, { timestamps: true });

const PaymentSchema = new Schema<IPayment>({
  id: { type: String, required: true, unique: true },
  rentalRequestId: { type: String, required: true },
  contractId: String,
  amount: { type: Number, required: true },
  currency: { type: String, enum: ["USD", "PAB"], default: "USD" },
  status: { type: String, enum: ["pending", "processing", "paid", "failed", "cancelled"], default: "pending" },
  stripeSessionId: String,
  stripePaymentIntentId: String,
  checkoutUrl: String,
}, { timestamps: true });

const ChatSchema = new Schema<IChat>({
  id: { type: String, required: true, unique: true },
  landId: String,
  rentalRequestId: String,
  participants: [{
    userId: { type: String, required: true },
    role: { type: String, enum: ["owner", "tenant", "admin"], required: true },
  }],
  status: { type: String, enum: ["active", "archived"], default: "active" },
}, { timestamps: true });

const ChatMessageSchema = new Schema<IChatMessage>({
  id: { type: String, required: true, unique: true },
  chatId: { type: String, required: true },
  senderId: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const AuditEventSchema = new Schema<IAuditEvent>({
  id: { type: String, required: true, unique: true },
  actorId: { type: String, required: true },
  actorRole: { type: String, enum: ["user", "admin"], required: true },
  entity: { type: String, enum: ["auth", "user", "land", "rental_request", "contract", "payment", "chat"], required: true },
  action: { type: String, enum: ["created", "updated", "deleted", "approved", "rejected", "cancelled", "paid", "status_changed"], required: true },
  entityId: { type: String, required: true },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

const LeadSchema = new Schema<ILead>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  source: { type: String, enum: ["landing", "app-web", "admin-dashboard"], required: true },
}, { timestamps: true });

// Índices secundarios (antes vivían en el driver nativo config/database.ts; se
// migran aquí para que Mongoose sea la única fuente de índices — #135 A-1/A-6).
LandSchema.index({ ownerId: 1 });
LandSchema.index({ status: 1 });
RentalRequestSchema.index({ landId: 1 });
RentalRequestSchema.index({ tenantId: 1 });
RentalRequestSchema.index({ status: 1 });
ContractSchema.index({ ownerId: 1 });
ContractSchema.index({ tenantId: 1 });
PaymentSchema.index({ rentalRequestId: 1 });
ChatSchema.index({ landId: 1 });
ChatMessageSchema.index({ chatId: 1, createdAt: 1 });
AuditEventSchema.index({ entity: 1, entityId: 1 });
LeadSchema.index({ email: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
export const Land = mongoose.model<ILand>("Land", LandSchema);
export const RentalRequest = mongoose.model<IRentalRequest>("RentalRequest", RentalRequestSchema);
export const Contract = mongoose.model<IContract>("Contract", ContractSchema);
export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
export const Chat = mongoose.model<IChat>("Chat", ChatSchema);
export const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);
export const AuditEvent = mongoose.model<IAuditEvent>("AuditEvent", AuditEventSchema);
export const Lead = mongoose.model<ILead>("Lead", LeadSchema);