import { describe, expect, it, beforeEach } from "bun:test";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";

import type { ActingUser, ToolContext } from "../context";
import { registerTool, ToolError, type ToolAccess, type SensitiveConfig } from "./define-tool";
import { _clearConfirmations } from "./confirmation-store";

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

/** Cliente con una tool sensible "danger"; `executed` cuenta las ejecuciones reales del handler. */
async function sensitiveClient(
  sensitive: SensitiveConfig,
  executed: { count: number },
): Promise<Client> {
  const server = new McpServer({ name: "t", version: "1.0.0" });
  registerTool(
    server,
    { actingUser: actingUser({}) },
    {
      name: "danger",
      title: "Danger",
      description: "acción sensible de prueba",
      inputSchema: { landId: z.string() },
      requires: "user",
      sensitive,
      handler: () => {
        executed.count += 1;
        return { done: true };
      },
    },
  );
  const client = new Client({ name: "c", version: "1.0.0" });
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(st), client.connect(ct)]);
  return client;
}

async function callArgs(
  client: Client,
  args: Record<string, unknown>,
): Promise<{ isError: boolean; text: string; data: Record<string, unknown> | null }> {
  const res = await client.callTool({ name: "danger", arguments: args });
  const content = res.content as { type: string; text: string }[];
  const text = content[0]?.text ?? "";
  let data: Record<string, unknown> | null = null;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* no era JSON */
  }
  return { isError: res.isError === true, text, data };
}

describe("registerTool sensible (#328)", () => {
  beforeEach(() => {
    _clearConfirmations();
  });

  it("capa A (confirm): sin confirm no ejecuta y devuelve error", async () => {
    const executed = { count: 0 };
    const client = await sensitiveClient({ confirm: true }, executed);
    const r = await callArgs(client, { landId: "land_a" });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("confirm");
    expect(executed.count).toBe(0);
  });

  it("capa A (confirm): con confirm:true ejecuta el handler", async () => {
    const executed = { count: 0 };
    const client = await sensitiveClient({ confirm: true }, executed);
    const r = await callArgs(client, { landId: "land_a", confirm: true });
    expect(r.isError).toBe(false);
    expect(executed.count).toBe(1);
  });

  it("capa F (enabled): si está desactivada devuelve error y no ejecuta", async () => {
    const executed = { count: 0 };
    const client = await sensitiveClient({ confirm: true, enabled: () => false }, executed);
    const r = await callArgs(client, { landId: "land_a", confirm: true });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("desactivada");
    expect(executed.count).toBe(0);
  });

  it("capa B (preview): 1ª llamada devuelve preview + token sin ejecutar", async () => {
    const executed = { count: 0 };
    const preview = { warning: "vas a borrar land_a" };
    const client = await sensitiveClient({ preview: () => preview }, executed);
    const r = await callArgs(client, { landId: "land_a" });
    expect(r.isError).toBe(false);
    expect(executed.count).toBe(0);
    expect(r.data?.requiresConfirmation).toBe(true);
    expect(typeof r.data?.confirmationToken).toBe("string");
    expect((r.data?.preview as Record<string, unknown>)?.warning).toBe("vas a borrar land_a");
  });

  it("capa B (preview): 2ª llamada con token válido ejecuta", async () => {
    const executed = { count: 0 };
    const client = await sensitiveClient({ preview: () => ({ ok: true }) }, executed);
    const step1 = await callArgs(client, { landId: "land_a" });
    const token = step1.data?.confirmationToken as string;
    const step2 = await callArgs(client, { landId: "land_a", confirmationToken: token });
    expect(step2.isError).toBe(false);
    expect(step2.data?.done).toBe(true);
    expect(executed.count).toBe(1);
  });

  it("capa B (preview): token inválido no ejecuta", async () => {
    const executed = { count: 0 };
    const client = await sensitiveClient({ preview: () => ({ ok: true }) }, executed);
    const r = await callArgs(client, { landId: "land_a", confirmationToken: "cfm_falso" });
    expect(r.isError).toBe(true);
    expect(executed.count).toBe(0);
  });

  it("capa B (preview): token válido pero args cambiados no ejecuta", async () => {
    const executed = { count: 0 };
    const client = await sensitiveClient({ preview: () => ({ ok: true }) }, executed);
    const step1 = await callArgs(client, { landId: "land_a" });
    const token = step1.data?.confirmationToken as string;
    const step2 = await callArgs(client, { landId: "land_DISTINTO", confirmationToken: token });
    expect(step2.isError).toBe(true);
    expect(step2.text).toContain("cambiaron");
    expect(executed.count).toBe(0);
  });
});
