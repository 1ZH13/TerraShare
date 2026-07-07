import type { MiddlewareHandler } from "hono";

interface Metrics {
  totalRequests: number;
  totalErrors: number;
  requestsByPath: Map<string, number>;
  latencySum: number;
}

const metrics: Metrics = {
  totalRequests: 0,
  totalErrors: 0,
  requestsByPath: new Map(),
  latencySum: 0,
};

export const metricsMiddleware: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  metrics.totalRequests++;
  metrics.latencySum += duration;

  const path = c.req.path;
  metrics.requestsByPath.set(path, (metrics.requestsByPath.get(path) ?? 0) + 1);

  if (c.res.status >= 500) {
    metrics.totalErrors++;
  }
};

export function getMetrics() {
  return {
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    averageLatency: metrics.totalRequests > 0 ? metrics.latencySum / metrics.totalRequests : 0,
    requestsByPath: Object.fromEntries(metrics.requestsByPath),
  };
}
