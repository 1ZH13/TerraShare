import { getDatabase } from "../config/database";

const PROVINCES = [
  { name: "Bocas del Toro", districts: ["Bocolvas y Ranch", "Changuinola", "Isla Colón"] },
  { name: "Chiriquí", districts: ["Bugaba", "David", "Boquete", "Volcán"] },
  { name: "Coclé", districts: ["Penonomé", "Antón", "Capira", "La Pintada"] },
  { name: "Colón", districts: ["Colón", "Cristóbal", "Portobelo", "Santa Isabel"] },
  { name: "Darién", districts: ["Yaviza", "La Palma", "Chepigana", "Pinogana"] },
  { name: "Herrera", districts: ["Chitré", "Parita", "Pesé", "Ocú"] },
  { name: "Los Santos", districts: ["Guararé", "Las Tablas", "Pedasí", "Tonosí"] },
  { name: "Panamá", districts: ["Panama Centro", "Panama Este", "Panama Oeste", "San Miguelito"] },
  { name: "Veraguas", districts: ["Santiago", "Soná", "Atletico", "Calobre"] },
];

const LAND_USES = ["agricultura", "ganaderia", "forestal", "acuicultura", "mixto", "otro"];

const FIRST_NAMES = [
  "Carlos", "María", "José", "Ana", "Luis", "Rosa", "Juan", "Elena", "Pedro", "Carla",
  "Miguel", "Sofia", "Antonio", "Beatriz", "Francisco", "Isabel", "Javier", "Carmen", "Fernando", "Patricia"
];

const LAST_NAMES = [
  "García", "Rodriguez", "Martínez", "Hernández", "López", "González", "Pérez", "Sánchez", "Ramírez", "Torres"
];

const LAND_TITLES = [
  "Finca Agroforestal", "Rancho Ganadero", "Parcela", "Terreno Forestal", "Hacienda",
  "Campo de Cultivo", "Estancia", "Granja", "Predio Rural", "Lote de Tierra",
  "Finca Productiva", "Quinta", "Solar", "Hacienda Ganadera", "Finca de Cultivos"
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - randomBetween(0, daysAgo));
  return date.toISOString();
}

function randomDateFuture(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + randomBetween(1, daysAhead));
  return date.toISOString();
}

function generateUsers(count: number) {
  const users = [];
  const statuses = ["active", "inactive"];
  const roles = ["user", "admin"];
  
  for (let i = 0; i < count; i++) {
    const firstName = randomItem(FIRST_NAMES);
    const lastName = randomItem(LAST_NAMES);
    const isAdmin = i < 3;
    users.push({
      id: `user_${String(i + 1).padStart(3, "0")}`,
      clerkUserId: `user_${String(i + 1).padStart(3, "0")}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@terrashare.test`,
      role: isAdmin ? "admin" : randomItem(roles),
      status: randomItem(statuses),
      profile: {
        fullName: `${firstName} ${lastName}`,
        phone: `+507 6${randomBetween(100, 999)}-${randomBetween(1000, 9999)}`
      },
      createdAt: randomDate(365),
      updatedAt: randomDate(30),
    });
  }
  return users;
}

function generateLands(count: number, userIds: string[]) {
  const lands = [];
  const statuses = ["active", "draft", "inactive"];
  
  for (let i = 0; i < count; i++) {
    const province = randomItem(PROVINCES);
    const district = randomItem(province.districts);
    const titlePrefix = randomItem(LAND_TITLES);
    const usesCount = randomBetween(1, 3);
    const allowedUses = [];
    for (let j = 0; j < usesCount; j++) {
      const use = randomItem(LAND_USES);
      if (!allowedUses.includes(use)) allowedUses.push(use);
    }
    
    lands.push({
      id: `land_${String(i + 1).padStart(4, "0")}`,
      ownerId: randomItem(userIds.filter((_, idx) => idx >= 3)),
      title: `${titlePrefix} ${province.name}`,
      description: `Terreno fértil en ${district}, ${province.name}. Ideal para ${allowedUses.join(" y ")}.`,
      area: randomBetween(5, 500),
      allowedUses,
      location: {
        province: province.name,
        district: district,
        corregimiento: `Corregimiento ${String(i + 1).padStart(2, "0")}`,
        lat: 8 + Math.random() * 2,
        lng: -80 + Math.random() * 3,
      },
      availability: {
        availableFrom: randomDate(90),
      },
      priceRule: {
        currency: "USD",
        pricePerMonth: randomBetween(150, 2500),
      },
      status: i < count * 0.7 ? "active" : randomItem(statuses),
      createdAt: randomDate(180),
      updatedAt: randomDate(30),
    });
  }
  return lands;
}

