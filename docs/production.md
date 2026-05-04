# Production Guide — @aksparadise/otel-observability

## Backend Setup

### SigNoz (Self-hosted, Free)

```bash
git clone https://github.com/SigNoz/signoz.git
cd signoz/deploy/
./install.sh
```

```env
OTEL_BACKEND=signoz
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

Access UI: http://localhost:3301

### Grafana Cloud (Managed, Paid)

1. Create account at https://grafana.com
2. Create a new stack
3. Get OTLP endpoint and API key from stack settings

```env
OTEL_BACKEND=grafana
GRAFANA_OTEL_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
GRAFANA_API_KEY=your-api-key
```

### Custom OTLP Backend

```env
OTEL_BACKEND=custom
OTEL_EXPORTER_OTLP_ENDPOINT=http://your-collector:4318
```

---

## Production Configuration

```env
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=my-production-app
OTEL_SERVICE_VERSION=1.2.3
OTEL_EXPORTER_OTLP_ENDPOINT=https://your-signoz-server:4318
OTEL_TRACE_SAMPLING_RATIO=0.1  # 10% sampling in production
OTEL_ENVIRONMENT=production
```

```typescript
const observability = await setup({
    enableConsoleOutput: false, // Disable verbose logs in production
    enableOtelOutput: true,
    enableMonkeypatch: true,
    consoleColors: false,
});
```

### Sampling by Environment

| Environment | Sampling Ratio | Notes |
|---|---|---|
| Development | `1.0` | Full sampling |
| Staging | `0.5` | 50% |
| Production | `0.1` | 10% for high traffic |

---

## Best Practices

1. **Import Order:** Always load `.env` before OTel imports
2. **Call `setup()` first:** Before creating your Express/NestJS app instance
3. **Sampling:** Use `0.1`–`0.3` in production for high traffic
4. **Naming:** Use snake_case with domain prefix (e.g., `api_requests_total`)
5. **Span Names:** Use action-oriented names (e.g., `user.create`)
6. **Error Handling:** Use `setupGlobalErrorHandler()` to capture all crashes

---

## Security

```bash
# Run security vulnerability check
npm run security-check

# Auto-fix safe packages
npm run security-check -- --auto-fix

# Run tests with coverage
npm run test:coverage
```

- Automated vulnerability scanning via `npm audit` and Socket.dev
- Input sanitization for sensitive data (passwords, tokens, API keys)
- Auto-redacts PII before telemetry export

---

## Troubleshooting

### Enable Debug Logging

```bash
OTEL_LOG_LEVEL=debug
```

### Common Issues

| Error | Solution |
|---|---|
| `Cannot find module './otel.js'` | Ensure you're using v1.1.7+ |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` | Update to latest package version |
| `OTel SDK initialization failed` | Check `.env` variables and backend connection |
| `No backend configured` | Set `OTEL_EXPORTER_OTLP_ENDPOINT` in `.env` |
| No traces appearing | Run `curl http://localhost:4318/v1/traces` to verify backend |
| Framework not detected | Pass `setup({ framework: "express" })` explicitly |
| High memory in production | Set `OTEL_TRACE_SAMPLING_RATIO=0.1` |

### Verify Spans Without Backend

```bash
# Watch for connection refused = spans are generating
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 node app.js
```

### Disable Noisy Instrumentation

```ts
import { initOtel } from "@aksparadise/otel-observability/otel";

// Set OTEL_AUTO_START=false to ensure this config is applied.
initOtel({
    instrumentations: {
        "@opentelemetry/instrumentation-fs": { enabled: false },
    },
});
```
