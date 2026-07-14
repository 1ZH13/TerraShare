import { beforeEach, describe, expect, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import mongoose from "@backend/db/mongoose";
import { Payment, RentalRequest } from "@backend/db/schemas";
import type { ActingUser } from "./context";
import { createServer } from "./server";

/**
 * E2E de la fundación (#234): un cliente MCP real se conecta al servidor,
 * lista las tools y llama a search_lands contra MongoDB (sembrada en el preload).
 */
async function connectedClient(actingUser: ActingUser | null = null): Promise<Client> {
  const server = createServer({ actingUser });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

/** Usuario normal (rol `user`, activo) — dueño/arrendatario según la tool. */
const TENANT_USER: ActingUser = {
  id: "user_regular",
  clerkUserId: "user_regular",
  email: "user@test.com",
  role: "user",
  status: "active",
  profile: { fullName: "Usuario Regular" },
};

/** Administrador de prueba (rol admin). */
const ADMIN_USER: ActingUser = {
  id: "user_admin",
  clerkUserId: "user_admin",
  email: "admin@test.com",
  role: "admin",
  status: "active",
  profile: { fullName: "Admin de Prueba" },
};

// El preload no toca RentalRequest/Payment → sembramos en el hook (no en el
// cuerpo del test) una solicitud pagable y un pago pagado para las tools.
beforeEach(async () => {
  await RentalRequest.deleteMany({});
  await Payment.deleteMany({});
  await mongoose.connection.db!.collection("rentalrequests").insertOne({
    id: "rr_e2e",
    landId: "land_a",
    tenantId: "user_regular",
    operation: "alquiler",
    status: "approved",
  });
  await mongoose.connection.db!.collection("payments").insertOne({
    id: "pay_e2e",
    rentalRequestId: "rr_e2e",
    amount: 300,
    currency: "USD",
    status: "paid",
    refundedAmount: 0,
    refunds: [],
  });
});

describe("MCP server E2E (#234)", () => {
  it("un cliente MCP lista las tools e incluye search_lands", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("search_lands");
    await client.close();
  });

  it("llamar search_lands devuelve terrenos activos desde MongoDB", async () => {
    const client = await connectedClient();
    const res = await client.callTool({ name: "search_lands", arguments: { province: "Chiriqui" } });
    const structured = res.structuredContent as { items: unknown[]; pagination: { totalItems: number } };
    expect(structured.pagination.totalItems).toBe(2);
    expect(structured.items.length).toBe(2);
    await client.close();
  });

  it("search_lands valida la entrada (pageSize fuera de rango -> error)", async () => {
    const client = await connectedClient();
    const res = await client.callTool({ name: "search_lands", arguments: { pageSize: 9999 } });
    // El SDK marca isError cuando la validación de entrada falla.
    expect(res.isError).toBe(true);
    await client.close();
  });

  it("la lista de tools incluye create_land (HU-65 #182)", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("create_land");
    await client.close();
  });

  it("create_land crea un terreno en draft a nombre del usuario que actúa", async () => {
    const client = await connectedClient(TENANT_USER);
    const res = await client.callTool({
      name: "create_land",
      arguments: {
        title: "Finca de prueba E2E",
        area: 5000,
        allowedUses: ["agricultura"],
        location: { province: "Cocle", district: "Penonome" },
        priceRule: { currency: "USD", pricePerMonth: 600 },
      },
    });
    const land = res.structuredContent as { id: string; ownerId: string; status: string };
    expect(res.isError).toBeFalsy();
    expect(land.id).toMatch(/^land_/);
    expect(land.ownerId).toBe("user_regular");
    expect(land.status).toBe("draft");
    await client.close();
  });

  it("create_land sin identidad configurada devuelve error (requires user)", async () => {
    const client = await connectedClient(null);
    const res = await client.callTool({
      name: "create_land",
      arguments: {
        title: "No debería crearse",
        area: 5000,
        allowedUses: ["agricultura"],
        location: { province: "Cocle", district: "Penonome" },
        priceRule: { currency: "USD", pricePerMonth: 600 },
      },
    });
    expect(res.isError).toBe(true);
    await client.close();
  });

  it("create_land valida la entrada (título corto -> error)", async () => {
    const client = await connectedClient(TENANT_USER);
    const res = await client.callTool({
      name: "create_land",
      arguments: {
        title: "ab",
        area: 5000,
        allowedUses: ["agricultura"],
        location: { province: "Cocle", district: "Penonome" },
        priceRule: { currency: "USD", pricePerMonth: 600 },
      },
    });
    expect(res.isError).toBe(true);
    await client.close();
  });

  it("la lista de tools incluye create_payment_session (HU-77 #194)", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("create_payment_session");
    await client.close();
  });

  it("create_payment_session devuelve un checkoutUrl para el arrendatario", async () => {
    const client = await connectedClient(TENANT_USER);
    const res = await client.callTool({
      name: "create_payment_session",
      arguments: {
        rentalRequestId: "rr_e2e",
        currency: "USD",
        successUrl: "https://ok.test/return",
        cancelUrl: "https://cancel.test/return",
      },
    });
    const payment = res.structuredContent as { paymentId: string; checkoutUrl: string; status: string };
    expect(res.isError).toBeFalsy();
    expect(payment.paymentId).toMatch(/^pay_/);
    expect(payment.checkoutUrl).toBe("https://ok.test/return");
    expect(payment.status).toBe("pending");
    await client.close();
  });

  it("create_payment_session sin identidad configurada devuelve error (requires user)", async () => {
    const client = await connectedClient(null);
    const res = await client.callTool({
      name: "create_payment_session",
      arguments: {
        rentalRequestId: "rr_e2e",
        currency: "USD",
        successUrl: "https://ok.test/return",
        cancelUrl: "https://cancel.test/return",
      },
    });
    expect(res.isError).toBe(true);
    await client.close();
  });

  it("la lista de tools incluye refund_payment (HU-80 #197)", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toContain("refund_payment");
    await client.close();
  });

  it("refund_payment reembolsa un pago pagado para un admin", async () => {
    const client = await connectedClient(ADMIN_USER);
    const res = await client.callTool({
      name: "refund_payment",
      arguments: { paymentId: "pay_e2e", amount: 100, reason: "e2e", confirm: true },
    });
    const payment = res.structuredContent as { paymentId: string; status: string; refundedAmount: number };
    expect(res.isError).toBeFalsy();
    expect(payment.paymentId).toBe("pay_e2e");
    expect(payment.status).toBe("partially_refunded");
    expect(payment.refundedAmount).toBe(100);
    await client.close();
  });

  it("refund_payment rechaza a un usuario no admin (requires admin)", async () => {
    const client = await connectedClient(TENANT_USER);
    const res = await client.callTool({
      name: "refund_payment",
      arguments: { paymentId: "pay_e2e", confirm: true },
    });
    expect(res.isError).toBe(true);
    await client.close();
  });

  it("refund_payment sin identidad configurada devuelve error", async () => {
    const client = await connectedClient(null);
    const res = await client.callTool({
      name: "refund_payment",
      arguments: { paymentId: "pay_e2e", confirm: true },
    });
    expect(res.isError).toBe(true);
    await client.close();
  });
});