function generateRentalRequests(count: number, landIds: string[], userIds: string[]) {
  const requests = [];
  const statuses = ["draft", "pending_owner", "approved", "rejected", "cancelled", "pending_payment", "paid"];
  
  for (let i = 0; i < count; i++) {
    const startDate = randomDateFuture(90);
    const endDate = randomDateFuture(180);
    requests.push({
      id: `rr_${String(i + 1).padStart(4, "0")}`,
      landId: randomItem(landIds),
      tenantId: randomItem(userIds.filter((_, idx) => idx >= 3)),
      period: {
        startDate,
        endDate,
      },
      intendedUse: randomItem(LAND_USES),
      notes: `Interesado en alquilar este terreno para ${randomItem(LAND_USES)}.`,
      status: randomItem(statuses),
      createdAt: randomDate(90),
      updatedAt: randomDate(30),
    });
  }
  return requests;
}

function generateContracts(count: number, requestIds: string[], userIds: string[]) {
  const contracts = [];
  const statuses = ["draft", "active", "completed", "cancelled"];
  
  for (let i = 0; i < count; i++) {
    const startDate = randomDate(90);
    const endDate = randomDateFuture(180);
    contracts.push({
      id: `contract_${String(i + 1).padStart(4, "0")}`,
      rentalRequestId: randomItem(requestIds),
      ownerId: randomItem(userIds.filter((_, idx) => idx >= 3)),
      tenantId: randomItem(userIds.filter((_, idx) => idx >= 3)),
      terms: {
        summary: `Contrato de arrendamiento por ${randomBetween(6, 24)} meses`,
        startsAt: startDate,
        endsAt: endDate,
      },
      status: randomItem(statuses),
      createdAt: randomDate(90),
      updatedAt: randomDate(30),
    });
  }
  return contracts;
}

function generatePayments(count: number, requestIds: string[]) {
  const payments = [];
  const statuses = ["pending", "processing", "paid", "failed", "cancelled"];
  
  for (let i = 0; i < count; i++) {
    payments.push({
      id: `pay_${String(i + 1).padStart(4, "0")}`,
      rentalRequestId: randomItem(requestIds),
      amount: randomBetween(200, 3000),
      currency: "USD",
      status: randomItem(statuses),
      stripeSessionId: `cs_${crypto.randomUUID()}`,
      checkoutUrl: `https://checkout.stripe.com/c/pay/cs_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: randomDate(60),
      updatedAt: randomDate(30),
    });
  }
  return payments;
}

function generateChats(count: number, landIds: string[], requestIds: string[], userIds: string[]) {
  const chats = [];
  
  for (let i = 0; i < count; i++) {
    const ownerId = randomItem(userIds.filter((_, idx) => idx >= 3));
    const tenantId = randomItem(userIds.filter((_, idx) => idx >= 3));
    chats.push({
      id: `chat_${String(i + 1).padStart(4, "0")}`,
      landId: randomItem(landIds),
      rentalRequestId: randomItem(requestIds),
      participants: [
        { userId: ownerId, role: "owner" },
        { userId: tenantId, role: "tenant" },
      ],
      status: "active",
      createdAt: randomDate(60),
      updatedAt: randomDate(30),
    });
  }
  return chats;
}

function generateChatMessages(count: number, chatIds: string[], userIds: string[]) {
  const messages = [];
  const texts = [
    "Hola, me interesa el terreno",
    "Está disponible para inmediata ocupación?",
    "Qué incluye el precio del alquiler?",
    "Tengo interés en visitarla este fin de semana",
    " Puedo agregar cultivos existente?",
    "Hay acceso a agua potable?",
    "El terreno tiene cercado?",
    "Cuántos años tiene la propiedad?",
    "Aceptan animales de ganado?",
    "Excelente lokasi, me gusta mucho"
  ];
  
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg_${String(i + 1).padStart(5, "0")}`,
      chatId: randomItem(chatIds),
      senderId: randomItem(userIds.filter((_, idx) => idx >= 3)),
      text: randomItem(texts),
      createdAt: randomDate(30),
    });
  }
  return messages;
}

