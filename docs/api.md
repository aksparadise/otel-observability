# API Reference — @aksparadise/otel-observability

## setup()

```typescript
import { setup } from "@aksparadise/otel-observability";

const observability = await setup(options);
```

| Option | Type | Default | Description |
|---|---|---|---|
| `framework` | `string` | auto-detect | Force framework: `express`, `nestjs`, `nextjs`, `vanilla` |
| `enableConsoleOutput` | `boolean` | `true` | Enable console output |
| `enableOtelOutput` | `boolean` | from `.env` | Enable OTLP export |
| `enableMonkeypatch` | `boolean` | `true` | Patch `console.*` to capture logs |
| `consoleColors` | `boolean` | `true` | Colored console output |
| `instrumentations` | `object` | defaults | Override per-instrumentation config |

**Returns:** `{ framework, logger, middleware, otelSdkInitialized }`

---

## OTel SDK

```javascript
import { initOtel, shutdownOtel } from "@aksparadise/otel-observability/otel";

const sdk = initOtel(config);
await shutdownOtel(sdk);
```

---

## Tracer

```javascript
import {
    getTracer,
    withSpan,
    getCurrentTraceId,
    setTraceUser,
} from "@aksparadise/otel-observability/tracer";

const tracer = getTracer("userService");

const result = await withSpan("user.create", async (span) => {
    span.setAttribute("user.email", "user@example.com");
    return await createUser();
});

const traceId = getCurrentTraceId();
setTraceUser("user-123", "tenant-456");
```

---

## Metrics

```javascript
import {
    createCounter,
    createHistogram,
    createUpDownCounter,
    createMetricsBatch,
} from "@aksparadise/otel-observability/metrics";

const counter = createCounter("requests_total", { description: "Total requests" });
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

---

## Logger

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

---

## Error Handler

```javascript
import {
    setupGlobalErrorHandler,
    expressErrorHandler,
} from "@aksparadise/otel-observability/error-handler";

setupGlobalErrorHandler(); // Catches all uncaught errors globally

app.use(expressErrorHandler()); // Express error middleware
```

---

## Middleware

```javascript
import {
    otelContextMiddleware,
    configureMiddleware,
    createCustomMiddleware,
} from "@aksparadise/otel-observability/middleware";

app.use(otelContextMiddleware); // Add after auth middleware

const custom = createCustomMiddleware((req) => ({
    userId: req.session?.userId,
    tenantId: req.session?.tenantId,
}));
app.use(custom);
```

---

## Sanitizer

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

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OTEL_ENABLED` | `false` | Enable/disable OTel |
| `OTEL_BACKEND` | `signoz` | Backend: `signoz`, `grafana`, `custom` |
| `OTEL_SERVICE_NAME` | `unknown-service` | Service name |
| `OTEL_SERVICE_VERSION` | `1.0.0` | Service version |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | Collector endpoint |
| `GRAFANA_OTEL_ENDPOINT` | Grafana default | Grafana OTLP endpoint |
| `GRAFANA_API_KEY` | (empty) | Grafana Cloud API key |
| `OTEL_TRACE_SAMPLING_RATIO` | `1.0` | Sampling ratio (0–1) |
| `OTEL_ENVIRONMENT` | `development` | Deployment environment |
| `OTEL_FRAMEWORK` | `express` | Framework override |
| `OTEL_LOG_LEVEL` | (unset) | Set to `debug` for SDK diagnostics |
