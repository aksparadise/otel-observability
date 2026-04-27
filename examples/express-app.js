// examples/express-app.js
// ─────────────────────────────────────────────────────────────────────────────
//  Complete Express Application Example using OTel Signoz Plugin
//
//  This example demonstrates all major features of the plugin:
//    - OTel initialization
//    - Logger with trace context
//    - Custom metrics
//    - Distributed tracing
//    - Identity injection middleware
//    - Security sanitization
// ─────────────────────────────────────────────────────────────────────────────

// ── IMPORTANT: These MUST be the first imports ───────────────────────────────
import "dotenv/config";
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import { shutdownOtel } from "@aksparadise/otel-observability/otel";
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import {
    otelContextMiddleware,
    configureMiddleware,
} from "@aksparadise/otel-observability/middleware";
import { createChildLogger } from "@aksparadise/otel-observability/logger";
import { withSpan, setTraceUser } from "@aksparadise/otel-observability/tracer";
import { createMetricsBatch } from "@aksparadise/otel-observability/metrics";
import {
    sanitize,
    maskString,
} from "@aksparadise/otel-observability/sanitizer";

// ── Configure the plugin ─────────────────────────────────────────────────────
configureMiddleware({
    userIdPaths: ["user._id", "user.id", "auth.userId"],
    tenantIdPaths: ["user.client_id", "auth.tenantId"],
    includeClientIp: true,
    includeRequestId: true,
});

// ── Create metrics ───────────────────────────────────────────────────────────
const metrics = createMetricsBatch({
    counters: {
        httpRequests: {
            name: "http_requests_total",
            description: "Total HTTP requests",
        },
        userRegistrations: {
            name: "user_registrations_total",
            description: "Total user registrations",
        },
    },
    histograms: {
        requestDuration: {
            name: "http_request_duration_ms",
            description: "HTTP request duration",
            unit: "ms",
        },
        dbQueryDuration: {
            name: "db_query_duration_ms",
            description: "Database query duration",
            unit: "ms",
        },
    },
    gauges: {
        activeConnections: {
            name: "active_connections_total",
            description: "Current active connections",
        },
    },
});

// ── Create child logger for user module ───────────────────────────────────────
const userLogger = createChildLogger({ module: "userService" });

// ── Initialize Express app ───────────────────────────────────────────────────
const app = express();
app.use(express.json());

// ── Mock authentication middleware ───────────────────────────────────────────
app.use((req, res, next) => {
    // In real app, this would verify JWT token
    const authHeader = req.headers["authorization"];
    if (authHeader) {
        req.user = {
            _id: "user-123",
            id: "user-123",
            client_id: "tenant-456",
        };
    }
    next();
});

// ── OTel context injection (must be after auth) ─────────────────────────────
app.use(otelContextMiddleware);

// ── Connection tracking ─────────────────────────────────────────────────────
app.use((req, res, next) => {
    metrics.gauges.activeConnections.add(1);
    res.on("finish", () => {
        metrics.gauges.activeConnections.add(-1);
    });
    next();
});

// ── Request duration tracking ────────────────────────────────────────────────
app.use((req, res, next) => {
    const startTime = Date.now();
    res.on("finish", () => {
        const duration = Date.now() - startTime;
        metrics.histograms.requestDuration.record(duration, {
            method: req.method,
            route: req.route?.path || req.path,
            status: res.statusCode,
        });
    });
    next();
});

// ── Routes ───────────────────────────────────────────────────────────────────

// Health check (not traced)
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

// User registration
app.post("/api/users", async (req, res) => {
    try {
        metrics.counters.httpRequests.add(1, {
            method: "POST",
            route: "/api/users",
        });

        // Manual trace user setting
        setTraceUser("new-user-789", "tenant-456");

        const result = await withSpan("user.register", async (span) => {
            span.setAttribute("user.email", req.body.email);

            // Simulate database query
            await withSpan("db.insert", async (dbSpan) => {
                dbSpan.setAttribute("db.collection", "users");
                await new Promise((resolve) => setTimeout(resolve, 50));
            });

            const user = {
                id: "user-789",
                email: req.body.email,
                createdAt: new Date().toISOString(),
            };

            logger.info("User registered successfully", { userId: user.id });
            metrics.counters.userRegistrations.add(1, { tenant: "tenant-456" });

            return user;
        });

        res.status(201).json(result);
    } catch (error) {
        logger.error("User registration failed", { error: error.message });
        res.status(500).json({ error: "Registration failed" });
    }
});

// Get user profile
app.get("/api/users/:id", async (req, res) => {
    try {
        metrics.counters.httpRequests.add(1, {
            method: "GET",
            route: "/api/users/:id",
        });

        const user = await withSpan("user.getProfile", async (span) => {
            span.setAttribute("user.id", req.params.id);

            // Simulate database query
            await withSpan("db.find", async (dbSpan) => {
                dbSpan.setAttribute("db.collection", "users");
                await new Promise((resolve) => setTimeout(resolve, 30));
            });

            return {
                id: req.params.id,
                email: "user@example.com",
                // Sensitive data - will be auto-sanitized in logs
                password: "secret123",
                creditCard: "4111111111111111",
            };
        });

        // Log with automatic sanitization
        userLogger.info("User profile retrieved", { user: sanitize(user) });

        // Partial masking for display
        const maskedCard = maskString(user.creditCard, { visibleChars: 4 });

        res.json({
            ...user,
            password: "[REDACTED]",
            creditCard: maskedCard,
        });
    } catch (error) {
        logger.error("Failed to get user profile", { error: error.message });
        res.status(500).json({ error: "Failed to get profile" });
    }
});

// Background job endpoint
app.post("/api/jobs/email", async (req, res) => {
    try {
        const { to, subject } = req.body;

        // Process in background
        processEmailJob({ to, subject }).catch((err) => {
            logger.error("Email job failed", { error: err.message, to });
        });

        res.json({ message: "Email job queued" });
    } catch (error) {
        logger.error("Failed to queue email job", { error: error.message });
        res.status(500).json({ error: "Failed to queue job" });
    }
});

// ── Background job function ─────────────────────────────────────────────────
async function processEmailJob(job) {
    const startTime = Date.now();

    await withSpan("email.send", async (span) => {
        span.setAttribute("email.to", job.to);
        span.setAttribute("email.subject", job.subject);

        // Simulate email sending
        await new Promise((resolve) => setTimeout(resolve, 200));

        logger.info("Email sent successfully", { to: job.to });
    });

    const duration = Date.now() - startTime;
    metrics.histograms.dbQueryDuration.record(duration, { jobType: "email" });
}

// ── Graceful shutdown ──────────────────────────────────────────────────────
const server = app.listen(3000, () => {
    logger.info("Server started", { port: 3000 });
});

process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully");

    server.close(async () => {
        await shutdownOtel();
        process.exit(0);
    });
});

process.on("SIGINT", async () => {
    logger.info("SIGINT received, shutting down gracefully");

    server.close(async () => {
        await shutdownOtel();
        process.exit(0);
    });
});
