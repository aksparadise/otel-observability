# @aksparadise/otel-observability

![npm version](https://img.shields.io/npm/v/@aksparadise/otel-observability)

Production-ready OpenTelemetry plugin for SigNoz and Grafana observability with zero-configuration setup. Supports Express, GraphQL, Next.js, and more.

## Features

- **Zero Configuration** with sensible defaults
- **Multi-Backend Support**: SigNoz, Grafana Cloud, or custom OTLP backends
- **Automatic Instrumentation**: Express, HTTP, Mongoose, Redis, BullMQ, GraphQL
- **Distributed Tracing** with context propagation
- **Custom Metrics Factory**: Counters, histograms, gauges
- **Structured Logging** with automatic trace context
- **Security Sanitization**: Auto-redacts passwords/tokens
- **Identity Injection** for traces
- **Global Error Handling**: Captures all errors even without explicit logger usage
- **Framework Agnostic**: Works with Express, GraphQL, Next.js, or vanilla Node.js
- **Vulnerability Self-Check**: Automated security scanning
- **Graceful Shutdown**: Proper flushing of telemetry data

## Installation

```bash
npm install @aksparadise/otel-observability
```

## Quick Start

### Prerequisites

**You need a backend to receive telemetry data:**

- **SigNoz:** Run SigNoz locally using Docker (free, open-source)
- **Grafana Cloud:** Sign up for Grafana Cloud account (paid)

This package **only sends data** - you need to run SigNoz or Grafana to receive and visualize it.

### 3 Simple Steps

**1. Install:**

```bash
npm install @aksparadise/otel-observability
```

**2. Add .env file:**

```env
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=my-app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**3. Add to top of your main file:**

```javascript
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import { setupGlobalErrorHandler } from "@aksparadise/otel-observability/error-handler";

setupGlobalErrorHandler();
```

**That's it!** Your app now automatically sends traces, metrics, and logs to your backend.

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

```javascript
// lib/otel.js
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";

// next.config.js
export default {
    experimental: {
        instrumentationHook: true,
    },
};
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

## License

MIT
