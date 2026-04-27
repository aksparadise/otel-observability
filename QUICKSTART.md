# Quick Start Guide

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

## 3. Add to Your App

**At the very top of your main file (index.js, app.js, server.js):**

```javascript
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

**SigNoz:** Open http://localhost:3301

**Grafana:** Open your Grafana Cloud dashboard

---

## Need Help?

- Full documentation: [README.md](README.md)
- Examples: [examples/](examples/)
