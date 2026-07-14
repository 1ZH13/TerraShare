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

/** Arrendatario de rr_e2e (user_regular). */
const TENANT_USER: ActingUser = {
  id: "user_regular",
  clerkUserId: "user_regular",
  email: "user@test.com",
  role: "user",
  status: "active",
  profile: { fullName: "Usuario Regular" },
};

// El preload no toca RentalRequest/Payment → sembramos una solicitud pagable en
// el hook (no en el cuerpo del test) para las tools que la leen.
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
});
