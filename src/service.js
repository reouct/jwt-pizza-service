const express = require("express");
const { authRouter, setAuthUser } = require("./routes/authRouter.js");
const orderRouter = require("./routes/orderRouter.js");
const franchiseRouter = require("./routes/franchiseRouter.js");
const userRouter = require("./routes/userRouter.js");
const version = require("./version.json");
const config = require("./config.js");
const metrics = require("./metrics.js");
const { requestLogger } = require("./logger.js");

const app = express();
app.use(express.json());
app.use(setAuthUser);
// Log each HTTP request/response for Grafana Loki
app.use(requestLogger);
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

const apiRouter = express.Router();
app.use("/api", apiRouter);
app.use(metrics.requestTracker);
apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/order", orderRouter);
apiRouter.use("/franchise", franchiseRouter);

apiRouter.use("/docs", (req, res) => {
  res.json({
    version: version.version,
    endpoints: [
      ...authRouter.docs,
      ...userRouter.docs,
      ...orderRouter.docs,
      ...franchiseRouter.docs,
    ],
    config: { factory: config.factory.url, db: config.db.connection.host },
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "welcome to JWT Pizza",
    version: version.version,
  });
});

app.use("*", (req, res) => {
  res.status(404).json({
    message: "unknown endpoint",
  });
});

// Default error handler for all exceptions and errors (also pushes to Grafana Loki)
app.use((err, req, res, next) => {
  const status = err.statusCode ?? 500;
  // respond first
  res.status(status).json({ message: err.message, stack: err.stack });
  try {
    const { pushToLoki } = require("./logger.js");
    pushToLoki(
      {
        source: config.logging?.source || "jwt-pizza-service",
        level: "error",
        kind: "exception",
        status: String(status),
      },
      {
        type: "unhandled_error",
        message: err.message,
        stack: err.stack,
        status,
        path: req.originalUrl || req.url || req.path,
        method: req.method,
        hasAuthHeader: Boolean(req.headers?.authorization),
        ts: new Date().toISOString(),
      }
    );
  } catch (logErr) {
    // swallow logging failures
    void logErr;
  }
  next();
});

// Process-level unhandled exception/rejection logging (avoid duplicate exits in test)
if (process.env.NODE_ENV !== "test") {
  const { pushToLoki } = require("./logger.js");
  process.on("uncaughtException", (error) => {
    try {
      pushToLoki(
        {
          source: config.logging?.source || "jwt-pizza-service",
          level: "error",
          kind: "process",
          type: "uncaughtException",
        },
        {
          type: "uncaughtException",
          message: error.message,
          stack: error.stack,
          ts: new Date().toISOString(),
        }
      );
    } catch (e) {
      void e; // ignore logging errors
    }
    // Optionally exit: process.exit(1); (omitted to keep service alive for now)
  });
  process.on("unhandledRejection", (reason) => {
    try {
      pushToLoki(
        {
          source: config.logging?.source || "jwt-pizza-service",
          level: "error",
          kind: "process",
          type: "unhandledRejection",
        },
        {
          type: "unhandledRejection",
          reason: reason && reason.message ? reason.message : String(reason),
          stack: reason && reason.stack ? reason.stack : undefined,
          ts: new Date().toISOString(),
        }
      );
    } catch (e) {
      void e; // ignore logging errors
    }
  });
}

module.exports = app;
