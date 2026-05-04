# Next.js Integration — @aksparadise/otel-observability

## Setup

```bash
# 1. Install
npm install @aksparadise/otel-observability

# 2. Add .env
OTEL_ENABLED=true
OTEL_BACKEND=signoz
OTEL_SERVICE_NAME=my-nextjs-app
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

```typescript
// instrumentation.ts — in your project root or src/
import "dotenv/config";
import { setup } from "@aksparadise/otel-observability";

// Next.js calls register() once when a server instance starts.
export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await setup({ framework: "nextjs" });
    }
}
```

## Optional: Request Identity Middleware

```typescript
// middleware.ts — in project root
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

## Notes

- Use `instrumentation.ts`, not `pages/_app.tsx`, for server instrumentation
- Use root `middleware.ts`, not `pages/_middleware.ts`
- This package handles **server-side OTel only** — it does not collect browser metrics
- Middleware is optional and should stay lightweight

## ✅ Success Indicators

```
[OTEL] Initializing with sampling ratio: 1
 [OTEL] ✅ SDK started — exporting to http://localhost:4318
```
