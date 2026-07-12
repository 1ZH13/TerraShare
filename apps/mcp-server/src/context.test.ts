import { afterEach, describe, expect, it } from "bun:test";

import { resolveActingUser } from "./context";

describe("resolveActingUser (#234)", () => {
  const original = process.env.MCP_ACTING_USER_ID;
  afterEach(() => {
    if (original === undefined) delete process.env.MCP_ACTING_USER_ID;
    else process.env.MCP_ACTING_USER_ID = original;
  });

  it("devuelve null si no hay MCP_ACTING_USER_ID", async () => {
    delete process.env.MCP_ACTING_USER_ID;
    expect(await resolveActingUser()).toBeNull();
  });

  it("devuelve null si el usuario configurado no existe", async () => {
    process.env.MCP_ACTING_USER_ID = "no_existe";
    expect(await resolveActingUser()).toBeNull();
  });

  it("resuelve el usuario admin desde Mongo con id === clerkUserId", async () => {
    process.env.MCP_ACTING_USER_ID = "user_admin";
    const user = await resolveActingUser();
    expect(user).not.toBeNull();
    expect(user!.id).toBe("user_admin");
    expect(user!.clerkUserId).toBe("user_admin");
    expect(user!.role).toBe("admin");
  });

  it("resuelve un usuario regular con su rol", async () => {
    process.env.MCP_ACTING_USER_ID = "user_regular";
    const user = await resolveActingUser();
    expect(user!.role).toBe("user");
    expect(user!.status).toBe("active");
  });
});
