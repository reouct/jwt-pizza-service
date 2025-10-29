const config = require("./config.js");

// In-memory metrics state
const requests = {}; // endpoint -> count

let totalOrders = 0; // cumulative count
let totalRevenue = 0; // cumulative revenue (number)
// Aggregations
const ordersByFranchise = {}; // franchiseId -> count
const ordersByStore = {}; // storeId -> count
// itemKey = `${menuId}|${description}` -> { count, revenue }
const itemsSold = {};

// Middleware to track requests
function requestTracker(req, res, next) {
  try {
    const endpoint = `[${req.method}] ${req.path}`;
    requests[endpoint] = (requests[endpoint] || 0) + 1;
  } catch (e) {
    // best-effort metrics; never block the request flow
  }
  next();
}

// Record a purchase (order) placed by a user
// order shape: { franchiseId, storeId, items: [{ menuId, description, price }, ...], id }
function recordPurchase(user, order) {
  try {
    totalOrders += 1;
    ordersByFranchise[order.franchiseId] =
      (ordersByFranchise[order.franchiseId] || 0) + 1;
    ordersByStore[order.storeId] = (ordersByStore[order.storeId] || 0) + 1;

    let orderValue = 0;
    for (const item of order.items || []) {
      const key = `${item.menuId}|${item.description}`;
      if (!itemsSold[key]) {
        itemsSold[key] = {
          count: 0,
          revenue: 0,
          menuId: item.menuId,
          description: item.description,
        };
      }
      itemsSold[key].count += 1;
      itemsSold[key].revenue += Number(item.price) || 0;
      orderValue += Number(item.price) || 0;
    }
    totalRevenue += orderValue;
  } catch (e) {
    // swallow errors; metrics must not affect core flows
  }
}

// Periodically send metrics to Grafana OTLP HTTP endpoint
const PUSH_INTERVAL_MS = 10_000;
if (process.env.NODE_ENV !== "test") {
  setInterval(() => {
    const metrics = [];

    // Request counts by endpoint
    for (const endpoint of Object.keys(requests)) {
      metrics.push(
        createMetric(
          "http_requests_total",
          requests[endpoint],
          "1",
          "sum",
          "asInt",
          { endpoint }
        )
      );
    }

    // Overall orders and revenue
    metrics.push(
      createMetric("orders_total", totalOrders, "1", "sum", "asInt", {})
    );
    metrics.push(
      createMetric(
        "revenue_total",
        totalRevenue,
        "pizzaCoin",
        "sum",
        "asDouble",
        {}
      )
    );

    // Average order value as a gauge
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    metrics.push(
      createMetric(
        "average_order_value",
        aov,
        "pizzaCoin",
        "gauge",
        "asDouble",
        {}
      )
    );

    // Orders by franchise and store
    for (const fId of Object.keys(ordersByFranchise)) {
      metrics.push(
        createMetric(
          "orders_by_franchise",
          ordersByFranchise[fId],
          "1",
          "sum",
          "asInt",
          { franchiseId: `${fId}` }
        )
      );
    }
    for (const sId of Object.keys(ordersByStore)) {
      metrics.push(
        createMetric(
          "orders_by_store",
          ordersByStore[sId],
          "1",
          "sum",
          "asInt",
          { storeId: `${sId}` }
        )
      );
    }

    // Items sold (count and revenue)
    for (const key of Object.keys(itemsSold)) {
      const { count, revenue, menuId, description } = itemsSold[key];
      const baseAttrs = { menuId: `${menuId}`, description };
      metrics.push(
        createMetric("items_sold_total", count, "1", "sum", "asInt", baseAttrs)
      );
      metrics.push(
        createMetric(
          "items_revenue_total",
          revenue,
          "pizzaCoin",
          "sum",
          "asDouble",
          baseAttrs
        )
      );
    }

    if (metrics.length > 0) {
      sendMetricToGrafana(metrics);
    }
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
          timeUnixNano: Date.now() * 1_000_000,
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
    .catch((error) => {
      // Log but keep quiet to not spam tests/console
      // console.error('Error pushing metrics:', error);
    });
}

module.exports = { requestTracker, recordPurchase };
