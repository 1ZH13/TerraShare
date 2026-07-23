import { describe, expect, it } from "bun:test";
import { isMfaLockout } from "./admin-mfa";

describe("isMfaLockout", () => {
  it("hay encierro si se exige 2FA y la cuenta no la trae verificada (#394)", () => {
    expect(isMfaLockout({ requireAdminMfa: true, callerMfaEnabled: false })).toBe(true);
  });

  it("no hay encierro si la cuenta tiene la 2FA verificada", () => {
    expect(isMfaLockout({ requireAdminMfa: true, callerMfaEnabled: true })).toBe(false);
  });

  it("no hay encierro si la exigencia está desactivada", () => {
    expect(isMfaLockout({ requireAdminMfa: false, callerMfaEnabled: false })).toBe(false);
    expect(isMfaLockout({ requireAdminMfa: false, callerMfaEnabled: true })).toBe(false);
  });

  it("no avisa mientras no se sabe nada: sin ajustes no se supone encierro", () => {
    // Importa: si el aviso saliera por defecto, aparecería en cada carga antes
    // de que llegue la respuesta, asustando a quien no tiene ningún problema.
    expect(isMfaLockout(null)).toBe(false);
    expect(isMfaLockout(undefined)).toBe(false);
  });
});
