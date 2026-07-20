import { describe, expect, it, beforeEach } from "bun:test";

import {
  _clearConfirmations,
  consumeToken,
  hashArgs,
  issueToken,
} from "./confirmation-store";

describe("confirmation-store (#328)", () => {
  beforeEach(() => {
    _clearConfirmations();
  });

  it("emite un token y lo consume una sola vez con los mismos args", () => {
    const args = { landId: "land_a", confirm: true };
    const { token, ttlSeconds } = issueToken("delete_land", args);
    expect(token).toStartWith("cfm_");
    expect(ttlSeconds).toBeGreaterThan(0);

    const first = consumeToken(token, "delete_land", args);
    expect(first.ok).toBe(true);

    // Un solo uso: la segunda vez ya no es válido.
    const second = consumeToken(token, "delete_land", args);
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.message).toContain("inválido");
  });

  it("el hash es estable ante el orden de las claves", () => {
    expect(hashArgs({ a: 1, b: 2 })).toBe(hashArgs({ b: 2, a: 1 }));
    expect(hashArgs({ a: 1 })).not.toBe(hashArgs({ a: 2 }));
  });

  it("rechaza el token si cambian los argumentos", () => {
    const { token } = issueToken("refund_payment", { paymentId: "p1", amount: 10 });
    const res = consumeToken(token, "refund_payment", { paymentId: "p1", amount: 999 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("cambiaron");
  });

  it("rechaza el token si es de otra tool", () => {
    const args = { id: "x" };
    const { token } = issueToken("sign_contract", args);
    const res = consumeToken(token, "delete_land", args);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.message).toContain("no corresponde");
  });

  it("rechaza un token inexistente", () => {
    const res = consumeToken("cfm_inexistente", "delete_land", {});
    expect(res.ok).toBe(false);
  });
});
