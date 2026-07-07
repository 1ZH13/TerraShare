import { describe, expect, it } from "bun:test";
import { requireAdmin } from "../middleware/require-auth";

const adminUser = {
  id: "admin_01",
  clerkUserId: "admin_01",
  email: "admin@example.com",
  role: "admin" as const,
  status: "active" as const,
  profile: { fullName: "Admin", phone: undefined },
  mfaVerified: true,
};

describe("requireAdmin", () => {
  it("rechaza admin sin MFA en produccion", async () => {
    const c = {
      get: (key: string) => {
        if (key === "authUser") return { ...adminUser, mfaVerified: false };
        return undefined;
      },
      req: { header: () => undefined },
      header: () => {},
      json: () => Promise.resolve({ error: { code: "MFA_REQUIRED" } }),
      res: undefined,
    } as any;

    let called = false;
    await requireAdmin(c, () => { called = true; });
    expect(called).toBe(false);
  });

  it("permite admin con MFA en produccion", async () => {
    const c = {
      get: (key: string) => {
        if (key === "authUser") return { ...adminUser, mfaVerified: true };
        return undefined;
      },
      req: { header: () => undefined },
      header: () => {},
      json: () => Promise.resolve({ error: { code: "" } }),
      res: undefined,
    } as any;

    let called = false;
    await requireAdmin(c, () => { called = true; });
    expect(called).toBe(true);
  });

  it("permite admin sin MFA en dev bypass", async () => {
    const c = {
      get: (key: string) => {
        if (key === "authUser") return { ...adminUser, mfaVerified: false };
        return undefined;
      },
      req: { header: (name: string) => name === "x-dev-user-id" ? "admin_01" : undefined },
      header: () => {},
      json: () => Promise.resolve({ error: { code: "" } }),
      res: undefined,
    } as any;

    let called = false;
    await requireAdmin(c, () => { called = true; });
    expect(called).toBe(true);
  });
});
