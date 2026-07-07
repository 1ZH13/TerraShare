import { describe, it, expect } from "bun:test";
import { withCircuitBreaker, getCircuitState, resetCircuit } from "./circuit-breaker";

describe("circuit-breaker", () => {
  it("executes function successfully", async () => {
    resetCircuit();
    const result = await withCircuitBreaker(async () => "ok");
    expect(result).toBe("ok");
  });

  it("retries on failure", async () => {
    resetCircuit();
    let attempts = 0;
    const result = await withCircuitBreaker(
      async () => {
        attempts++;
        if (attempts < 3) throw new Error("fail");
        return "recovered";
      },
      { maxRetries: 3, baseDelay: 10 },
    );
    expect(result).toBe("recovered");
    expect(attempts).toBe(3);
  });

  it("opens circuit after threshold", async () => {
    resetCircuit();
    for (let i = 0; i < 5; i++) {
      try {
        await withCircuitBreaker(async () => { throw new Error("fail"); }, { maxRetries: 0, failureThreshold: 5 });
      } catch {}
    }
    expect(getCircuitState().state).toBe("OPEN");
  });

  it("rejects requests when circuit is open", async () => {
    resetCircuit();
    for (let i = 0; i < 5; i++) {
      try {
        await withCircuitBreaker(async () => { throw new Error("fail"); }, { maxRetries: 0, failureThreshold: 5 });
      } catch {}
    }
    await expect(
      withCircuitBreaker(async () => "should not run", { maxRetries: 0 })
    ).rejects.toThrow("Circuit breaker is OPEN");
  });
});
