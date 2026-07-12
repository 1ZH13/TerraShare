import { describe, expect, it } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { createServer } from "./server";

/**
 * E2E de la fundación (#234): un cliente MCP real se conecta al servidor,
 * lista las tools y llama a search_lands contra MongoDB (sembrada en el preload).
 */
async function connectedClient(): Promise<Client> {
  const server = createServer({ actingUser: null });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

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

  it("un cliente MCP lista las tools e incluye get_land", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("get_land");
    await client.close();
  });

  it("llamar get_land devuelve un terreno por ID", async () => {
    const client = await connectedClient();
    const res = await client.callTool({ name: "get_land", arguments: { landId: "land_a" } });
    const structured = res.structuredContent as { id: string; title: string };
    expect(structured.id).toBe("land_a");
    expect(structured.title).toBe("Finca agrícola en Chiriquí");
    await client.close();
  });

  it("get_land devuelve error para terreno inexistente", async () => {
    const client = await connectedClient();
    const res = await client.callTool({ name: "get_land", arguments: { landId: "nonexistent" } });
    expect(res.isError).toBe(true);
    await client.close();
  });
});
