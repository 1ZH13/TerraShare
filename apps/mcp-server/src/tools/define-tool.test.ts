import { describe, expect, it } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";

import type { ActingUser, ToolContext } from "../context";
import { registerTool, ToolError, type ToolAccess } from "./define-tool";

function actingUser(overrides: Partial<ActingUser>): ActingUser {
  return {
    id: "u1",
    clerkUserId: "u1",
    email: "u1@test.com",
    role: "user",
    status: "active",
    profile: { fullName: "U1" },
    ...overrides,
  };
}

/** Cliente conectado a un servidor con una única tool de prueba y el ctx dado. */
async function clientWithTool(
  ctx: ToolContext,
  opts: { requires?: ToolAccess; throws?: boolean } = {},
): Promise<Client> {
  const server = new McpServer({ name: "t", version: "1.0.0" });
  registerTool(server, ctx, {
    name: "probe",
    title: "Probe",
    description: "test",
    inputSchema: { echo: z.string().optional() },
    requires: opts.requires,
    handler: () => {
      if (opts.throws) throw new ToolError("fallo de negocio");
      return { ok: true };
    },
  });
  const client = new Client({ name: "c", version: "1.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return client;
}

async function call(client: Client): Promise<{ isError: boolean; text: string }> {
  const res = await client.callTool({ name: "probe", arguments: {} });
  const content = res.content as { type: string; text: string }[];
  return { isError: res.isError === true, text: content[0]?.text ?? "" };
}

describe("registerTool / defineTool (#234)", () => {
  it("tool pública: accesible sin identidad", async () => {
    const r = await call(await clientWithTool({ actingUser: null }, { requires: "public" }));
    expect(r.isError).toBe(false);
  });

  it("tool 'user': denegada sin identidad", async () => {
    const r = await call(await clientWithTool({ actingUser: null }, { requires: "user" }));
    expect(r.isError).toBe(true);
    expect(r.text).toContain("MCP_ACTING_USER_ID");
  });

  it("tool 'user': denegada si el usuario está bloqueado", async () => {
    const ctx = { actingUser: actingUser({ status: "blocked" }) };
    const r = await call(await clientWithTool(ctx, { requires: "user" }));
    expect(r.isError).toBe(true);
    expect(r.text).toContain("bloqueado");
  });

  it("tool 'admin': denegada para un usuario regular", async () => {
    const ctx = { actingUser: actingUser({ role: "user" }) };
    const r = await call(await clientWithTool(ctx, { requires: "admin" }));
    expect(r.isError).toBe(true);
    expect(r.text).toContain("administrador");
  });

  it("tool 'admin': permitida para un admin", async () => {
    const ctx = { actingUser: actingUser({ role: "admin" }) };
    const r = await call(await clientWithTool(ctx, { requires: "admin" }));
    expect(r.isError).toBe(false);
  });

  it("un ToolError se devuelve como resultado de error, sin crash", async () => {
    const r = await call(await clientWithTool({ actingUser: null }, { requires: "public", throws: true }));
    expect(r.isError).toBe(true);
    expect(r.text).toContain("fallo de negocio");
  });
});
