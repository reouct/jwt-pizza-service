"use strict";

// Structured request logging with optional push to Grafana Loki.
// Captures: method, path, status, hasAuthHeader, request body, response body, latency.

const config = require("./config.js");

// Best-effort base64 for Basic auth header (Grafana Cloud Loki)
function toBasicAuth(userId, apiKey) {
  try {
    // node: Buffer is available in all supported runtimes here
    return (
      "Basic " +
      Buffer.from(String(userId) + ":" + String(apiKey)).toString("base64")
    );
  } catch {
    return undefined;
  }
}

function nanoNow() {
  return (BigInt(Date.now()) * 1_000_000n).toString();
}

// Redact common sensitive fields
function redact(obj, maxLength = 5_000) {
  try {
    if (obj == null) return obj;
    const clone = JSON.parse(JSON.stringify(obj));
    const sensitiveKeys = new Set([
      "password",
      "passwd",
      "token",
      "accessToken",
      "refreshToken",
      "secret",
    ]);
    const visit = (node) => {
      if (!node || typeof node !== "object") return;
      for (const k of Object.keys(node)) {
        const v = node[k];
        if (sensitiveKeys.has(k)) {
          node[k] = "[redacted]";
        } else if (typeof v === "object") {
          visit(v);
        }
      }
    };
    visit(clone);
    let str = JSON.stringify(clone);
    if (str.length > maxLength) {
      str =
        str.slice(0, maxLength) +
        `...[truncated ${str.length - maxLength} chars]`;
    }
    return JSON.parse(str);
  } catch {
    // If serialization fails, fallback to string slice of original
    try {
      let s = typeof obj === "string" ? obj : JSON.stringify(obj);
      if (s.length > maxLength) s = s.slice(0, maxLength) + "...[truncated]";
      return s;
    } catch {
      return undefined;
    }
  }
}

// Build Loki request body
function buildLokiBody(labels, logLine) {
  return {
    streams: [
      {
        stream: labels,
        values: [
          [
            nanoNow(),
            typeof logLine === "string" ? logLine : JSON.stringify(logLine),
          ],
        ],
      },
    ],
  };
}

async function pushToLoki(logLabels, logPayload) {
  const url = config.logging?.url;
  const apiKey = config.logging?.apiKey;
  const userId = config.logging?.userId;

  if (!url || !apiKey || process.env.NODE_ENV === "test") {
    // In tests or when not configured, just emit to console for local visibility
    console.log(JSON.stringify({ labels: logLabels, log: logPayload }));
    return;
  }

  const auth = userId ? toBasicAuth(userId, apiKey) : `Bearer ${apiKey}`;
  const body = buildLokiBody(logLabels, logPayload);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(
        "Failed to push log to Grafana Loki:",
        res.status,
        await res.text()
      );
    }
  } catch (err) {
    console.error("Error pushing log to Grafana Loki:", err?.message || err);
  }
}

// Express middleware to capture request/response
function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const method = (req.method || "").toUpperCase();
  const path = req.originalUrl || req.url || req.path || "/";
  const hasAuthHeader = Boolean(req.headers && req.headers["authorization"]);
  const host = req.headers?.host || undefined;

  // Keep a copy of request body after redaction
  const requestBody = redact(req.body);

  // Patch res.json/res.send to capture the response body
  let responseBody; // store raw argument
  const origJson = res.json.bind(res);
  const origSend = res.send.bind(res);

  res.json = function patchedJson(body) {
    responseBody = body;
    return origJson(body);
  };
  res.send = function patchedSend(body) {
    responseBody = body;
    return origSend(body);
  };

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;
    const status = res.statusCode;

    // Prepare log payload
    const payload = {
      type: "http_request",
      method,
      path,
      status,
      hasAuthHeader,
      host,
      latencyMs: Math.round(latencyMs * 100) / 100,
      requestBody,
      responseBody: redact(responseBody),
      ts: new Date().toISOString(),
    };

    const labels = {
      source: config.logging?.source || "jwt-pizza-service",
      level: "info",
      method,
      status: String(status),
    };

    pushToLoki(labels, payload);
  });

  next();
}

module.exports = { requestLogger, pushToLoki };
