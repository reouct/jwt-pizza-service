# 🍕 jwt-pizza-service

![Coverage badge](https://pizza-factory.cs329.click/api/badge/liu2003/jwtpizzaservicecoverage?t=latest)

Backend service for making JWT pizzas. This service tracks users and franchises and orders pizzas. All order requests are passed to the JWT Pizza Factory where the pizzas are made.

JWTs are used for authentication objects.

## Deployment

In order for the server to work correctly it must be configured by providing a `config.js` file.

```js
module.exports = {
  // Your JWT secret can be any random string you would like. It just needs to be secret.
  jwtSecret: "yourjwtsecrethere",
  db: {
    connection: {
      host: "127.0.0.1",
      user: "root",
      password: "yourpasswordhere",
      database: "pizza",
      connectTimeout: 60000,
    },
    listPerPage: 10,
  },
  factory: {
    url: "https://pizza-factory.cs329.click",
    apiKey: "yourapikeyhere",
  },
  metrics: {
    // Optional: configure to push OTLP metrics to Grafana
    source: "jwt-pizza-service-dev", // a label identifying this service
    url: "https://otlp-gateway-prod-us-west-0.grafana.net/otlp/v1/metrics",
    apiKey: "<grafana_access_token>",
  },
};
```

## Endpoints

You can get the documentation for all endpoints by making the following request.

```sh
curl localhost:3000/api/docs
```

## Development notes

Install the required packages.

```sh
npm install express jsonwebtoken mysql2 bcrypt
```

Nodemon is assumed to be installed globally so that you can have hot reloading when debugging.

```sh
npm -g install nodemon
```

## Metrics

If `config.metrics` is provided, the service emits metrics to a Grafana OTLP HTTP endpoint every 10 seconds.

Currently supported metrics (cumulative):

- orders_total
- revenue_total

Notes:

- Metrics are best-effort and never block requests.
- During tests (`NODE_ENV=test`), the periodic push is disabled.

## Logging (Grafana Loki)

Structured HTTP request logs are now emitted for every request using the `requestLogger` middleware. To enable log shipping to Grafana Loki, add a `logging` section to your `config.js`:

```js
logging: {
  source: "jwt-pizza-service-dev",              // label identifying this service
  url: "https://logs-prod-021.grafana.net/loki/api/v1/push", // Loki push endpoint
  apiKey: "<grafana_access_token>",            // Grafana Cloud access token (Loki)
  userId: 1234567,                               // Optional: some stacks require userId for Basic auth
},
```

Each log line is pushed as a Loki stream with labels:

| Label    | Description                    |
| -------- | ------------------------------ |
| `source` | Service identifier from config |
| `level`  | Currently always `info`        |
| `method` | HTTP method (GET, POST, etc.)  |
| `status` | Numeric HTTP status code       |

The JSON payload contains:

| Field           | Description                                                                   |
| --------------- | ----------------------------------------------------------------------------- |
| `type`          | Always `http_request` for request logs                                        |
| `method`        | HTTP method                                                                   |
| `path`          | Requested path (includes query if provided)                                   |
| `status`        | Response status code                                                          |
| `hasAuthHeader` | Boolean indicating presence of `Authorization` header (value is NOT logged)   |
| `host`          | Request host header                                                           |
| `latencyMs`     | End-to-end latency for the request                                            |
| `requestBody`   | Redacted & truncated request body (sensitive keys replaced with `[redacted]`) |
| `responseBody`  | Redacted & truncated response body                                            |
| `ts`            | ISO timestamp                                                                 |

Sensitive keys redacted: `password`, `passwd`, `token`, `accessToken`, `refreshToken`, `secret`.
Bodies above 5KB are truncated with a suffix noting the truncated size.

### Query Examples (Grafana Explore)

Basic stream selection:

```logql
{source="jwt-pizza-service-dev"}
```

Parse JSON and filter 5xx errors:

```logql
{source="jwt-pizza-service-dev"} | json | status >= 500
```

Top endpoints by request count (LogQL):

```logql
sum by (path) (count_over_time({source="jwt-pizza-service-dev"} | json | __error__="" [5m]))
```

Average latency by method (5m window):

```logql
avg by (method) (rate(({source="jwt-pizza-service-dev"} | json | unwrap latencyMs)[5m]))
```

### Local / Test Environment

If `NODE_ENV=test`, logs are printed to the console instead of being pushed to Loki. Ensure your test script sets `NODE_ENV=test` to avoid external calls during CI.

### Adding Dashboards

1. Create a Grafana Panel with data source Loki.
2. Use a LogQL query (e.g., `{source="jwt-pizza-service-dev"} | json`).
3. For latency graphs, use the transform: `Filter by query` then `Convert field type` for `latencyMs`.
4. Choose visualization type (Time series for latency, Table for request bodies while debugging).

### Security Considerations

Do not log full tokens or passwords. If you introduce new sensitive keys, extend the redaction list in `src/logger.js`.