function generateAuditEvents(count: number, userIds: string[], entityIds: Record<string, string[]>) {
  const events = [];
  const entities = ["auth", "user", "land", "rental_request", "contract", "payment", "chat"] as const;
  const actions = ["created", "updated", "deleted", "approved", "rejected", "cancelled", "paid", "status_changed"] as const;
  const roles = ["user", "admin"] as const;
  
  for (let i = 0; i < count; i++) {
    const entity = randomItem(entities);
    const entityList = entityIds[entity] || [];
    events.push({
      id: `audit_${String(i + 1).padStart(5, "0")}`,
      actorId: randomItem(userIds),
      actorRole: randomItem(roles),
      entity,
      action: randomItem(actions),
      entityId: randomItem(entityList),
      metadata: { note: `Action ${randomItem(actions)} on ${entity}` },
      createdAt: randomDate(90),
    });
  }
  return events;
}

function generateLeads(count: number) {
  const leads = [];
  const sources = ["landing", "app-web", "admin-dashboard"] as const;
  
  for (let i = 0; i < count; i++) {
    leads.push({
      id: `lead_${String(i + 1).padStart(4, "0")}`,
      email: `lead${i}@example.com`,
      source: randomItem(sources),
      createdAt: randomDate(60),
    });
  }
  return leads;
}

export async function seedDatabase() {
  const db = getDatabase();
  if (!db) {
    console.error("[seed] Database not connected");
    return;
  }

  console.log("[seed] Starting database seeding...");

  const users = generateUsers(20);
  const userIds = users.map(u => u.id);
  
  const lands = generateLands(50, userIds);
  const landIds = lands.map(l => l.id);
  
  const requests = generateRentalRequests(100, landIds, userIds);
  const requestIds = requests.map(r => r.id);
  
  const contracts = generateContracts(30, requestIds, userIds);
  const contractIds = contracts.map(c => c.id);
  
  const payments = generatePayments(50, requestIds);
  const paymentIds = payments.map(p => p.id);
  
  const chats = generateChats(25, landIds, requestIds, userIds);
  const chatIds = chats.map(c => c.id);
  
  const messages = generateChatMessages(200, chatIds, userIds);
  
  const entityIds: Record<string, string[]> = {
    land: landIds,
    rental_request: requestIds,
    contract: contractIds,
    payment: paymentIds,
    user: userIds,
  };
  const auditEvents = generateAuditEvents(500, userIds, entityIds);
  
  const leads = generateLeads(100);

  console.log(`[seed] Inserting ${users.length} users...`);
  await db.collection("users").insertMany(users);
  
  console.log(`[seed] Inserting ${lands.length} lands...`);
  await db.collection("lands").insertMany(lands);
  
  console.log(`[seed] Inserting ${requests.length} rental requests...`);
  await db.collection("rentalRequests").insertMany(requests);
  
  console.log(`[seed] Inserting ${contracts.length} contracts...`);
  await db.collection("contracts").insertMany(contracts);
  
  console.log(`[seed] Inserting ${payments.length} payments...`);
  await db.collection("payments").insertMany(payments);
  
  console.log(`[seed] Inserting ${chats.length} chats...`);
  await db.collection("chats").insertMany(chats);
  
  console.log(`[seed] Inserting ${messages.length} chat messages...`);
  await db.collection("chatMessages").insertMany(messages);
  
  console.log(`[seed] Inserting ${auditEvents.length} audit events...`);
  await db.collection("auditEvents").insertMany(auditEvents);
  
  console.log(`[seed] Inserting ${leads.length} leads...`);
  await db.collection("leads").insertMany(leads);

  console.log("[seed] Database seeded successfully!");
  console.log(`[seed] Total: ${users.length} users, ${lands.length} lands, ${requests.length} requests, ${contracts.length} contracts, ${payments.length} payments, ${chats.length} chats, ${messages.length} messages, ${auditEvents.length} events, ${leads.length} leads`);
}