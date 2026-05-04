# NestJS Integration — @aksparadise/otel-observability

## Why NestJS Logger is Needed

NestJS has its own internal logging system that **bypasses standard console methods**. Without proper integration, you'll miss critical NestJS logs in SigNoz:

- ❌ **Route mappings** - `Mapped {/auth/login, POST} route`
- ❌ **Application events** - `Nest application successfully started`
- ❌ **Controller logs** - All framework-level logging
- ❌ **Error handling** - NestJS-specific error events

## 🚀 Recommended Setup (Auto-detect)

```typescript
// main.ts — Load .env FIRST, before any OTel imports
import "dotenv/config";
import { setup } from "@aksparadise/otel-observability";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
    const observability = await setup(); // Auto-detects NestJS, returns logger

    const app = await NestFactory.create(AppModule, {
        logger: observability.logger ?? undefined,
    });

    await app.listen(3000);
}

bootstrap();
```

**CommonJS / older NestJS fallback:**

```typescript
import "dotenv/config";
const { setup } = require("@aksparadise/otel-observability");
```

## Manual NestJS Setup (Advanced)

```typescript
import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import { setupGlobalErrorHandler } from "@aksparadise/otel-observability/error-handler";
import { configureLogger } from "@aksparadise/otel-observability/logger";
import { NestJSLogger } from "@aksparadise/otel-observability/nestjs-logger";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

configureLogger({
    enableConsoleOutput: true,
    enableOtelOutput: true,
    enableMonkeypatch: true,
    consoleColors: true,
    showMetadataInProduction: false,
});

setupGlobalErrorHandler();

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        logger: new NestJSLogger(), // Routes ALL NestJS logs through OTel
    });
    await app.listen(3000);
}
bootstrap();
```

## What You Get

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

## Notes

- NestJS gets HTTP spans through OpenTelemetry Node auto-instrumentation
- `observability.logger` routes all NestJS framework logs through OTel
- No manual middleware needed for basic HTTP spans
- For custom middleware, you can still use `otelContextMiddleware`

## ✅ Success Indicators

```
[OTEL] Initializing with sampling ratio: 1
 [OTEL] ✅ SDK started — exporting to http://localhost:4318
```
