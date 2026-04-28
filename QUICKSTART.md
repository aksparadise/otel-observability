# Quick Start Guide

## Prerequisites

**You need a backend to receive telemetry data:**

- **SigNoz:** Run SigNoz locally using Docker (free, open-source)
- **Grafana Cloud:** Sign up for Grafana Cloud account (paid)

This package **only sends data** - you need to run SigNoz or Grafana to receive and visualize it.

## 1. Install

```bash
npm install @aksparadise/otel-observability
```

## 2. Configure Environment Variables

Create a `.env` file in your project:

**For SigNoz:**

```env
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=my-app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**For Grafana Cloud:**

```env
OTEL_ENABLED=true
OTEL_BACKEND=grafana
OTEL_SERVICE_NAME=my-app
GRAFANA_OTEL_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
GRAFANA_API_KEY=your-api-key
```

## 3. Add to top of your main file:

**IMPORTANT:** Load .env BEFORE OTel imports:

```javascript
// Load .env FIRST
import "dotenv/config";

// Then import OTel
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import { setupGlobalErrorHandler } from "@aksparadise/otel-observability/error-handler";

setupGlobalErrorHandler();

// Your app code starts here
```

## 4. Done!

That's it! Your app now sends:

- **Traces** - API calls, database queries, function execution
- **Metrics** - Request counts, response times
- **Logs** - All console.log, console.error messages

---

## Optional: Use Advanced Features

**Track specific operations:**

```javascript
import { withSpan } from "@aksparadise/otel-observability";

const result = await withSpan("database-query", async (span) => {
    span.setAttribute("table", "users");
    return await db.query("SELECT * FROM users");
});
```

**Count requests:**

```javascript
import { createCounter } from "@aksparadise/otel-observability";

const counter = createCounter("http_requests");
counter.add(1, { route: "/api/users" });
```

**Log with context:**

```javascript
import { logger } from "@aksparadise/otel-observability/logger";

logger.info("User logged in", { userId: "123" });
logger.error("Database failed", { error: err.message });
```

---

## View Your Data

**Important:** `http://localhost:4318` is the OTel Collector endpoint that receives data. You don't view data there.

**SigNoz:** Open your SigNoz dashboard URL (check your Docker setup for the port - commonly 3301)

**Grafana:** Open your Grafana Cloud dashboard to view traces, metrics, and logs

The flow is:

```
Your App → OTel Collector (4318) → SigNoz/Grafana → You view in UI
```

---

## Need Help?

- Full documentation: [README.md](README.md)
- Examples: [examples/](examples/)
