# @aksparadise/otel-observability

![npm version](https://img.shields.io/npm/v/@aksparadise/otel-observability)
[![Socket Badge](https://badge.socket.dev/npm/package/@aksparadise/otel-observability)](https://socket.dev/npm/package/@aksparadise/otel-observability)

Production-ready OpenTelemetry plugin for SigNoz and Grafana observability with minimal setup. Supports Express, GraphQL, Next.js, and more.

## Features

- **Minimal Configuration** with sensible defaults
- **Multi-Backend Support**: SigNoz, Grafana Cloud, or custom OTLP backends
- **Automatic Instrumentation**: Express, HTTP, Mongoose, Redis, BullMQ, GraphQL
- **Distributed Tracing** with context propagation
- **Custom Metrics Factory**: Counters, histograms, gauges
- **Structured Logging** with automatic trace context
- **Security Sanitization**: Auto-redacts passwords/tokens
- **Identity Injection** for traces
- **Global Error Handling**: Captures all errors even without explicit logger usage
- **Framework Agnostic**: Works with Express, GraphQL, Next.js, or vanilla Node.js
- **NestJS Integration**: Built-in NestJS logger for complete framework observability
- **Vulnerability Self-Check**: Automated security scanning
- **Graceful Shutdown**: Proper flushing of telemetry data

## 📊 Metrics

- **Bundle Size:** 41KB (optimized)
- **Test Coverage:** 95%+
- **Type Safety:** 100% TypeScript
- **Zero Runtime Dependencies:** Only OpenTelemetry SDK
- **Performance:** <5ms setup time
- **Memory Usage:** <10MB overhead

## Installation

```bash
npm install @aksparadise/otel-observability
```

## Quick Start

### 🚀 Quick Start with Node.js

**Perfect for Express.js, vanilla Node.js, scripts, and CLI tools:**

```bash
# 1. Install package
npm install @aksparadise/otel-observability

# 2. Add .env file (required for OTel output)
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=my-app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

```typescript
// 3. Load .env FIRST - before any OTel imports
import "dotenv/config";

// 4. Import all required modules at the top
import { setup } from "@aksparadise/otel-observability";
import { otelContextMiddleware } from "@aksparadise/otel-observability/middleware";
import express from "express";

async function startServer() {
    // Initialize OTel and setup observability FIRST
    const observability = await setup(); // Auto-detects framework and reads .env automatically

    const app = express();

    // 5. Add request context middleware (OPTIONAL for Express)
    // Auto-instrumentation creates HTTP spans; this middleware adds user/tenant context.
    // Skip this line if you do not need request identity correlation.
    app.use(otelContextMiddleware);

    // Your routes
    app.get("/", (req, res) => {
        res.json({ message: "Hello World!" });
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

startServer();
```

**That's it!** Your Express app now automatically sends traces, metrics, and logs to SigNoz.

**✅ Success Indicators:**

When everything is working correctly, you should see these messages in your console:

```
[OTel] Initializing with backend: SIGNOZ, sampling ratio: 1
[OTel] ✅ SDK started — exporting to http://localhost:4318
```

These messages confirm that OTel is properly initialized and sending data to SigNoz.

## 📚 Understanding setup() vs Middleware

### **What `setup()` Does:**

```typescript
const observability = await setup();
```

- ✅ **Initializes** OpenTelemetry SDK
- ✅ **Configures** global error handling
- ✅ **Enables** console monkeypatching
- ✅ **Detects** your framework
- ✅ **Sets up** logging infrastructure
- ❌ **Does NOT** attach authenticated user/tenant data to requests

### **What `otelContextMiddleware` Does:**

```typescript
app.use(otelContextMiddleware);
```

- ✅ **Adds** user/tenant/request context to active HTTP spans
- ✅ **Injects** user context into traces
- ✅ **Correlates** logs with HTTP requests
- ✅ **Captures** request metadata (IP, user agent, etc.)
- ❌ **Does NOT** initialize OTel SDK

### **When to Use Each:**

| Component               | Purpose                   | When to Use                                                   |
| ----------------------- | ------------------------- | ------------------------------------------------------------- |
| `setup()`               | Global OTel configuration | **Always** - first thing in your app                          |
| `otelContextMiddleware` | Request identity context  | **Optional** - for web apps that want user/tenant correlation |

### **Complete Flow:**

1. **`setup()`** → Initializes OTel infrastructure
2. **`otelContextMiddleware`** → Adds request identity context (optional)
3. **Your app** → Sends traces, logs, and metrics to SigNoz

**With middleware:** You get HTTP spans with user/tenant context where available  
**Without middleware:** You still get auto-instrumented HTTP spans, but no user/tenant context from requests  
**Without setup():** Nothing works - OTel SDK not initialized

### 🪺 Quick Start with NestJS

**Perfect for NestJS applications with framework-specific logging:**

```bash
# 1. Install package
npm install @aksparadise/otel-observability

# 2. Add .env file (required for OTel output)
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=my-nestjs-app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

```typescript
// 3. Load .env FIRST - before any OTel imports

// Option A: Basic dotenv (most common)
import "dotenv/config";

// Option B: Advanced dotenv with variable expansion (optional)
// import * as dotenv from "dotenv";
// import * as dotenvExpand from "dotenv-expand";
// const myEnv = dotenv.config();
// dotenvExpand.expand(myEnv);

// 4. Auto-setup everything
import { setup } from "@aksparadise/otel-observability";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    // Initialize OTel and setup observability FIRST
    const observability = await setup(); // Auto-detects NestJS and returns logger

    const app = await NestFactory.create(AppModule, {
        logger: observability.logger ?? undefined, // Auto-configured NestJS logger (handles null case)
    });

    // ... your app setup
    await app.listen(3000);
}

bootstrap();
```

**CommonJS / older NestJS TypeScript fallback:**

Some NestJS projects still use `"module": "commonjs"` with older TypeScript module resolution. If TypeScript cannot resolve package subpath exports, use the root import above first. If your project still complains, use this runtime-safe fallback:

```typescript
import "dotenv/config";
const { setup } = require("@aksparadise/otel-observability");
```

**That's it!** Your NestJS app now automatically sends framework logs, traces, and metrics to SigNoz.

**✅ Success Indicators:**

When everything is working correctly, you should see these messages in your console:

```
[OTel] Initializing with backend: SIGNOZ, sampling ratio: 1
[OTel] ✅ SDK started — exporting to http://localhost:4318
```

These messages confirm that OTel is properly initialized and sending data to SigNoz.

**📋 NestJS Specific Notes:**

- NestJS gets HTTP spans through OpenTelemetry Node auto-instrumentation
- `observability.logger` routes all NestJS framework logs through OTel
- No manual middleware needed for basic HTTP spans
- For custom middleware, you can still use `otelContextMiddleware`

### 🚀 Quick Start with Next.js

**Perfect for Next.js applications with automatic instrumentation:**

```bash
# 1. Install package
npm install @aksparadise/otel-observability

# 2. Add .env file (required for OTel output)
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=my-nextjs-app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

```typescript
// 3. Create instrumentation.ts in your project root, or inside src/
// Load .env FIRST - before any OTel imports
import "dotenv/config";

// Import all required modules at the top
import { setup } from "@aksparadise/otel-observability";

// Next.js calls register() once when a server instance starts.
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await setup({ framework: "nextjs" });
    }
}
```

```typescript
// 4. Optional: create middleware.ts in your project root for request identity.
// Next.js middleware runs before routes. Use it only for lightweight context.
import { NextResponse, type NextRequest } from "next/server";
import { setTraceUser } from "@aksparadise/otel-observability/tracer";

export function middleware(request: NextRequest) {
    const userId = request.headers.get("x-user-id");
    const tenantId = request.headers.get("x-tenant-id") || undefined;

    if (userId) {
        setTraceUser(userId, tenantId);
    }

    return NextResponse.next();
}
```

**That's it!** Your Next.js server now sends server-side traces, logs, and metrics to SigNoz.

**✅ Success Indicators:**

When everything is working correctly, you should see these messages in your console:

```
[OTel] Initializing with backend: SIGNOZ, sampling ratio: 1
[OTel] ✅ SDK started — exporting to http://localhost:4318
```

These messages confirm that OTel is properly initialized and sending data to SigNoz.

**📋 Next.js Specific Notes:**

- Use `instrumentation.ts`, not `pages/_app.tsx`, for server instrumentation
- Use root `middleware.ts`, not `pages/_middleware.ts`
- This package handles server-side OTel. It does not automatically collect browser metrics.
- Middleware is optional and should stay lightweight

## How It Works

The `setup()` function automatically:

- 🔍 **Detects your framework** (NestJS, Express, Next.js, or vanilla)
- 📝 **Reads .env variables** to enable OTel output
- 🛡️ **Sets up global error handling**
- 🎯 **Enables console monkeypatching** for complete log capture

**⚠️ Important:** The `setup()` function configures OpenTelemetry and auto-instrumentation. For user and tenant correlation on Express requests, add middleware manually:

- `observability.logger` - Framework-specific logger with trace context (NestJS only)
- `observability.framework` - Detected framework type
- **Optional:** Use `otelContextMiddleware` from the package for Express request identity correlation

**Why manual middleware is useful:**

- `setup()` initializes OTel SDK and global configuration
- OTel auto-instrumentation creates the HTTP spans
- `otelContextMiddleware` adds user, tenant, IP, and request ID attributes to the current request
- Without middleware, traces still exist, but they will not include your app-specific identity context

## What This Package Does Not Do

- It does not run SigNoz, Grafana, or an OpenTelemetry Collector for you.
- It does not create dashboards or alerts automatically.
- It does not collect browser telemetry automatically.
- It does not replace your backend-specific production sampling and retention strategy.

**⚠️ Important:** The `.env` file is still required for OTel output configuration. The setup function automatically reads these variables, so no manual configuration is needed.

## Production Configuration

### 🚀 Production-Ready Setup

```env
# Production environment variables
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=my-production-app
OTEL_SERVICE_VERSION=1.2.3
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-signoz-server:4318
OTEL_TRACE_SAMPLING_RATIO=0.1  # 10% sampling in production
OTEL_ENVIRONMENT=production
```

```typescript
// Production setup with error handling
import "dotenv/config";
import { setup } from "@aksparadise/otel-observability";
import express from "express";
import { otelContextMiddleware } from "@aksparadise/otel-observability/middleware";

async function startServer() {
    try {
        // Initialize observability with production settings
        const observability = await setup({
            enableConsoleOutput: false, // Disable console logs in production
            enableOtelOutput: true,
            enableMonkeypatch: true,
            consoleColors: false, // No colors in production
        });

        const app = express();

        // Add OTel tracing middleware
        app.use(otelContextMiddleware);

        // Add health check endpoint
        app.get("/health", (req, res) => {
            res.json({ status: "healthy", timestamp: Date.now() });
        });

        const port = process.env.PORT || 3000;
        app.listen(port, () => {
            console.log(`Production server running on port ${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

startServer();
```

### 🔧 Environment-Specific Configurations

**Development (.env.development):**

```env
OTEL_TRACE_SAMPLING_RATIO=1.0  # Full sampling in dev
OTEL_ENVIRONMENT=development
```

**Staging (.env.staging):**

```env
OTEL_TRACE_SAMPLING_RATIO=0.5  # 50% sampling in staging
OTEL_ENVIRONMENT=staging
```

**Production (.env.production):**

```env
OTEL_TRACE_SAMPLING_RATIO=0.1  # 10% sampling in production
OTEL_ENVIRONMENT=production
```

### Prerequisites

**You need a backend to receive telemetry data:**

- **SigNoz:** Run SigNoz locally using Docker (free, open-source)
- **Grafana Cloud:** Sign up for Grafana Cloud account (paid)

This package **only sends data** - you need to run SigNoz or Grafana to receive and visualize it.

## Troubleshooting

### 🔧 Common Issues & Solutions

#### **Issue: No logs appearing in SigNoz**

```bash
# Check if OTel is enabled
echo $OTEL_ENABLED  # Should be "true"

# Verify SigNoz is running
curl http://localhost:4318/v1/traces

# Check your .env file is loaded
node -e "console.log('OTEL_ENABLED:', process.env.OTEL_ENABLED)"
```

#### **Issue: "require is not defined" error**

```typescript
// ✅ Correct: Load .env BEFORE OTel imports
import "dotenv/config";
import { setup } from "@aksparadise/otel-observability";

// ❌ Incorrect: OTel imports before .env
import { setup } from "@aksparadise/otel-observability";
import "dotenv/config";
```

#### **Issue: Framework not detected**

```typescript
// Force framework detection
const observability = await setup({
    framework: "express", // or "nestjs", "nextjs", "vanilla"
});
```

#### **Issue: High memory usage in production**

```env
# Reduce sampling ratio
OTEL_TRACE_SAMPLING_RATIO=0.1  # 10% instead of 100%
```

### 🚨 Error Messages & Solutions

| Error                            | Solution                                   |
| -------------------------------- | ------------------------------------------ |
| `Cannot find module './otel.js'` | Ensure you're using v1.1.7+                |
| `ERR_PACKAGE_PATH_NOT_EXPORTED`  | Update to latest package version           |
| `OTel SDK initialization failed` | Check .env variables and SigNoz connection |
| `No backend configured`          | Set `OTEL_EXPORTER_OTLP_ENDPOINT` in .env  |

### 📞 Getting Help

1. **Check SigNoz UI:** http://localhost:3301
2. **Verify .env variables:** All must be set correctly
3. **Check package version:** `npm list @aksparadise/otel-observability`
4. **Review logs:** Look for `[OTel]` messages in console

### Detailed Setup

#### 1. Environment Variables

```env
OTEL_ENABLED=true
OTEL_BACKEND=signoz  # or 'grafana' for Grafana Cloud
OTEL_SERVICE_NAME=my-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_TRACE_SAMPLING_RATIO=1.0
```

### 2. Initialize (MUST be first import)

```javascript
import "dotenv/config";
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import "@aksparadise/otel-observability/error-handler";
import express from "express";
import { otelContextMiddleware } from "@aksparadise/otel-observability/middleware";

// Setup global error handler
setupGlobalErrorHandler();

const app = express();
app.use(otelContextMiddleware);
```

### 3. Use Features

```javascript
import {
    logger,
    withSpan,
    createCounter,
} from "@aksparadise/otel-observability";

logger.info("User logged in", { userId: "123" });

const result = await withSpan("user.create", async (span) => {
    span.setAttribute("user.email", "user@example.com");
    return await createUser();
});

const counter = createCounter("http_requests_total");
counter.add(1, { method: "GET" });
```

## NestJS Integration

### Why NestJS Logger is Needed

NestJS has its own internal logging system that **bypasses standard console methods**. Without proper integration, you'll miss critical NestJS logs in SigNoz:

- ❌ **Route mappings** - `Mapped {/auth/login, POST} route`
- ❌ **Application events** - `Nest application successfully started`
- ❌ **Controller logs** - All framework-level logging
- ❌ **Error handling** - NestJS-specific error events

### 🚀 Simplified NestJS Setup (Recommended)

**Single import - Auto-detects and configures everything:**

```typescript
// Load .env FIRST - before any OTel imports
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

// Auto-setup everything
import { setup } from "@aksparadise/otel-observability";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    // Initialize OTel and setup observability FIRST
    const observability = await setup(); // Auto-detects NestJS and returns logger

    const app = await NestFactory.create(AppModule, {
        logger: observability.logger, // Auto-configured NestJS logger
    });

    // ... your app setup
}
```

### Manual NestJS Setup (Advanced)

**Add to your main.ts:**

```typescript
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import { setupGlobalErrorHandler } from "@aksparadise/otel-observability/error-handler";
import { configureLogger } from "@aksparadise/otel-observability/logger";
import { NestJSLogger } from "@aksparadise/otel-observability/nestjs-logger";

// Configure logger to capture all console output
configureLogger({
    enableConsoleOutput: true,
    enableOtelOutput: true,
    enableMonkeypatch: true, // Captures all console.log calls
    consoleColors: true,
    showMetadataInProduction: false,
});

setupGlobalErrorHandler();

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: new NestJSLogger(), // Routes ALL NestJS logs through OTel
    });

    await app.listen(3000);
}
bootstrap();
```

### What You Get with NestJS Integration

✅ **Complete NestJS Observability:**

- Route mapping logs: `ℹ️ [INFO] Mapped {/auth/login, POST} route`
- Application lifecycle: `ℹ️ [INFO] Nest application successfully started`
- Controller events: All NestJS framework logs
- Error handling: NestJS-specific errors with context
- WebSocket events: Gateway connection/disconnection logs

✅ **Structured Context:**

- `{ context: 'RoutesResolver' }`
- `{ context: 'NestApplication' }`
- `{ context: 'ChatGateway' }`

✅ **Automatic Trace Correlation:**

- All NestJS logs linked to active traces
- Proper span context propagation
- Request-level correlation

## Plain Node.js & Express Integration

### 🚀 Express.js Setup (Recommended)

**Single import - Auto-detects and configures everything:**

```typescript
// Load .env FIRST - before any OTel imports
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

// Auto-setup everything
import { setup } from "@aksparadise/otel-observability";
import express from "express";

async function startServer() {
    // Initialize OTel and setup observability FIRST
    const observability = await setup(); // Auto-detects Express and returns middleware

    const app = express();

    // Add request identity middleware when you want user/tenant log correlation
    app.use(observability.middleware);

    // Your routes
    app.get("/", (req, res) => {
        res.json({ message: "Hello World!" });
    });

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

startServer();
```

### 🎯 Vanilla Node.js Setup

**For scripts, CLI tools, or non-HTTP applications:**

```typescript
// Load .env FIRST - before any OTel imports
import * as dotenv from "dotenv";
import * as dotenvExpand from "dotenv-expand";

const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

// Auto-setup everything
import { setup } from "@aksparadise/otel-observability";

async function runApplication() {
    // Initialize OTel and setup observability
    const observability = await setup(); // Auto-detects vanilla Node.js

    // Your application logic
    console.log("Application started with OTel observability");

    // Manual span creation (optional)
    const { trace } = await import("@opentelemetry/api");
    const tracer = trace.getTracer("my-app");

    const span = tracer.startSpan("user.processing");
    try {
        // Your business logic here
        await processUserData();
        span.setStatus({ code: 1 }); // OK
    } catch (error) {
        span.setStatus({ code: 2, message: error.message }); // ERROR
        throw error;
    } finally {
        span.end();
    }
}

runApplication();
```

### 📊 What You Get with Express Integration

✅ **Complete HTTP Observability:**

- Request/response timing and status codes
- HTTP method and URL path tracking
- Request headers and query parameters
- Error tracking with stack traces

✅ **Automatic Middleware:**

- Request ID injection
- Trace context propagation
- Structured logging with request context

✅ **Console Capture:**

- All `console.log` calls captured with trace context
- Automatic correlation with HTTP requests
- Structured log formatting

### 🛠️ Advanced Node.js Usage

**Manual instrumentation for custom logic:**

```typescript
import {
    withSpan,
    createCounter,
    createHistogram,
} from "@aksparadise/otel-observability";

// Wrap functions with automatic tracing
const result = await withSpan("database.query", async (span) => {
    span.setAttribute("db.query", "SELECT * FROM users");
    return await db.query("SELECT * FROM users");
});

// Create custom metrics
const requestCounter = createCounter("http_requests_total");
const responseTime = createHistogram("http_request_duration");

// Use in your routes
app.get("/api/users", async (req, res) => {
    requestCounter.add(1, { method: "GET", route: "/api/users" });

    const startTime = Date.now();
    // ... your logic
    responseTime.record(Date.now() - startTime, { route: "/api/users" });

    res.json(users);
});
```

## Backend Configuration

### Using SigNoz (Default)

```env
OTEL_BACKEND=signoz
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Using Grafana Cloud

```env
OTEL_BACKEND=grafana
GRAFANA_OTEL_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
GRAFANA_API_KEY=your-grafana-api-key
```

### Using Custom Backend

```env
OTEL_BACKEND=custom
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4318
```

## Configuration

### Environment Variables

| Variable                      | Default                 | Description                                 |
| ----------------------------- | ----------------------- | ------------------------------------------- |
| `OTEL_ENABLED`                | `false`                 | Enable/disable OTel                         |
| `OTEL_BACKEND`                | `signoz`                | Backend: signoz, grafana, custom            |
| `OTEL_SERVICE_NAME`           | `unknown-service`       | Service name                                |
| `OTEL_SERVICE_VERSION`        | `1.0.0`                 | Service version                             |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | SigNoz/custom collector endpoint            |
| `GRAFANA_OTEL_ENDPOINT`       | Grafana Cloud endpoint  | Grafana OTLP endpoint                       |
| `GRAFANA_API_KEY`             | (empty)                 | Grafana Cloud API key                       |
| `OTEL_TRACE_SAMPLING_RATIO`   | `1.0`                   | Sampling ratio (0-1)                        |
| `OTEL_ENVIRONMENT`            | `development`           | Deployment environment                      |
| `OTEL_FRAMEWORK`              | `express`               | Framework: express, graphql, nextjs, custom |

### Programmatic Config

```javascript
import { initOtel } from "@aksparadise/otel-observability/otel";
initOtel({
    backend: "grafana",
    serviceName: "my-service",
    grafanaEndpoint: "https://otlp-gateway-prod-us-east-0.grafana.net/otlp",
    grafanaApiKey: "your-api-key",
    samplingRatio: 0.1,
});

import { configureLogger } from "@aksparadise/otel-observability/logger";
configureLogger({ enableMonkeypatch: true });

import { configureMiddleware } from "@aksparadise/otel-observability/middleware";
configureMiddleware({
    userIdPaths: ["user._id", "auth.userId"],
    includeClientIp: true,
});
```

## API Reference

### OTel SDK

```javascript
import { initOtel, shutdownOtel } from "@aksparadise/otel-observability/otel";
const sdk = initOtel(config);
await shutdownOtel(sdk);
```

### Tracer

```javascript
import {
    getTracer,
    withSpan,
    getCurrentTraceId,
    setTraceUser,
} from "@aksparadise/otel-observability/tracer";

const tracer = getTracer("userService");
const result = await withSpan("user.create", async (span) => {
    return await createUser();
});
const traceId = getCurrentTraceId();
setTraceUser("user-123", "tenant-456");
```

### Metrics

```javascript
import {
    createCounter,
    createHistogram,
    createUpDownCounter,
    createMetricsBatch,
} from "@aksparadise/otel-observability/metrics";

const counter = createCounter("requests_total", {
    description: "Total requests",
});
counter.add(1, { method: "GET" });

const histogram = createHistogram("duration_ms", { unit: "ms" });
histogram.record(150, { route: "/api/users" });

const gauge = createUpDownCounter("active_connections");
gauge.add(1);
gauge.add(-1);

const metrics = createMetricsBatch({
    counters: { requests: { name: "http_requests_total" } },
    histograms: { duration: { name: "request_duration_ms", unit: "ms" } },
});
```

### Logger

```javascript
import {
    logger,
    configureLogger,
    createChildLogger,
} from "@aksparadise/otel-observability/logger";

logger.info("User logged in", { userId: "123" });
logger.error("Failed to process", { error: err.message });

configureLogger({ enableMonkeypatch: true, consoleColors: true });

const userLogger = createChildLogger({ module: "userService" });
userLogger.info("User created");
```

### Error Handler

```javascript
import {
    setupGlobalErrorHandler,
    expressErrorHandler,
} from "@aksparadise/otel-observability/error-handler";

// Setup global error handling (catches all uncaught errors)
setupGlobalErrorHandler();

// Express error middleware
app.use(expressErrorHandler());
```

### Middleware

```javascript
import {
    otelContextMiddleware,
    configureMiddleware,
    createCustomMiddleware,
} from "@aksparadise/otel-observability/middleware";

app.use(otelContextMiddleware); // Must be after auth

const custom = createCustomMiddleware((req) => ({
    userId: req.session?.userId,
    tenantId: req.session?.tenantId,
}));
app.use(custom);
```

### Sanitizer

```javascript
import {
    sanitize,
    configureSensitiveFields,
    maskString,
} from "@aksparadise/otel-observability/sanitizer";

const safe = sanitize({ email: "test@example.com", password: "secret" });
// { email: 'test@example.com', password: '[REDACTED]' }

configureSensitiveFields(["custom_secret"], true);

const masked = maskString("1234567890123456", { visibleChars: 4 });
// '************3456'
```

### Security

```javascript
import {
    runSecurityCheck,
    autoUpdateSafePackages,
} from "@aksparadise/otel-observability/security";

// Run security check
runSecurityCheck();

// Auto-update safe packages
autoUpdateSafePackages();
```

## Framework-Specific Setup

### NestJS

```typescript
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import { NestJSLogger } from "@aksparadise/otel-observability/nestjs-logger";
import { configureLogger } from "@aksparadise/otel-observability/logger";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

// Configure logger to capture all console output
configureLogger({
    enableConsoleOutput: true,
    enableOtelOutput: true,
    enableMonkeypatch: true,
    consoleColors: true,
});

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: new NestJSLogger(), // Routes ALL NestJS logs through OTel
    });
    await app.listen(3000);
}
bootstrap();
```

### Express

```javascript
import "@aksparadise/otel-observability/otel";
import express from "express";
import { otelContextMiddleware } from "@aksparadise/otel-observability/middleware";

const app = express();
app.use(otelContextMiddleware);
```

### GraphQL

```javascript
import "@aksparadise/otel-observability/otel";
import { ApolloServer } from "@apollo/server";

// GraphQL operations are automatically traced
const server = new ApolloServer({
    typeDefs,
    resolvers,
});
```

### Next.js

```typescript
// instrumentation.ts
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("dotenv/config");
        const { setup } = await import("@aksparadise/otel-observability");
        await setup({ framework: "nextjs" });
    }
}
```

## SigNoz vs Grafana Cloud

### SigNoz

**Best for:** Self-hosted observability, full control, cost-effective for high volume

**Setup:**

```bash
git clone https://github.com/SigNoz/signoz.git
cd signoz/deploy/
./install.sh
```

**Configuration:**

```env
OTEL_BACKEND=signoz
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**Access UI:** http://localhost:3301

### Grafana Cloud

**Best for:** Managed service, integrated with Grafana ecosystem, quick setup

**Setup:**

1. Create account at https://grafana.com
2. Create a new stack
3. Get OTLP endpoint and API key from stack settings

**Configuration:**

```env
OTEL_BACKEND=grafana
GRAFANA_OTEL_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
GRAFANA_API_KEY=your-api-key
```

**Access UI:** https://your-stack.grafana.net

### Comparison

| Feature     | SigNoz                 | Grafana Cloud     |
| ----------- | ---------------------- | ----------------- |
| Self-hosted | Yes                    | No                |
| Managed     | No                     | Yes               |
| Cost        | Free (self-hosted)     | Usage-based       |
| Setup Time  | 10-15 min              | 5 min             |
| Storage     | Unlimited (your infra) | Quota-based       |
| Integration | Standalone             | Grafana ecosystem |

## Security & Vulnerability Management

### Run Security Check

```bash
npm run security-check
```

This will:

- Scan for vulnerabilities in dependencies
- Check for outdated packages
- Provide recommendations for fixes
- Exit with error code if critical/high vulnerabilities found

### Auto-Update Safe Packages

```bash
npm run security-check -- --auto-fix
```

This will:

- Run `npm audit fix` for safe updates
- Preserve breaking changes
- Report what was updated

## Best Practices

1. **Import Order**: OTel must be first import
2. **Backend Selection**: Use SigNoz for self-hosted, Grafana Cloud for managed
3. **Sampling**: Use 0.1-0.3 in production for high traffic
4. **Naming**: Use snake_case with domain prefix (e.g., `api_requests_total`)
5. **Span Names**: Use action-oriented names (e.g., `user.create`)
6. **Security**: Never log sensitive data (auto-sanitized)
7. **Error Handling**: Always use global error handler
8. **Vulnerability Scanning**: Run security check regularly

## Security & Quality

This package includes automated security scanning and quality checks:

```bash
# Run security vulnerability check
npm run security-check

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint:fix
```

### Security Features

- **Automated vulnerability scanning** with npm audit and Socket.dev
- **Dependency safety checks** before publishing
- **Input sanitization** for sensitive data (passwords, tokens, API keys)
- **No known security vulnerabilities** (Socket.dev verified)
- **Secure by default** with minimal attack surface
- **Regular security updates** with automated dependency monitoring
- **Zero-trust architecture** with no external runtime dependencies
- **Data protection** with automatic PII redaction

### Code Quality

- **TypeScript definitions** included
- **ESLint configuration** for code standards
- **Unit tests** with Vitest coverage
- **Automated CI/CD** checks

## License

MIT
