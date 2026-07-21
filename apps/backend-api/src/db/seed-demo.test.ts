import { describe, expect, it } from "bun:test";

import { buildDemoData } from "./seed-demo";

/**
 * El valor del seed de demostración está en la **coherencia** del grafo: si un
 * contrato apunta a un dueño que no es el del terreno, la app muestra datos que
 * ningún flujo real podría producir y deja de servir para depurar pantallas
 * vacías. Estas pruebas fijan esas invariantes sobre la estructura generada
 * (`buildDemoData` es pura: no toca Mongo).
 */

const data = buildDemoData();

const landById = new Map(data.lands.map((l) => [l.id as string, l]));
const requestById = new Map(data.requests.map((r) => [r.id as string, r]));
const contractById = new Map(data.contracts.map((c) => [c.id as string, c]));
const userIds = new Set(data.users.map((u) => u.clerkUserId as string));

describe("seed de demostración — integridad referencial", () => {
  it("todos los terrenos pertenecen a un usuario sembrado", () => {
    for (const land of data.lands) {
      expect(userIds.has(land.ownerId as string)).toBe(true);
    }
  });

  it("cada solicitud apunta a un terreno y a un solicitante existentes", () => {
    for (const req of data.requests) {
      expect(landById.has(req.landId as string)).toBe(true);
      expect(userIds.has(req.tenantId as string)).toBe(true);
    }
  });

  it("nadie se solicita su propio terreno", () => {
    for (const req of data.requests) {
      const land = landById.get(req.landId as string)!;
      expect(req.tenantId).not.toBe(land.ownerId);
    }
  });

  it("el dueño y el solicitante de cada contrato salen de su solicitud y su terreno", () => {
    for (const contract of data.contracts) {
      const req = requestById.get(contract.rentalRequestId as string);
      expect(req).toBeDefined();
      const land = landById.get(req!.landId as string)!;
      expect(contract.ownerId).toBe(land.ownerId);
      expect(contract.tenantId).toBe(req!.tenantId);
    }
  });

  it("cada pago cuelga de una solicitud existente y, si tiene contrato, de uno real", () => {
    for (const payment of data.payments) {
      expect(requestById.has(payment.rentalRequestId as string)).toBe(true);
      if (payment.contractId) {
        const contract = contractById.get(payment.contractId as string)!;
        expect(contract).toBeDefined();
        // El pago y su contrato deben referirse a la misma solicitud.
        expect(contract.rentalRequestId).toBe(payment.rentalRequestId);
      }
    }
  });

  it("los participantes de cada chat son el dueño del terreno y el solicitante", () => {
    for (const chat of data.chats) {
      const land = landById.get(chat.landId as string)!;
      const req = requestById.get(chat.rentalRequestId as string)!;
      const participants = chat.participants as { userId: string; role: string }[];
      const owner = participants.find((p) => p.role === "owner")!;
      const tenant = participants.find((p) => p.role === "tenant")!;
      expect(owner.userId).toBe(land.ownerId as string);
      expect(tenant.userId).toBe(req.tenantId as string);
    }
  });

  it("cada mensaje pertenece a un chat y lo escribe uno de sus participantes", () => {
    const chatById = new Map(data.chats.map((c) => [c.id as string, c]));
    for (const msg of data.messages) {
      const chat = chatById.get(msg.chatId as string);
      expect(chat).toBeDefined();
      const participantIds = (chat!.participants as { userId: string }[]).map((p) => p.userId);
      expect(participantIds).toContain(msg.senderId as string);
    }
  });

  it("las reseñas cuelgan de contratos reales, entre sus dos partes y sin autorreseñas", () => {
    for (const review of data.reviews) {
      const contract = contractById.get(review.contractId as string);
      expect(contract).toBeDefined();
      expect(review.senderId).not.toBe(review.receiverId);
      const parties = [contract!.ownerId, contract!.tenantId];
      expect(parties).toContain(review.senderId as string);
      expect(parties).toContain(review.receiverId as string);
      expect(review.rating as number).toBeGreaterThanOrEqual(1);
      expect(review.rating as number).toBeLessThanOrEqual(5);
    }
  });

  it("no hay dos reseñas del mismo autor sobre el mismo contrato (índice único)", () => {
    const keys = data.reviews.map((r) => `${r.contractId}|${r.senderId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("cada visita enlaza un terreno con su dueño real y un solicitante distinto", () => {
    for (const visit of data.visits) {
      const land = landById.get(visit.landId as string)!;
      expect(land).toBeDefined();
      expect(visit.ownerId).toBe(land.ownerId as string);
      expect(visit.tenantId).not.toBe(visit.ownerId);
    }
  });

  it("los favoritos son de terrenos ajenos y no se repiten (índice único)", () => {
    for (const fav of data.favorites) {
      const land = landById.get(fav.landId as string)!;
      expect(land).toBeDefined();
      expect(fav.userId).not.toBe(land.ownerId);
    }
    const keys = data.favorites.map((f) => `${f.userId}|${f.landId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("los reportes apuntan a entidades existentes del tipo que declaran", () => {
    const chatIds = new Set(data.chats.map((c) => c.id as string));
    for (const report of data.reports) {
      const target = report.targetId as string;
      if (report.targetType === "land") expect(landById.has(target)).toBe(true);
      if (report.targetType === "user") expect(userIds.has(target)).toBe(true);
      if (report.targetType === "chat") expect(chatIds.has(target)).toBe(true);
    }
  });

  it("los identificadores son únicos en cada colección", () => {
    const withIds: [string, Record<string, unknown>[]][] = [
      ["lands", data.lands], ["requests", data.requests], ["contracts", data.contracts],
      ["payments", data.payments], ["chats", data.chats], ["messages", data.messages],
      ["reports", data.reports], ["reviews", data.reviews], ["savedSearches", data.savedSearches],
      ["visits", data.visits], ["notifications", data.notifications],
      ["auditEvents", data.auditEvents], ["leads", data.leads],
    ];
    for (const [name, docs] of withIds) {
      const ids = docs.map((d) => d.id as string);
      expect(`${name}:${new Set(ids).size}`).toBe(`${name}:${ids.length}`);
    }
    const clerkIds = data.users.map((u) => u.clerkUserId as string);
    expect(new Set(clerkIds).size).toBe(clerkIds.length);
  });
});

describe("seed de demostración — cobertura de estados", () => {
  const distinct = (docs: Record<string, unknown>[], field: string) =>
    new Set(docs.map((d) => d[field] as string));

  it("cubre los siete estados de solicitud", () => {
    const statuses = distinct(data.requests, "status");
    for (const s of ["draft", "pending_owner", "approved", "rejected", "cancelled", "pending_payment", "paid"]) {
      expect([...statuses]).toContain(s);
    }
  });

  it("cubre los cuatro estados de contrato", () => {
    const statuses = distinct(data.contracts, "status");
    for (const s of ["draft", "active", "completed", "cancelled"]) {
      expect([...statuses]).toContain(s);
    }
  });

  it("cubre los estados de pago relevantes, incluidos los reembolsos", () => {
    const statuses = distinct(data.payments, "status");
    for (const s of ["pending", "processing", "paid", "failed", "cancelled", "refunded", "partially_refunded"]) {
      expect([...statuses]).toContain(s);
    }
  });

  it("cubre los cuatro estados de visita", () => {
    const statuses = distinct(data.visits, "status");
    for (const s of ["pending", "confirmed", "rescheduled", "rejected"]) {
      expect([...statuses]).toContain(s);
    }
  });

  it("cubre los cuatro estados de reporte", () => {
    const statuses = distinct(data.reports, "status");
    for (const s of ["open", "reviewing", "resolved", "dismissed"]) {
      expect([...statuses]).toContain(s);
    }
  });

  it("cubre los tres estados de publicación de terreno", () => {
    const statuses = distinct(data.lands, "status");
    for (const s of ["draft", "active", "inactive"]) {
      expect([...statuses]).toContain(s);
    }
  });

  it("hay terrenos de alquiler, de venta y de ambas operaciones", () => {
    const operations = distinct(data.lands, "operation");
    for (const o of ["alquiler", "venta", "ambas"]) {
      expect([...operations]).toContain(o);
    }
  });
});

describe("seed de demostración — la cuenta principal juega los dos papeles", () => {
  const MAIN = process.env.SEED_MAIN_CLERK_ID || "user_3G7OsFKNNfMXJ85lEbqEwqZJvQi";

  it("es dueña de varios terrenos publicados", () => {
    const own = data.lands.filter((l) => l.ownerId === MAIN);
    expect(own.length).toBeGreaterThanOrEqual(4);
    expect(own.some((l) => l.status === "active")).toBe(true);
  });

  it("es solicitante en varias solicitudes y recibe otras tantas", () => {
    const asTenant = data.requests.filter((r) => r.tenantId === MAIN);
    const ownLandIds = new Set(data.lands.filter((l) => l.ownerId === MAIN).map((l) => l.id as string));
    const asOwner = data.requests.filter((r) => ownLandIds.has(r.landId as string));
    expect(asTenant.length).toBeGreaterThanOrEqual(3);
    expect(asOwner.length).toBeGreaterThanOrEqual(3);
  });

  it("participa en contratos por ambos lados", () => {
    expect(data.contracts.some((c) => c.tenantId === MAIN)).toBe(true);
    expect(data.contracts.some((c) => c.ownerId === MAIN)).toBe(true);
  });

  it("tiene visitas propuestas y visitas recibidas", () => {
    expect(data.visits.some((v) => v.tenantId === MAIN)).toBe(true);
    expect(data.visits.some((v) => v.ownerId === MAIN)).toBe(true);
  });

  it("tiene favoritos, búsquedas guardadas y notificaciones sin leer", () => {
    expect(data.favorites.filter((f) => f.userId === MAIN).length).toBeGreaterThan(0);
    expect(data.savedSearches.filter((s) => s.userId === MAIN).length).toBeGreaterThan(0);
    expect(data.notifications.filter((n) => n.userId === MAIN && n.read === false).length).toBeGreaterThan(0);
  });

  it("ha recibido reseñas, para que su perfil público muestre calificación", () => {
    expect(data.reviews.filter((r) => r.receiverId === MAIN).length).toBeGreaterThan(0);
  });
});
