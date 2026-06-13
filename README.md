# @aksparadise/otel-observability

<p align="center">
  <strong>Production-ready OpenTelemetry for Node.js in a single line of code.</strong><br />
  <em>Zero configuration drift, secure-by-default, and fully standardized telemetry for SigNoz, Grafana, and any OTLP collector.</em>
</p>

<p align="center">
  <a href="https://badge.socket.dev/npm/package/@aksparadise/otel-observability"><img src="https://badge.socket.dev/npm/package/@aksparadise/otel-observability" alt="Socket Badge" /></a>
  <a href="https://img.shields.io/npm/v/@aksparadise/otel-observability"><img src="https://img.shields.io/npm/v/@aksparadise/otel-observability" alt="npm version" /></a>
  <a href="https://github.com/aksparadise/otel-observability/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@aksparadise/otel-observability" alt="License" /></a>
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage" />
  <img src="https://img.shields.io/badge/types-TypeScript-blue" alt="TypeScript Types" />
</p>

---

## 📖 Table of Contents

1. [Why This Library? (The Cost of Observability Drift)](#-why-this-library-the-cost-of-observability-drift)
2. [🧠 What This Actually Does](#-what-this-actually-does)
3. [⚡ 30-Second Proof](#-30-second-proof)
4. [🚀 Quick Start Guides](#-quick-start-guides)
   - [Express / Vanilla Node.js](#1-express--vanilla-nodejs)
   - [NestJS Framework](#2-nestjs-framework)
   - [Next.js Web Applications](#3-nextjs-web-applications)
5. [🏗️ Architecture Model](#️-architecture-model)
6. [📦 What Gets Standardized](#-what-gets-standardized)
7. [⚙️ Configuration Reference (Environment Variables)](#️-configuration-reference-environment-variables)
8. [💡 Advanced Telemetry Usage](#-advanced-telemetry-usage)
   - [Custom Tracing Spans](#custom-tracing-spans)
   - [Structured Logging](#structured-logging)
   - [Custom Metrics Counters & Histograms](#custom-metrics-counters--histograms)
9. [❌ When to Use Raw OpenTelemetry Instead](#-when-to-use-raw-opentelemetry-instead)
10. [🔒 Trust, Security & Compliance](#-trust-security--compliance)
11. [🧩 Troubleshooting & Diagnostics](#-troubleshooting--diagnostic-checklist)
12. [🙋 Frequently Asked Questions (FAQ)](#-faq)

---

## 🕵️ Why This Library? (The Cost of Observability Drift)

Most development teams start with the best intentions, copy-pasting a custom **200+ line OpenTelemetry bootstrap file** across their services. 

Within months, those files diverge. You suffer from **Observability Drift**:

*   **Traces break mid-request** because Service A samples at 100% while Service B samples at 10%.
*   **Debugging requires manual lookup** because console logs do not contain active Trace IDs.
*   **Unified dashboards break** because one service exports via custom JSON and another via OTLP.
*   **Critical spans are missing** because of inconsistent middleware registration order across projects.

`@aksparadise/otel-observability` acts as an **enforceable governance layer**. By introducing it as a shared core dependency across your fleet, every service automatically adopts identical instrumentation, exporters, security filters, and defaults by design.

### The Contrast: Custom Setup vs. Standardized Layer

| Feature | Traditional Custom Setup | `@aksparadise/otel-observability` |
| :--- | :--- | :--- |
| **Setup Overhead** | 1–2 hours of manual configuration per repository | **< 2 minutes (Single function call)** |
| **Fleet Consistency** | Configurations diverge over time (drift) | **100% uniform instrumentation contract** |
| **Trace Continuity** | Frequently breaks due to header propagation bugs | **Consistent trace propagation by design** |
| **Code Footprint** | 200+ lines of fragile bootstrap boilerplate | **Single entry: `await setup()`** |
| **Security / PII Filter** | Custom or completely absent | **Circular-safe automatic PII redaction** |

---

## 🧠 What This Actually Does

This library is an **opinionated, pre-packaged distribution** of the official OpenTelemetry SDK. It wraps standard modules without adding a custom runtime engine, avoiding any vendor lock-in.

*   **Zero Boilerplate Initialization**: Automatically sets up trace providers, metric readers, and log processors.
*   **Auto-Instrumentation**: Plugs directly into Express, NestJS, Next.js, Mongoose, Redis, and GraphQL.
*   **Correlated Structured Logs**: Monkeypatches standard console logs to insert active trace context (`trace_id` and `span_id`) automatically.
*   **Global Crash Safeguards**: Catches uncaught exceptions and unhandled promise rejections, recording complete stack traces before the process exits.
*   **High Performance**: Minimal runtime overhead (<5ms initialization time) and optimized memory footprint.

---

## ⚡ 30-Second Proof

```bash
npm install @aksparadise/otel-observability
```

```typescript
import "dotenv/config";
import { setup } from "@aksparadise/otel-observability";

// Boot OpenTelemetry before any other imports
await setup();
```

1. Run your service.
2. Send a request to your API.
3. Open your **SigNoz**, **Grafana**, or standard OTLP dashboard.
4. View full database queries, HTTP lifecycles, and correlated console logs immediately. **No custom spans required.**

---

## 🚀 Quick Start Guides

> [!IMPORTANT]
> **Initialization Order is Critical!**  
> In Node.js, auto-instrumentation works by patching modules (like `express`, `mongoose`, or `redis`) *at load-time*. 
> You **MUST** import `dotenv/config` and call `setup()` at the absolute top of your application's entry file, before importing any framework or third-party libraries.

### 1. Express / Vanilla Node.js

Create a `.env` file in your project root:

```env
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=express-microservice
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Initialize inside your server startup file (e.g., `index.ts`):

```typescript
import "dotenv/config"; // Must be first
import { setup } from "@aksparadise/otel-observability"; // Must be second
import { otelContextMiddleware } from "@aksparadise/otel-observability/middleware";
import express from "express";

async function startServer() {
    // 1. Initialize SDK
    await setup();

    const app = express();

    // 2. Register context middleware (injects user/tenant ID into traces)
    app.use(otelContextMiddleware);

    app.get("/api/data", (req, res) => {
        res.json({ message: "Hello from traced endpoint!" });
    });

    app.listen(3000, () => {
        console.log("Server running on port 3000");
    });
}

startServer();
```

---

### 2. NestJS Framework

NestJS relies on an internal logging system that bypasses typical global console traps. We provide a custom `logger` proxy to capture all system-level and framework-level NestJS logs securely.

```typescript
// main.ts
import "dotenv/config"; // Loaded first
import { setup } from "@aksparadise/otel-observability"; // Loaded second
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    // 1. Initialize telemetry
    const observability = await setup();

    // 2. Pass the auto-configured logger to NestJS
    const app = await NestFactory.create(AppModule, {
        logger: observability.logger ?? undefined,
    });

    await app.listen(3000);
}

bootstrap();
```

> [!TIP]
> For advanced configurations, manual setups, or custom Winston/Pino patterns, check the [NestJS Integration Guide](./docs/nestjs.md).

---

### 3. Next.js Web Applications

Next.js initializes server runtimes dynamically. We integrate with Next's official `instrumentation.ts` gateway to guarantee precise server-side execution.

Enable experimental instrumentation in your `next.config.js`:

```javascript
module.exports = {
    experimental: {
        instrumentationHook: true,
    },
};
```

Create your entry bootstrap file (`instrumentation.ts` in your root or `src/` directory):

```typescript
// instrumentation.ts
import "dotenv/config";
import { setup } from "@aksparadise/otel-observability";

export async function register() {
    // Only run telemetry on the Node.js server runtime
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await setup({ framework: "nextjs" });
    }
}
```

> [!TIP]
> For tracking user context inside Next.js routes, consult the [Next.js Integration Guide](./docs/nextjs.md).

---

## 🏗️ Architecture Model

The package acts as a transparent, high-performance standardization bridge between your code and the OpenTelemetry specifications.

```mermaid
flowchart TD
    subgraph AppServer["Node.js Application Context"]
        A["Your App Code"] -->|1. Uses standard| B["Console & SDK API"]
        B -->|2. Intercepted by| C["@aksparadise/otel-observability"]
        C -->|3. Controls & Configures| D["Official OpenTelemetry SDK"]
    end
    
    subgraph Exporters["High-Performance Pipeline"]
        D -->|Traces (HTTP/OTLP)| E["OTLP Trace Exporter"]
        D -->|Metrics (HTTP/OTLP)| F["OTLP Metric Reader"]
        D -->|Logs (HTTP/OTLP)| G["OTLP Log Exporter"]
    end

    subgraph BackendGateway["Collector Gateway"]
        E & F & G --> H["OTLP Collector (SigNoz, Grafana, custom)"]
    end
    
    subgraph Dashboards["Observability UI"]
        H --> I["SigNoz Dashboard"]
        H --> J["Grafana Tempo / Loki"]
    end
```

---

## 📦 What Gets Standardized

When you adopt `setup()`, your services align with **Observability Contract v1**:

1.  **Distributed Tracing**: Standard W3C Context Propagation format, OTLP exporting, and safe ratio-based sampling.
2.  **Telemetry Metrics**: Periodic, non-blocking metrics exporting.
3.  **Unified Structured Logging**: Correlated JSON formatting with automated trace injection (`trace_id` and `span_id`).
4.  **Automatic Instrumentations**: Pre-configured filters for HTTP, Express, GraphQL, Mongoose, and `ioredis`.
5.  **Data Security**: Instant circular-safe sanitization of PII (redacting fields like `password`, `token`, `apiKey`, and `authorization` headers).

---

## ⚙️ Configuration Reference (Environment Variables)

This library integrates natively into containerized environments (Kubernetes, Docker, AWS ECS) using standard environment variables:

| Environment Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `OTEL_ENABLED` | `boolean` | `false` | Set to `true` to activate OpenTelemetry exporting. |
| `OTEL_BACKEND` | `string` | `"signoz"` | Selected backend endpoint template: `"signoz"`, `"grafana"`, or `"custom"`. |
| `OTEL_SERVICE_NAME` | `string` | `"unknown-service"`| Service identifier for trace grouping. |
| `OTEL_SERVICE_VERSION` | `string` | `"1.0.0"` | Logical semantic version of your microservice. |
| `OTEL_EXPORTER_OTLP_ENDPOINT`| `string` | `"http://localhost:4318"`| Gateway collector endpoint (HTTP) for `"signoz"` or `"custom"`. |
| `GRAFANA_OTEL_ENDPOINT` | `string` | *(Grafana standard)* | Target OTLP endpoint if `OTEL_BACKEND=grafana`. |
| `GRAFANA_API_KEY` | `string` | `""` | Bearer token to authorize Grafana Cloud metrics/logs ingestion. |
| `OTEL_TRACE_SAMPLING_RATIO` | `number` | `1.0` | Sampling ratio (`0.0` to `1.0`). `1.0` is 100% of traces; `0.1` is 10%. |
| `OTEL_ENVIRONMENT` | `string` | `"development"` | Environment tag (`"production"`, `"staging"`, `"development"`). |
| `OTEL_AUTO_START` | `boolean` | `true` | Setting to `false` disables immediate setup, allowing manual `initOtel()` calls. |
| `OTEL_LOG_LEVEL` | `string` | *(unset)* | Set to `"debug"` to expose internal OTel SDK diagnostic logging. |

---

## 💡 Advanced Telemetry Usage

### Custom Tracing Spans

Easily wrap slow asynchronous tasks or critical business operations inside a dedicated tracer span:

```typescript
import { withSpan } from "@aksparadise/otel-observability";

const data = await withSpan("payment.process", async (span) => {
    // Enrich span with business metadata
    span.setAttribute("payment.amount", 49.99);
    span.setAttribute("payment.currency", "USD");

    return await chargeCreditCard();
});
```

---

### Structured Logging

Log directly with the built-in logger to output fully structured, JSON-correlated logs:

```typescript
import { logger } from "@aksparadise/otel-observability";

// Automatically contains active trace_id and span_id if called inside a request
logger.info("Order processed successfully", {
    orderId: "ord_98765",
    itemsCount: 3,
});
```

---

### Custom Metrics Counters & Histograms

Capture runtime performance characteristics by generating standard metrics instruments:

```typescript
import { createCounter, createHistogram } from "@aksparadise/otel-observability";

// 1. Set up metrics instruments
const signupCounter = createCounter("user_signups_total", {
    description: "Total registered accounts",
});
const dbDuration = createHistogram("database_query_duration_ms", {
    description: "Time spent running database queries",
    unit: "ms",
});

// 2. Track business events
signupCounter.add(1, { plan: "enterprise" });

// 3. Monitor performance timings
dbDuration.record(42, { table: "users", operation: "SELECT" });
```

---

## ❌ When to Use Raw OpenTelemetry Instead

We believe in architectural transparency. Avoid using this library if:

1.  You must write data to multiple collector endpoints simultaneously.
2.  You require non-OTLP protocol exporters (e.g., raw Zipkin or Jaeger UDP packets).
3.  You depend on deep internal customizations of the `NodeSDK` provider lifecycle hooks.

---

## 🔒 Trust, Security & Compliance

Observability wrappers should never act as black boxes. We prioritize security and zero-overhead reliability:

*   **Socket.dev Verifiably Safe (100/100 Rating)**: Standardized to use **zero external runtime dependencies** beyond the official OpenTelemetry SDK packages. No custom background collectors or daemon processes are spawned.
*   **Circular-Safe PII Sanitizer**: Features a robust automatic sanitizer to redact sensitive payload parameters before export. It safely detects and intercepts circular object references to guarantee zero `RangeError` overflows.
*   **Opt-Out Log Hijacking**: Disable console monkeypatching at any time by configuring the setup options: `setup({ enableMonkeypatch: false })`.
*   **100% Open Source**: Fully auditable codebase available at [GitHub](https://github.com/aksparadise/otel-observability).

---

## 🧩 Troubleshooting & Diagnostic Checklist

### 1. No traces are appearing in my dashboard
*   **Check `OTEL_ENABLED`**: Ensure `OTEL_ENABLED=true` is set in your environment.
*   **Check Import Order**: Ensure `import "dotenv/config"` and `setup()` are the *first two* lines of your entry file. If libraries like `express` or `mongoose` are loaded before, tracing will fail.
*   **Check Endpoint Port**: Ensure your OTLP gateway endpoint is reachable. Standard OTLP collectors use port **`4318`** (HTTP/JSON). If using port `4317` (gRPC), update your environment to point to `4318`.

### 2. Enabling Internal SDK Diagnostics
If spans are failing to send, enable OpenTelemetry's internal debug logs to see raw connection errors:

```env
OTEL_LOG_LEVEL=debug
```

Alternatively, print raw OpenTelemetry errors to standard output by setting the logger explicitly:

```typescript
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

// Put this at the top of your app to trace connection/payload issues
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

### 3. Connection Errors (`ECONNREFUSED` or `404 Not Found`)
*   If running Node.js in a Docker container, `localhost:4318` resolves to the container itself, not your host machine.
*   **Fix**: Update your `OTEL_EXPORTER_OTLP_ENDPOINT` to point to your Docker gateway (e.g., `http://host.docker.internal:4318`) or your collector service name (e.g., `http://otel-collector:4318`).

---

## 🙋 FAQ

#### Q: How does this package maintain a 100/100 security score?
**A**: By strictly adhering to zero non-essential runtime dependencies and running regular dependency audits (`npm audit` and Socket.dev scanners) to prevent third-party security vulnerabilities.

#### Q: Can I run this package alongside an existing OpenTelemetry configuration?
**A**: To avoid duplication or conflicts, we recommend replacing any manual OTel bootstrapping code with a call to `setup()`. Your existing manual custom spans, loggers, and metrics will continue to work seamlessly.

#### Q: Does this package support Grafana Cloud?
**A**: Yes. Configure `OTEL_BACKEND=grafana`, set `GRAFANA_OTEL_ENDPOINT` to your stack's endpoint, and provide your `GRAFANA_API_KEY`.

---

## 📚 Documentation Directory

| Resource | Description |
| :--- | :--- |
| 📘 [NestJS Integration](./docs/nestjs.md) | Proxy logs setup, Winston/Pino compatibility, custom logs context. |
| 📘 [Next.js Integration](./docs/nextjs.md) | Edge vs. Server runtimes, client/server boundaries, header propagation. |
| 📘 [API Reference](./docs/api.md) | Standard signatures, custom span tracing, metric meters, sanitizers. |
| 📘 [Production Guidelines](./docs/production.md)| Production best practices, rate-limiting, custom sampling, and performance. |

---

## License

[MIT](./LICENSE) &copy; AksParadise
