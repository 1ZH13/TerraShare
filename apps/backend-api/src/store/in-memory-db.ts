import type {
  AdminUserSummary,
  AuditEventRecord,
  ChatRecord,
  ChatMessageRecord,
  ContractRecord,
  InMemoryStore,
  LandRecord,
  LeadRecord,
  PaymentRecord,
  RentalRequestRecord,
  UserRecord,
} from "./types";

const store: InMemoryStore = {
  users: new Map(),
  lands: new Map(),
  rentalRequests: new Map(),
  contracts: new Map(),
  payments: new Map(),
  chats: new Map(),
  chatMessages: new Map(),
  auditEvents: new Map(),
  leads: new Map(),
};

const now = new Date().toISOString();

// Seed users — mirrors Clerk identities for dev/admin flows
const seedUsers: UserRecord[] = [
  {
    id: "user_owner_01",
    clerkUserId: "user_owner_01",
    email: "owner@terrashare.test",
    role: "user",
    status: "active",
    profile: { fullName: "Propietario Demo" },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user_owner_02",
    clerkUserId: "user_owner_02",
    email: "owner2@terrashare.test",
    role: "user",
    status: "active",
    profile: { fullName: "Propietario Dos" },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user_tenant_01",
    clerkUserId: "user_tenant_01",
    email: "tenant@terrashare.test",
    role: "user",
    status: "active",
    profile: { fullName: "Arrendatario Demo" },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user_tenant_99",
    clerkUserId: "user_tenant_99",
    email: "tenant99@terrashare.test",
    role: "user",
    status: "active",
    profile: { fullName: "Arrendatario Test" },
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "user_admin_01",
    clerkUserId: "user_admin_01",
    email: "admin@terrashare.test",
    role: "admin",
    status: "active",
    profile: { fullName: "Administrador" },
    createdAt: now,
    updatedAt: now,
  },
];

for (const user of seedUsers) {
  store.users.set(user.id, user);
}

const seedLandA: LandRecord = {
  id: "land_seed_01",
  ownerId: "user_owner_01",
  title: "Finca para agricultura en Chiriqui",
  description: "Terreno con acceso a agua y via principal.",
  area: 150,
  allowedUses: ["agricultura", "mixto"],
  location: {
    province: "Chiriqui",
    district: "David",
    corregimiento: "San Pablo Nuevo",
  },
  availability: {
    availableFrom: now,
  },
  priceRule: {
    currency: "USD",
    pricePerMonth: 850,
  },
  status: "active",
  createdAt: now,
  updatedAt: now,
};

const seedLandB: LandRecord = {
  id: "land_seed_02",
  ownerId: "user_owner_02",
  title: "Terreno ganadero en Cocle",
  description: "Zona apta para pastoreo.",
  area: 220,
  allowedUses: ["ganaderia"],
  location: {
    province: "Cocle",
    district: "Penonome",
  },
  availability: {
    availableFrom: now,
  },
  priceRule: {
    currency: "USD",
    pricePerMonth: 1200,
  },
  status: "active",
  createdAt: now,
  updatedAt: now,
};

store.lands.set(seedLandA.id, seedLandA);
store.lands.set(seedLandB.id, seedLandB);

const seedRequest: RentalRequestRecord = {
  id: "rr_seed_01",
  landId: seedLandA.id,
  tenantId: "user_tenant_01",
  period: {
    startDate: now,
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString(),
  },
  intendedUse: "agricultura",
  notes: "Interesado en cultivo de hortalizas.",
  status: "pending_owner",
  createdAt: now,
  updatedAt: now,
};

store.rentalRequests.set(seedRequest.id, seedRequest);

const seedChat: ChatRecord = {
  id: "chat_seed_01",
  landId: seedLandA.id,
  rentalRequestId: seedRequest.id,
  participants: [
    { userId: "user_owner_01", role: "owner" },
    { userId: "user_tenant_01", role: "tenant" },
  ],
  status: "active",
  createdAt: now,
  updatedAt: now,
};

store.chats.set(seedChat.id, seedChat);

const seedMessage: ChatMessageRecord = {
  id: "msg_seed_01",
  chatId: seedChat.id,
  senderId: "user_tenant_01",
  text: "Hola, me interesa este terreno.",
  createdAt: now,
};

store.chatMessages.set(seedChat.id, [seedMessage]);

const seedAudit: AuditEventRecord = {
  id: "audit_seed_01",
  actorId: "system",
  actorRole: "admin",
  entity: "land",
  action: "created",
  entityId: seedLandA.id,
  metadata: { seeded: true },
  createdAt: now,
};

store.auditEvents.set(seedAudit.id, seedAudit);

const seedPayment: PaymentRecord = {
  id: "pay_seed_01",
  rentalRequestId: seedRequest.id,
  amount: 850,
  currency: "USD",
  status: "pending",
  stripeSessionId: "cs_seed_01",
  checkoutUrl: "https://checkout.stripe.com/c/pay/cs_seed_01",
  createdAt: now,
  updatedAt: now,
};

store.payments.set(seedPayment.id, seedPayment);

const seedContract: ContractRecord = {
  id: "contract_seed_01",
  rentalRequestId: seedRequest.id,
  ownerId: "user_owner_01",
  tenantId: "user_tenant_01",
  terms: {
    summary: "Contrato semestral de arrendamiento",
    startsAt: now,
    endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(),
  },
  status: "draft",
  createdAt: now,
  updatedAt: now,
};

store.contracts.set(seedContract.id, seedContract);

export function getStore() {
  return store;
}

export function resetStore() {
  // Reset rr_seed_01 to its initial pending_owner state for test isolation.
  // Payments.test.ts approves it, which blocks rental-requests.test.ts from
  // approving it again (overlapping dates check in POST /rental-requests).
  const req = store.rentalRequests.get("rr_seed_01");
  if (req) {
    req.status = "pending_owner";
    req.updatedAt = new Date().toISOString();
  }
}
