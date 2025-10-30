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
