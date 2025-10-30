const os = require("os");
const config = require("./config.js");

// In-memory metrics state (per-minute windows)
const requestsByEndpoint = {}; // optional breakdown
let win_http_total = 0;
let win_http_get = 0;
let win_http_post = 0;
let win_http_put = 0;
let win_http_delete = 0;

let win_auth_attempts = 0;
let win_auth_success = 0;
let win_auth_failed = 0;

let win_pizzas_sold = 0;
let win_pizza_failures = 0;
let win_revenue = 0; // numeric

let win_latency_sum_ms = 0;
let win_latency_count = 0;
let win_pizza_latency_sum_ms = 0;
let win_pizza_latency_count = 0;

// also keep cumulative totals (optional)
let totalOrders = 0;
let totalRevenue = 0;

// Middleware to track requests and latency
function requestTracker(req, res, next) {
  try {
    const endpoint = `[${req.method}] ${req.path}`;
    const method = (req.method || "").toUpperCase();
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      // request counts
      win_http_total += 1;
      if (method === "GET") win_http_get += 1;
      else if (method === "POST") win_http_post += 1;
      else if (method === "PUT") win_http_put += 1;
      else if (method === "DELETE") win_http_delete += 1;
      // latency overall
      win_latency_sum_ms += durationMs;
      win_latency_count += 1;
      // pizza create latency (POST /api/order)
      if (method === "POST" && req.path && req.path.startsWith("/api/order")) {
        win_pizza_latency_sum_ms += durationMs;
        win_pizza_latency_count += 1;
      }
      // optional per-endpoint tracking
      requestsByEndpoint[endpoint] = (requestsByEndpoint[endpoint] || 0) + 1;
    });
  } catch {
    // best-effort metrics; never block the request flow
  }
  next();
}

// Record a purchase (order) placed by a user
// order shape: { items: [{ price }], ... }
function recordPurchase(user, order) {
  try {
    totalOrders += 1;
    win_pizzas_sold += 1;
    const orderValue = (order.items || []).reduce(
      (sum, item) => sum + (Number(item.price) || 0),
      0
    );
    totalRevenue += orderValue;
    win_revenue += orderValue;
  } catch {
    // swallow errors; metrics must not affect core flows
  }
}

function recordPizzaCreationFailure() {
  try {
    win_pizza_failures += 1;
  } catch {}
}

function authAttempt(success) {
  try {
    win_auth_attempts += 1;
    if (success) win_auth_success += 1;
    else win_auth_failed += 1;
  } catch {}
}

