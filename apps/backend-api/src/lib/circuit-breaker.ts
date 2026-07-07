interface CircuitBreakerOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  failureThreshold?: number;
  resetTimeout?: number;
}

enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

let state = CircuitState.CLOSED;
let failureCount = 0;
let lastFailureTime = 0;

export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  options: CircuitBreakerOptions = {},
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    failureThreshold = 5,
    resetTimeout = 30000,
  } = options;

  if (state === CircuitState.OPEN) {
    if (Date.now() - lastFailureTime > resetTimeout) {
      state = CircuitState.HALF_OPEN;
    } else {
      throw new Error("Circuit breaker is OPEN - request blocked");
    }
  }

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      if (state === CircuitState.HALF_OPEN) {
        state = CircuitState.CLOSED;
        failureCount = 0;
      }
      return result;
    } catch (err) {
      lastError = err as Error;
      failureCount++;
      lastFailureTime = Date.now();

      if (failureCount >= failureThreshold) {
        state = CircuitState.OPEN;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

export function getCircuitState() {
  return { state, failureCount };
}

export function resetCircuit() {
  state = CircuitState.CLOSED;
  failureCount = 0;
}
