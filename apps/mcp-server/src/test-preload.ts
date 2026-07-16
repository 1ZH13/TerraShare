// Test preload: MongoDB en memoria + siembra de terrenos para probar las tools
// de forma aislada, sin depender de un backend en marcha. (#234)
import { afterAll, beforeEach } from "bun:test";
import { MongoMemoryServer } from "mongodb-memory-server";

import { connectMongoose, disconnectMongoose } from "@backend/db/mongoose";
import { Chat, ChatMessage, Contract, Land, Lead, Payment, RentalRequest, User } from "@backend/db/schemas";

const now = new Date().toISOString();

function land(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    id: `land_${Math.random().toString(36).slice(2, 8)}`,
    ownerId: "user_seed",
    title: "Terreno de prueba",
    description: "Descripción",
    area: 10,
    allowedUses: ["agricultura"],
    location: { province: "Panama", district: "Panama" },
    availability: {},
    priceRule: { currency: "USD", pricePerMonth: 500 },
    status: "active",
    operation: "alquiler",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export const SEED_LANDS = [
  land({ id: "land_a", title: "Finca agrícola en Chiriquí", location: { province: "Chiriqui", district: "David" }, allowedUses: ["agricultura"], priceRule: { currency: "USD", pricePerMonth: 300 } }),
  land({ id: "land_b", title: "Potrero ganadero", location: { province: "Chiriqui", district: "Boquete" }, allowedUses: ["ganaderia"], priceRule: { currency: "USD", pricePerMonth: 800 }, operation: "venta", salePrice: 90000 }),
  land({ id: "land_c", title: "Parcela forestal", location: { province: "Cocle", district: "Penonome" }, allowedUses: ["forestal"], priceRule: { currency: "USD", pricePerMonth: 1200 } }),
  land({ id: "land_inactive", title: "Terreno inactivo", status: "inactive", location: { province: "Panama", district: "Panama" } }),
];

export const SEED_USERS = [
  { clerkUserId: "user_admin", email: "admin@test.com", role: "admin", status: "active", profile: { fullName: "Admin de Prueba" } },
  { clerkUserId: "user_regular", email: "user@test.com", role: "user", status: "active", profile: { fullName: "Usuario Regular" } },
  { clerkUserId: "user_blocked", email: "blocked@test.com", role: "user", status: "blocked", profile: { fullName: "Usuario Bloqueado" } },
  { clerkUserId: "user_seed", email: "seed@test.com", role: "user", status: "active", profile: { fullName: "Usuario Seed" } },
  { clerkUserId: "user_tenant_01", email: "tenant1@test.com", role: "user", status: "active", profile: { fullName: "Arrendatario Uno" } },
  { clerkUserId: "user_other", email: "other@test.com", role: "user", status: "active", profile: { fullName: "Otro Usuario" } },
];

export const SEED_RENTAL_REQUESTS = [
  {
    id: "rr_seed_01",
    landId: "land_a",
    tenantId: "user_tenant_01",
    operation: "alquiler",
    period: { startDate: now, endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() },
    intendedUse: "agricultura",
    notes: "Interesado en cultivo de hortalizas.",
    status: "pending_owner",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "rr_seed_02",
    landId: "land_b",
    tenantId: "user_tenant_02",
    operation: "venta",
    offerAmount: 85000,
    notes: "Oferta por el terreno completo.",
    status: "approved",
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_CONTRACTS = [
  {
    id: "contract_seed_01",
    rentalRequestId: "rr_seed_01",
    ownerId: "user_owner_01",
    tenantId: "user_tenant_01",
    terms: {
      summary: "Contrato de arrendamiento para cultivo de hortalizas",
      startsAt: now,
      endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    status: "draft",
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_PAYMENTS = [
  {
    id: "payment_seed_01",
    rentalRequestId: "rr_seed_01",
    amount: 300,
    currency: "USD",
    platformFeeAmount: 15,
    netAmount: 285,
    settlementCurrency: "USD",
    status: "paid",
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_CHATS = [
  {
    id: "chat_seed_01",
    landId: "land_a",
    participants: [
      { userId: "user_seed", role: "owner" },
      { userId: "user_tenant_01", role: "tenant" },
    ],
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "chat_seed_02",
    landId: "land_b",
    participants: [
      { userId: "user_admin", role: "admin" },
      { userId: "user_regular", role: "tenant" },
    ],
    status: "active",
    createdAt: now,
    updatedAt: now,
  },
];

export const SEED_CHAT_MESSAGES = [
  {
    id: "msg_seed_01",
    chatId: "chat_seed_01",
    senderId: "user_seed",
    text: "Hola, estoy interesado en el terreno.",
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: "msg_seed_02",
    chatId: "chat_seed_01",
    senderId: "user_tenant_01",
    text: "¡Hola! Sí, el terreno está disponible.",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "msg_seed_03",
    chatId: "chat_seed_01",
    senderId: "user_seed",
    text: "¿Cuál es el precio mensual?",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

export const SEED_LEADS = [
  {
    id: "lead_01",
    email: "lead1@test.com",
    source: "landing",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "lead_02",
    email: "lead2@test.com",
    source: "app-web",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "lead_dup_01",
    email: "dup@example.com",
    source: "landing",
    createdAt: new Date().toISOString(),
  },
];

const mongod = await MongoMemoryServer.create();
process.env.MONGODB_URI = `${mongod.getUri()}terrashare_mcp`;

await connectMongoose();

async function seed(): Promise<void> {
  await Land.deleteMany({});
  await Land.insertMany(SEED_LANDS.map((l) => ({ ...l })));
  await User.deleteMany({});
  await User.insertMany(SEED_USERS.map((u) => ({ ...u })));
  await RentalRequest.deleteMany({});
  await RentalRequest.insertMany(SEED_RENTAL_REQUESTS.map((r) => ({ ...r })));
  await Contract.deleteMany({});
  await Contract.insertMany(SEED_CONTRACTS.map((c) => ({ ...c })));
  await Payment.deleteMany({});
  await Payment.insertMany(SEED_PAYMENTS.map((p) => ({ ...p })));
  await Chat.deleteMany({});
  await Chat.insertMany(SEED_CHATS.map((c) => ({ ...c })));
  await ChatMessage.deleteMany({});
  await ChatMessage.insertMany(SEED_CHAT_MESSAGES.map((m) => ({ ...m })));
  await Lead.deleteMany({});
  await Lead.insertMany(SEED_LEADS.map((l) => ({ ...l })));
}

await seed();
beforeEach(seed);

afterAll(async () => {
  await disconnectMongoose();
  await mongod.stop();
});
