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

// Comprehensive redaction & sanitization of potentially sensitive data.
// Applies to payload bodies, DB params, factory calls, and exceptions.
function redact(obj, maxLength = 5_000) {
  try {
    if (obj == null) return obj;
    // Primitive quick path
    if (typeof obj !== "object") return sanitizeScalar(obj, maxLength);
    const clone = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      const safeKey = k;
      clone[safeKey] = sanitizeValue(safeKey, v, maxLength);
    }
    return clone;
  } catch {
    return undefined;
  }
}

const SENSITIVE_KEY_REGEX =
  /(pass(word)?|token|refresh|access|secret|authorization|apiKey|jwt|session|bearer)/i;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;

function sanitizeScalar(value, maxLength) {
  if (value == null) return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  let s = String(value);
  // Mask Authorization header forms
  if (/^Bearer\s+/i.test(s)) s = "Bearer [redacted]";
  if (/^Basic\s+/i.test(s)) s = "Basic [redacted]";
  // Emails
  s = s.replace(EMAIL_REGEX, (m) => maskEmail(m));
  // JWT
  if (JWT_REGEX.test(s)) s = "[jwt]";
  // Long base64/secret-like strings
  if (s.length > 128 && /[A-Za-z0-9+/=]{40,}/.test(s)) s = "[redacted]";
  if (s.length > maxLength) {
    s = s.slice(0, maxLength) + `...[truncated ${s.length - maxLength} chars]`;
  }
  return s;
}

function sanitizeValue(key, value, maxLength) {
  if (value == null) return value;
  if (SENSITIVE_KEY_REGEX.test(key)) return "[redacted]";
  if (typeof value === "object") return redact(value, maxLength);
  return sanitizeScalar(value, maxLength);
}

function maskEmail(email) {
  try {
    const [user, domain] = email.split("@");
    const mUser =
      user.length <= 2
        ? "*".repeat(user.length)
        : user[0] + "***" + user[user.length - 1];
    const domainParts = domain.split(".");
    const root = domainParts[0];
    const maskedRoot =
      root.length <= 2
        ? "*".repeat(root.length)
        : root[0] + "***" + root[root.length - 1];
    domainParts[0] = maskedRoot;
    return `${mUser}@${domainParts.join(".")}`;
  } catch {
    return "[email]";
  }
}

// Sanitise labels & payload before sending to Loki.
function sanitizeForLogging(labels, payload) {
  const safeLabels = {};
  for (const [k, v] of Object.entries(labels || {})) {
    safeLabels[k] = sanitizeScalar(v, 256);
  }
  let safePayload;
  if (typeof payload === "string") {
    safePayload = sanitizeScalar(payload, 5_000);
  } else {
    safePayload = redact(payload, 5_000);
  }
  return { safeLabels, safePayload };
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
  // Always sanitise first
  const { safeLabels, safePayload } = sanitizeForLogging(logLabels, logPayload);
  const url = config.logging?.url;
  const apiKey = config.logging?.apiKey;
  const userId = config.logging?.userId;

  if (!url || !apiKey || process.env.NODE_ENV === "test") {
    // In tests or when not configured, just emit to console for local visibility
    console.log(JSON.stringify({ labels: safeLabels, log: safePayload }));
    return;
  }

  const auth = userId ? toBasicAuth(userId, apiKey) : `Bearer ${apiKey}`;
  const body = buildLokiBody(safeLabels, safePayload);

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
