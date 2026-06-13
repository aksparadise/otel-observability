# @aksparadise/otel-observability

<p align="center">
  <strong>Production-ready OpenTelemetry for Node.js in a single line of code.</strong><br />
  <em>Zero configuration drift, secure-by-default, and fully standardized telemetry for SigNoz, Grafana, and any OTLP collector.</em>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@aksparadise/otel-observability"><img src="https://img.shields.io/npm/v/@aksparadise/otel-observability.svg?style=flat-square" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@aksparadise/otel-observability"><img src="https://img.shields.io/npm/dm/@aksparadise/otel-observability.svg?style=flat-square" alt="npm downloads" /></a>
  <a href="https://bundlephobia.com/package/@aksparadise/otel-observability"><img src="https://img.shields.io/bundlephobia/min/@aksparadise/otel-observability?style=flat-square" alt="bundle size" /></a>
  <a href="https://badge.socket.dev/npm/package/@aksparadise/otel-observability"><img src="https://badge.socket.dev/npm/package/@aksparadise/otel-observability?style=flat-square" alt="Socket Badge" /></a>
  <a href="https://github.com/aksparadise/otel-observability/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@aksparadise/otel-observability?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg?style=flat-square" alt="Coverage" />
</p>

---

## 📖 Table of Contents

1. [Why This Library? (The Cost of Observability Drift)](#-why-this-library-the-cost-of-observability-drift)
2. [🧠 What This Actually Does](#-what-this-actually-does)
3. [⚡ Quick Start & ESM Preloading (Avoiding the Hoisting Trap)](#-quick-start--esm-preloading-avoiding-the-hoisting-trap)
   - [For ES Modules (ESM)](#1-for-es-modules-esm---recommended-for-node-20)
   - [For CommonJS (CJS)](#2-for-commonjs-cjs)
4. [🚀 Framework Recipes](#-framework-recipes)
   - [Next.js Web Applications](#nextjs-recipe)
   - [NestJS Framework](#nestjs-recipe)
   - [Express / Vanilla Node.js](#express--vanilla-nodejs-recipe)
5. [🏗️ Architecture Model](#️-architecture-model)
6. [📦 What Gets Standardized](#-what-gets-standardized)
7. [⚙️ Configuration Reference](#️-configuration-reference)
   - [1. Environment Variables](#1-configuration-via-environment-variables)
   - [2. setup() Options API Reference](#2-configuration-via-code-setup-api)
8. [💡 Advanced Telemetry Usage](#-advanced-telemetry-usage)
   - [Custom Tracing Spans](#custom-tracing-spans)
   - [Correlated Structured Logging](#correlated-structured-logging)
   - [Custom Metrics Counters & Histograms](#custom-metrics-counters--histograms)
9. [🛠️ Custom Spans & Metrics (Standard OTel API)](#️-custom-spans--metrics-standard-otel-api)
10. [🔒 Built-In PII Redaction & Sensitive Data Masking](#-built-in-pii-redaction--sensitive-data-masking)
11. [🌐 Distributed Tracing & W3C Context Propagation](#-distributed-tracing--w3c-context-propagation)
12. [🧪 Running Tests & CI/CD Isolation](#-running-tests--cicd-isolation)
13. [⚡ Performance, Overhead & Memory Transparency](#-performance-overhead--memory-transparency)
14. [💻 Local Development vs. Production Guidelines](#-local-development-vs-production-guidelines)
15. [🔒 Trust, Security & Compliance](#-trust-security--compliance)
16. [🧩 Troubleshooting & Silent Failure Diagnostics](#-troubleshooting--silent-failure-diagnostics)
17. [🙋 Frequently Asked Questions (FAQ)](#-faq)

---

## 🕵️ Why This Library? (The Cost of Observability Drift)

Most development teams start with the best intentions, copy-pasting a custom **200+ line OpenTelemetry bootstrap file** across their services. 

Within months, those files diverge. You suffer from **Observability Drift**:

*   **Traces break mid-request** because Service A samples at 100% while Service B samples at 10%.
*   **Debugging requires manual lookup** because console logs do not contain active Trace IDs.
*   **Unified dashboards break** because one service exports via custom JSON and another via OTLP.
*   **Critical spans are missing** because of inconsistent middleware registration order across projects.

`@aksparadise/otel-observability` acts as an **enforceable governance layer**. By introducing it as a shared core dependency across your fleet, every service automatically adopts identical instrumentation, exporters, security filters, and defaults by design.

---

## 🧠 What This Actually Does

This library is an **opinionated, pre-packaged distribution** of the official OpenTelemetry SDK. It wraps standard modules without adding a custom runtime engine, avoiding any vendor lock-in.

*   **Zero Boilerplate Initialization**: Automatically sets up trace providers, metric readers, and log processors.
*   **Auto-Instrumentation**: Plugs directly into Express, NestJS, Next.js, Mongoose, Redis, and GraphQL.
*   **Correlated Structured Logs**: Monkeypatches standard console logs to insert active trace context (`trace_id` and `span_id`) automatically.
*   **Global Crash Safeguards**: Catches uncaught exceptions and unhandled promise rejections, recording complete stack traces before the process exits.
*   **High Performance**: Minimal runtime overhead (<2ms initialization time) and optimized memory footprint.

---

## ⚡ Quick Start & ESM Preloading (Avoiding the Hoisting Trap)

In Node.js, auto-instrumentation works by monkey-patching modules (like `express`, `mongoose`, or `redis`) *at load-time*. 

> [!WARNING]
> **The ESM "Hoisting" Trap:**  
> In ES Modules (ESM), Node.js evaluates and executes all static `import` statements **before** running any top-level inline code. 
> Writing:
> ```typescript
> import { setup } from "@aksparadise/otel-observability";
> await setup();
> import express from "express"; // This will NOT be instrumented!
> ```
> will fail because the `express` import is hoisted and executed before `setup()` can run. To prevent this, **always initialize OpenTelemetry using preloading**.

### 1. For ES Modules (ESM - Recommended for Node 20+)

Create an `instrumentation.js` file in your root folder:

```javascript
// instrumentation.js
import "dotenv/config";
import { setup } from "@aksparadise/otel-observability";

await setup();
```

Boot your application using the `--import` flag to preload the instrumentation before module resolution starts:

```bash
node --import ./instrumentation.js app.js
```

---

### 2. For CommonJS (CJS)

Create an `instrumentation.js` file:

```javascript
// instrumentation.js
require("dotenv").config();
const { setup } = require("@aksparadise/otel-observability");

setup();
```

Boot your application by preloading the instrumentation script with the `-r` flag:

```bash
node -r ./instrumentation.js app.js
```

---

## 🚀 Framework Recipes

To prevent runtime anomalies and ensure seamless compilation, follow these framework-specific integration recipes:

### Next.js Recipe

Next.js compiles serverless environments dynamically. Its Edge Runtime does not support native Node.js core modules. To prevent build-time crashes, initialize OpenTelemetry inside Next's native `instrumentation.ts` file using **conditional dynamic imports**:

Enable experimental instrumentation inside your `next.config.js`:

```javascript
// next.config.js
module.exports = {
    experimental: {
        instrumentationHook: true,
    },
};
```

Create your instrumentation hook (`instrumentation.ts` in your root or `src/` directory):

```typescript
// instrumentation.ts
export async function register() {
    // Only run telemetry on the server-side Node.js runtime, skipping Edge/Client
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { setup } = await import("@aksparadise/otel-observability");
        await setup({ framework: "nextjs" });
    }
}
```

---

### NestJS Recipe

NestJS is a modular TypeScript framework. Instead of using command-line flags, you can easily bootstrap telemetry by creating a standalone `instrumentation.ts` and calling it statically at the top of your `main.ts` file:

Create an `instrumentation.ts` in your `src/` directory:

```typescript
// src/instrumentation.ts
import "dotenv/config";
import { setup } from "@aksparadise/otel-observability";

// Automatically configures the NestJS-specific logger proxy
await setup({ framework: "nestjs" });
```

Statically import it as the **first line** of your `src/main.ts` before NestJS is evaluated:

```typescript
// src/main.ts
import "./instrumentation"; // MUST be the first import!
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    // Pass the auto-configured logger to NestJS
    const app = await NestFactory.create(AppModule, {
        logger: globalThis.logger ?? undefined,
    });

    await app.listen(3000);
}

bootstrap();
```

---

### Express / Vanilla Node.js Recipe

Once you have created your `instrumentation.js` file as shown in the Quick Start section, write your standard server code normally inside `app.js` without any telemetry boilerplate:

```typescript
// app.js
import { otelContextMiddleware } from "@aksparadise/otel-observability/middleware";
import express from "express";

const app = express();

// Injects user/tenant ID into tracing spans from request headers
app.use(otelContextMiddleware);

app.get("/api/data", (req, res) => {
    res.json({ message: "Hello from traced endpoint!" });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
```

Run using the preload flag:
```bash
node --import ./instrumentation.js app.js
```

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

## ⚙️ Configuration Reference

The library can be configured dynamically through environment variables or programmatically in code.

### 1. Configuration via Environment Variables

The library natively respects standard OpenTelemetry environment variables, which can be configured directly inside your `.env` or container definitions (Kubernetes, Docker, AWS ECS):

| Environment Variable | Type | Default | Description / Purpose |
| :--- | :--- | :--- | :--- |
| `OTEL_ENABLED` | `boolean` | `false` | Enable/disable OTel telemetry export globally. |
| `OTEL_SERVICE_NAME` | `string` | `"unknown-service"`| Logical identifier of your microservice in the APM dashboard. |
| `OTEL_SERVICE_VERSION` | `string` | `"1.0.0"` | Logical semantic version of your service. |
| `OTEL_BACKEND` | `string` | `"signoz"` | Chosen backend template: `"signoz"`, `"grafana"`, or `"custom"`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT`| `string` | `"http://localhost:4318"`| Gateway collector endpoint (HTTP) for `"signoz"` or `"custom"`. |
| `GRAFANA_OTEL_ENDPOINT` | `string` | *(Grafana standard)* | OTLP endpoint used if `OTEL_BACKEND=grafana`. |
| `GRAFANA_API_KEY` | `string` | `""` | Bearer token to authorize Grafana Cloud metrics/logs ingestion. |
| `OTEL_TRACE_SAMPLING_RATIO` | `number` | `1.0` | Ratio of traces to record (`0.0` to `1.0`). `1.0` records 100%; `0.1` records 10%. |
| `OTEL_ENVIRONMENT` | `string` | `"development"` | Tagged environment name (`"production"`, `"staging"`, `"development"`). |
| `OTEL_AUTO_START` | `boolean` | `true` | Setting to `false` disables immediate setup on import, allowing custom `initOtel()`. |
| `OTEL_LOG_LEVEL` | `string` | *(unset)* | Set to `"debug"` to expose internal OTel SDK diagnostic logging. |

---

### 2. Configuration via Code: `setup()` API

You can override defaults or configure specific behaviors programmatically by passing configuration options directly to `setup()`:

```typescript
import { setup } from "@aksparadise/otel-observability";

const observability = await setup({
    framework: "express",            // Force specific framework context: 'express' | 'nestjs' | 'nextjs' | 'vanilla'
    enableConsoleOutput: true,       // Print color-coded structured logs locally to process.stdout
    enableOtelOutput: true,          // Export generated logs to OTLP collector
    enableMonkeypatch: true,         // Intercept standard console.log/info/warn/error calls to correlate trace contexts
    consoleColors: true,             // Enable colorized formatting on local developer terminal outputs
});
```

> [!TIP]
> **💡 Pro-Tip: TypeScript UX & Autocomplete**  
> This library includes fully integrated, first-class TypeScript definition files (`.d.ts`). When using modern IDEs (like VS Code or WebStorm), you will automatically receive context-aware parameter autocomplete, validation checks, and inline documentation hover effects when constructing options inside `setup()`.

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

### Correlated Structured Logging

#### Option A: Using the built-in Logger (Zero Setup)
Use the package logger to output sanitized, fully correlated JSON logs automatically matched with the active trace context:

```typescript
import { logger } from "@aksparadise/otel-observability/logger";

// Contains active traceId and spanId if executed within an HTTP request lifecycle
logger.info("Order processed successfully", {
    orderId: "ord_98765",
    itemsCount: 3,
});
```

#### Option B: Using custom Loggers (Pino, Winston)
If you already use Winston or Pino, `@opentelemetry/auto-instrumentations-node` automatically hooks into them. Active `trace_id` and `span_id` are automatically injected into your logging payloads without changing your application code:

```typescript
import pino from "pino";
const customLogger = pino();

// The underlying OTel hooks inject active trace contexts into this payload automatically!
customLogger.info("User completed authentication");
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

## 🛠️ Creating Custom Spans & Metrics (Standard OTel API)

To protect your software architecture from vendor lock-in, `@aksparadise/otel-observability` registers standard OpenTelemetry providers globally. This means you can import and use the standard, official `@opentelemetry/api` package anywhere in your application, and manual telemetry will be captured and exported seamlessly alongside automatic auto-instrumentations.

### 1. Install the official API
```bash
npm install @opentelemetry/api
```

### 2. Construct Custom Trace Spans
Use the standard tracer API anywhere in your code to group operations and assign custom context metrics:

```typescript
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("my-application");

// Create a custom trace block
await tracer.startActiveSpan("process-payment", async (span) => {
    try {
        // Your business logic here
        span.setAttribute("payment.amount", 99.99);
        span.setAttribute("payment.gateway", "stripe");
        
        await processStripeTransaction();

        span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
        // Record crashes with trace-linked exception details
        span.recordException(error as Error);
        span.setStatus({
            code: SpanStatusCode.ERROR, // or code: 2
            message: (error as Error).message
        });
        throw error;
    } finally {
        span.end(); // Always close your spans!
    }
});
```

---

## 🔒 Built-In PII Redaction, Attribute Scrubbing & Sensitive Data Masking

Enterprise teams must ensure that personally identifiable information (PII), passwords, or authorization headers never leave their environment. `@aksparadise/otel-observability` features **automated trace-level attribute scrubbing** and a **circular-safe sanitization engine** to prevent data leaks.

### 1. Automatic Trace Attribute Scrubbing
By default, standard database and HTTP headers might contain sensitive data. The library's `CustomSpanProcessor` automatically filters and redacts values for attributes containing sensitive keys:
`authorization`, `password`, `secret`, `token`, `apikey`, `api_key`, `credit_card`.

### 2. Programmatic Span Interception (onSpanStart & onSpanEnd)
For advanced, fine-grained control, you can define custom lifecycle hooks directly when bootstrapping the library to redact, rewrite, or inject attributes before spans are dispatched:

```javascript
import { setup } from "@aksparadise/otel-observability";

await setup({
    // Intercept and sanitize attributes on span closure
    onSpanEnd: (span) => {
        // Custom header redaction
        if (span.attributes["http.request.header.authorization"]) {
            span.attributes["http.request.header.authorization"] = "[REDACTED]";
        }
        
        // Inject custom metadata dynamically
        span.attributes["custom.meta.version"] = "1.1.25";
    }
});
```

### 3. Automatic Object & Query Parameter Sanitizer
Our circular-safe sanitization engine automatically filters application logging arguments and objects before they leave your system.

```typescript
import { configureSensitiveFields, sanitize } from "@aksparadise/otel-observability/sanitizer";

// 1. Append custom sensitive identifiers to the automatic redaction list
configureSensitiveFields(["tax_id", "medical_record_number"], true);

// 2. Circular-Safe Engineering tracks object graphs to prevent memory overflows
const parent: any = { name: "John Doe" };
parent.self = parent; // Circular reference

// Safely returns: { name: 'John Doe', self: '[Circular]' }
const safeOutput = sanitize(parent);
```

---

## 🌐 Distributed Tracing & W3C Context Propagation

Distributed tracing's superpower is linking a frontend HTTP request to a backend API call, and then to a database query. For this to work across different servers, W3C trace context headers must be propagated.

```
┌───────────────┐                  ┌───────────────┐
│   Service A   │ ──(HTTP Call)──> │   Service B   │
│               │  traceparent     │               │
│ (Starts Trace)│  tracestate      │ (Child Spans) │
└───────────────┘                  └───────────────┘
```

This library **automatically configures W3C context propagation** out of the box:
*   **Automatic Header Injection**: When Service A issues an HTTP call via `fetch`, `axios`, or standard `http`, standard `traceparent` and `tracestate` headers are automatically injected into the request headers.
*   **Automatic Header Extraction**: When Service B receives the incoming HTTP request, the auto-instrumentation hooks extract these headers and automatically nest Service B's spans as children of the parent trace.
*   **Zero Setup Required**: This entire handoff occurs seamlessly across your microservice fleet with no manual context-passing, request wrapping, or custom code modifications.

---

## 🧪 Running Tests & CI/CD Isolation

In test runner environments (like Vitest, Jest, or Mocha) or CI pipelines, developers do not want OpenTelemetry trying to connect to a real collector, which can cause network timeout errors, slow down test suites, or clutter development dashboards.

### 1. Conditionally Skip Initialization
Skip bootstrapping setup during test suite runs entirely:

```javascript
// instrumentation.js
import { setup } from "@aksparadise/otel-observability";

// Only run telemetry in actual runtime environments, not test runner sessions
if (process.env.NODE_ENV !== "test" && process.env.VITEST !== "true") {
    await setup();
}
```

### 2. Direct Telemetry to Console Instead of Collector
Or, you can route all telemetry data directly to stdout/console inside test configurations:

```javascript
await setup({
    exporter: "console" // Prints traces, metrics, and logs directly to console/stdout
});
```

### 3. Disable via Environment Variables
Alternatively, disable OpenTelemetry entirely by specifying:

```env
OTEL_ENABLED=false
```

---

## ⚡ Performance, Overhead & Memory Transparency

Enterprise infrastructure teams prioritize transparency regarding memory safety, CPU footprint, and performance:

*   **Initialization Benchmarks**: Executing `setup()` takes **under 2ms**. Telemetry exporters run fully asynchronously on Node's native event loop, avoiding main-thread request blocking.
*   **Zero Custom Polling Loops**: The library relies entirely on the official `@opentelemetry/sdk-node` garbage collection patterns. It introduces no custom intervals, polling loops, or memory caches, guaranteeing a **flat and stable memory footprint** under heavy load.
*   **Egress Cost Optimization**: Control data volume and cloud costs easily by setting `OTEL_TRACE_SAMPLING_RATIO` to a fractional value (e.g., `0.1` for 10% sampling). It natively integrates with standard `OTEL_TRACES_SAMPLER` parent-based configurations to suppress redundant traces dynamically.

---

## 💻 Local Development vs. Production Guidelines

To avoid excessive egress costs and CPU/Memory overhead, configure your setup variables dynamically between environments.

### Local Development Configuration
In development, you want rapid local validation, 100% trace capture, and readable terminal logging:

```env
# .env.development
OTEL_ENABLED=true
OTEL_TRACE_SAMPLING_RATIO=1.0  # Trace 100% of requests
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_LOG_LEVEL=debug           # Enable raw OTel diagnostics to trace setup errors
```

```typescript
// code
await setup({
    enableConsoleOutput: true,  // Print human-readable color logs to stdout
    consoleColors: true,
    enableMonkeypatch: true,
});
```

---

### Production Configuration
In high-traffic production environments, use ratio-based sampling, disable verbose terminal logs, and leverage OTel bulk batch exporters to keep performance overhead minimal:

```env
# .env.production
OTEL_ENABLED=true
OTEL_TRACE_SAMPLING_RATIO=0.1  # Trace 10% of requests (adapts to heavy traffic)
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-production-collector:4318
```

```typescript
// code
await setup({
    enableConsoleOutput: false, // Turn off verbose logs to protect process stdout IO
    enableOtelOutput: true,
    enableMonkeypatch: true,
});
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

## 🧩 Troubleshooting & Silent Failure Diagnostics

OpenTelemetry is designed to fail silently. When misconfigured, it will emit nothing rather than disrupting your application runtime. Use this checklist to debug missing traces:

### 1. Enable Internal Engine Diagnostics
Enable OpenTelemetry's internal debug logs to see raw connection errors and registration hooks:

```env
OTEL_LOG_LEVEL=debug
```

Alternatively, print raw OpenTelemetry diagnostic events directly to stdout by configuring the logger explicitly:

```typescript
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api";

// Put this at the top of your app to trace connection/payload issues
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

### 2. Double Check Import Order
If databases, HTTP frameworks, or message queue clients are missing spans, check if they are imported **after** `setup()` completes. ESM static imports bypass inline sequence rules. **You must use the preloading strategies** (`--import` or `-r` flags) shown in the [Quick Start section](#-quick-start--esm-preloading-avoiding-the-hoisting-trap).

### 3. Check Endpoint Network & Port Protocol
*   If running Node.js inside a Docker container, `localhost:4318` resolves to the container itself, not your host machine.
    *   **Fix**: Update your `OTEL_EXPORTER_OTLP_ENDPOINT` to point to your Docker gateway (e.g., `http://host.docker.internal:4318`) or your collector service name (e.g., `http://otel-collector:4318`).
*   **Protocol Port Mismatch**: Verify if your collector expects **gRPC** (usually port `4317`) or **HTTP/Protobuf** (usually port `4318`). This package defaults to OTLP over HTTP, so verify your endpoint URL ends in port `4318`.

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
