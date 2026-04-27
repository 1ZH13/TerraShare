import { getDatabase } from "../config/database";
import {
  User, Land, RentalRequest, Contract, Payment,
  Chat, ChatMessage, AuditEvent, Lead
} from "./schemas";

function getColl(name: string) {
  const db = getDatabase();
  if (!db) throw new Error("Database not connected");
  return db.collection(name);
}

export async function listLands(filters?: { ownerId?: string; status?: string }) {
  const coll = getColl("lands");
  const query: Record<string, unknown> = {};
  if (filters?.ownerId) query.ownerId = filters.ownerId;
  if (filters?.status) query.status = filters.status;
  return coll.find(query).toArray();
}

export async function getLandById(id: string) {
  const coll = getColl("lands");
  return coll.findOne({ id });
}

export async function createLand(data: Record<string, unknown>) {
  const coll = getColl("lands");
  const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function updateLand(id: string, data: Record<string, unknown>) {
  const coll = getColl("lands");
  const result = await coll.findOneAndUpdate(
    { id },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function deleteLand(id: string) {
  const coll = getColl("lands");
  return coll.deleteOne({ id });
}

export async function listRentalRequests(filters?: { landId?: string; tenantId?: string; status?: string }) {
  const coll = getColl("rentalRequests");
  const query: Record<string, unknown> = {};
  if (filters?.landId) query.landId = filters.landId;
  if (filters?.tenantId) query.tenantId = filters.tenantId;
  if (filters?.status) query.status = filters.status;
  return coll.find(query).toArray();
}

export async function getRentalRequestById(id: string) {
  const coll = getColl("rentalRequests");
  return coll.findOne({ id });
}

export async function createRentalRequest(data: Record<string, unknown>) {
  const coll = getColl("rentalRequests");
  const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function updateRentalRequest(id: string, data: Record<string, unknown>) {
  const coll = getColl("rentalRequests");
  const result = await coll.findOneAndUpdate(
    { id },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function listContracts(filters?: { ownerId?: string; tenantId?: string; status?: string }) {
  const coll = getColl("contracts");
  const query: Record<string, unknown> = {};
  if (filters?.ownerId) query.ownerId = filters.ownerId;
  if (filters?.tenantId) query.tenantId = filters.tenantId;
  if (filters?.status) query.status = filters.status;
  return coll.find(query).toArray();
}

export async function getContractById(id: string) {
  const coll = getColl("contracts");
  return coll.findOne({ id });
}

export async function createContract(data: Record<string, unknown>) {
  const coll = getColl("contracts");
  const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function updateContract(id: string, data: Record<string, unknown>) {
  const coll = getColl("contracts");
  const result = await coll.findOneAndUpdate(
    { id },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function listPayments(filters?: { rentalRequestId?: string; status?: string }) {
  const coll = getColl("payments");
  const query: Record<string, unknown> = {};
  if (filters?.rentalRequestId) query.rentalRequestId = filters.rentalRequestId;
  if (filters?.status) query.status = filters.status;
  return coll.find(query).toArray();
}

export async function getPaymentById(id: string) {
  const coll = getColl("payments");
  return coll.findOne({ id });
}

export async function createPayment(data: Record<string, unknown>) {
  const coll = getColl("payments");
  const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function updatePayment(id: string, data: Record<string, unknown>) {
  const coll = getColl("payments");
  const result = await coll.findOneAndUpdate(
    { id },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function listChats(filters?: { landId?: string; rentalRequestId?: string }) {
  const coll = getColl("chats");
  const query: Record<string, unknown> = {};
  if (filters?.landId) query.landId = filters.landId;
  if (filters?.rentalRequestId) query.rentalRequestId = filters.rentalRequestId;
  return coll.find(query).toArray();
}

export async function getChatById(id: string) {
  const coll = getColl("chats");
  return coll.findOne({ id });
}

export async function createChat(data: Record<string, unknown>) {
  const coll = getColl("chats");
  const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function listChatMessages(chatId: string) {
  const coll = getColl("chatMessages");
  return coll.find({ chatId }).sort({ createdAt: 1 }).toArray();
}

export async function createChatMessage(data: Record<string, unknown>) {
  const coll = getColl("chatMessages");
  const doc = { ...data, createdAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function listUsers(filters?: { role?: string; status?: string }) {
  const coll = getColl("users");
  const query: Record<string, unknown> = {};
  if (filters?.role) query.role = filters.role;
  if (filters?.status) query.status = filters.status;
  return coll.find(query).toArray();
}

export async function getUserById(id: string) {
  const coll = getColl("users");
  return coll.findOne({ id });
}

export async function getUserByClerkId(clerkUserId: string) {
  const coll = getColl("users");
  return coll.findOne({ clerkUserId });
}

export async function createUser(data: Record<string, unknown>) {
  const coll = getColl("users");
  const doc = { ...data, createdAt: new Date(), updatedAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function updateUser(id: string, data: Record<string, unknown>) {
  const coll = getColl("users");
  const result = await coll.findOneAndUpdate(
    { id },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function listLeads() {
  const coll = getColl("leads");
  return coll.find({}).toArray();
}

export async function createLead(data: Record<string, unknown>) {
  const coll = getColl("leads");
  const doc = { ...data, createdAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}

export async function listAuditEvents(filters?: { entity?: string; entityId?: string }) {
  const coll = getColl("auditEvents");
  const query: Record<string, unknown> = {};
  if (filters?.entity) query.entity = filters.entity;
  if (filters?.entityId) query.entityId = filters.entityId;
  return coll.find(query).sort({ createdAt: -1 }).toArray();
}

export async function createAuditEvent(data: Record<string, unknown>) {
  const coll = getColl("auditEvents");
  const doc = { ...data, createdAt: new Date() };
  await coll.insertOne(doc);
  return doc;
}