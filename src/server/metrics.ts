type CounterMap = Record<string, number>;

const counters: CounterMap = {
  "http.requests.total": 0,
  "http.responses.2xx": 0,
  "http.responses.4xx": 0,
  "http.responses.5xx": 0,
  "billing.charges": 0,
  "billing.refunds": 0,
};

export function incrementMetric(name: keyof typeof counters | string, by = 1) {
  counters[name] = (counters[name] ?? 0) + by;
}

export function recordHttpStatus(status: number) {
  incrementMetric("http.requests.total");
  if (status >= 500) incrementMetric("http.responses.5xx");
  else if (status >= 400) incrementMetric("http.responses.4xx");
  else if (status >= 200 && status < 300) incrementMetric("http.responses.2xx");
}

export function snapshotMetrics() {
  return {
    collectedAt: new Date().toISOString(),
    counters: { ...counters },
    uptimeSeconds: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
  };
}