// Periodically send metrics to Grafana OTLP HTTP endpoint (once per minute)
const PUSH_INTERVAL_MS = 60_000;
if (process.env.NODE_ENV !== "test") {
  let prevCpuTotals = getCpuTotals();
  setInterval(() => {
    const metrics = [];

    // CPU and memory gauges
    const currentTotals = getCpuTotals();
    const cpuUsage = calculateCpuUsage(prevCpuTotals, currentTotals);
    prevCpuTotals = currentTotals;
    if (!Number.isNaN(cpuUsage)) {
      metrics.push(
        createMetric(
          "cpu_usage_percent",
          round2(cpuUsage),
          "%",
          "gauge",
          "asDouble",
          {}
        )
      );
    }
    const memUsage = getMemoryUsagePercentage();
    metrics.push(
      createMetric(
        "memory_usage_percent",
        round2(memUsage),
        "%",
        "gauge",
        "asDouble",
        {}
      )
    );

    // HTTP per-minute
    metrics.push(
      createMetric(
        "http_requests_total_per_min",
        win_http_total,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "http_requests_get_per_min",
        win_http_get,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "http_requests_post_per_min",
        win_http_post,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "http_requests_put_per_min",
        win_http_put,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "http_requests_delete_per_min",
        win_http_delete,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );

    // Auth per-minute
    metrics.push(
      createMetric(
        "auth_attempts_per_min",
        win_auth_attempts,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "auth_success_per_min",
        win_auth_success,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "auth_failed_per_min",
        win_auth_failed,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );

    // Pizza per-minute
    metrics.push(
      createMetric(
        "pizzas_sold_per_min",
        win_pizzas_sold,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "pizza_creation_failures_per_min",
        win_pizza_failures,
        "1",
        "gauge",
        "asInt",
        {}
      )
    );
    metrics.push(
      createMetric(
        "revenue_per_min",
        round2(win_revenue),
        "1",
        "gauge",
        "asDouble",
        {}
      )
    );

    // Latency averages in the window
    const avgServiceLatency = win_latency_count
      ? win_latency_sum_ms / win_latency_count
      : 0;
    const avgPizzaLatency = win_pizza_latency_count
      ? win_pizza_latency_sum_ms / win_pizza_latency_count
      : 0;
    metrics.push(
      createMetric(
        "service_latency_avg_ms",
        round2(avgServiceLatency),
        "ms",
        "gauge",
        "asDouble",
        {}
      )
    );
    metrics.push(
      createMetric(
        "pizza_create_latency_avg_ms",
        round2(avgPizzaLatency),
        "ms",
        "gauge",
        "asDouble",
        {}
      )
    );

    // Optional cumulative totals (keep existing totals for reference)
    metrics.push(
      createMetric("orders_total", totalOrders, "1", "sum", "asInt", {})
    );
    metrics.push(
      createMetric("revenue_total", totalRevenue, "1", "sum", "asDouble", {})
    );

    sendMetricToGrafana(metrics);

    // Reset window after sending
    win_http_total = 0;
    win_http_get = 0;
    win_http_post = 0;
    win_http_put = 0;
    win_http_delete = 0;
    win_auth_attempts = 0;
    win_auth_success = 0;
    win_auth_failed = 0;
    win_pizzas_sold = 0;
    win_pizza_failures = 0;
    win_revenue = 0;
    win_latency_sum_ms = 0;
    win_latency_count = 0;
    win_pizza_latency_sum_ms = 0;
    win_pizza_latency_count = 0;
  }, PUSH_INTERVAL_MS);
}

function createMetric(
  metricName,
  metricValue,
  metricUnit,
  metricType,
  valueType,
  attributes
) {
  // attach source attribute from config
  const source = config.metrics?.source || "jwt-pizza-service";
  attributes = { ...attributes, source };

  const metric = {
    name: metricName,
    unit: metricUnit,
    [metricType]: {
      dataPoints: [
        {
          [valueType]: metricValue,
          // OTLP expects a 64-bit nanosecond timestamp; provide as a string to avoid JS precision loss
          timeUnixNano: (BigInt(Date.now()) * 1_000_000n).toString(),
          attributes: [],
        },
      ],
    },
  };

  for (const key of Object.keys(attributes)) {
    metric[metricType].dataPoints[0].attributes.push({
      key,
      value: { stringValue: String(attributes[key]) },
    });
  }

  if (metricType === "sum") {
    metric[metricType].aggregationTemporality =
      "AGGREGATION_TEMPORALITY_CUMULATIVE";
    metric[metricType].isMonotonic = true;
  }

  return metric;
}

function sendMetricToGrafana(metrics) {
  const body = {
    resourceMetrics: [
      {
        // Provide basic resource attributes for better metric grouping in Grafana
        resource: {
          attributes: [
            {
              key: "service.name",
              value: {
                stringValue: config.metrics?.source || "jwt-pizza-service",
              },
            },
          ],
        },
        scopeMetrics: [
          {
            metrics,
          },
        ],
      },
    ],
  };

  const url = config.metrics?.url;
  const apiKey = config.metrics?.apiKey;
  if (!url || !apiKey) return;

  fetch(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP status: ${response.status}`);
      }
    })
    .catch(() => {
      // Log but keep quiet to not spam tests/console
      // console.error('Error pushing metrics:', error);
    });
}
// helpers for system metrics
function getCpuTotals() {
  const cpus = os.cpus();
  if (!cpus || cpus.length === 0) return { idle: 0, total: 0 };
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const t = cpu.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.irq + t.idle;
  }
  return { idle, total };
}
function calculateCpuUsage(prev, curr) {
  const idleDelta = curr.idle - prev.idle;
  const totalDelta = curr.total - prev.total;
  if (totalDelta <= 0) return 0;
  const usage = (1 - idleDelta / totalDelta) * 100;
  return usage < 0 ? 0 : usage > 100 ? 100 : usage;
}
function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  return (usedMemory / totalMemory) * 100;
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = {
  requestTracker,
  recordPurchase,
  recordPizzaCreationFailure,
  authAttempt,
};
