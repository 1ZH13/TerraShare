import { getMetrics } from "../middleware/metrics";

interface AlertRule {
  name: string;
  check: () => boolean;
  severity: "critical" | "warning";
}

const rules: AlertRule[] = [
  {
    name: "high_error_rate",
    check: () => {
      const m = getMetrics();
      return m.totalRequests > 100 && (m.totalErrors / m.totalRequests) > 0.1;
    },
    severity: "critical",
  },
  {
    name: "high_latency",
    check: () => {
      const m = getMetrics();
      return m.averageLatency > 5000;
    },
    severity: "warning",
  },
];

export function checkAlerts(): Array<{ name: string; severity: string }> {
  return rules.filter((r) => r.check()).map((r) => ({ name: r.name, severity: r.severity }));
}
