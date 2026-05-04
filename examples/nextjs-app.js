// examples/nextjs-app.js
// Copy each section into the matching file in your Next.js app.

// ─────────────────────────────────────────────────────────────────────────────
// instrumentation.ts - place in project root, or in src/ if your app uses src/
// ─────────────────────────────────────────────────────────────────────────────

export async function register() {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        await import("dotenv/config");
        const { setup } = await import("@aksparadise/otel-observability");
        await setup({ framework: "nextjs" });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// app/api/hello/route.ts - example API route
// ─────────────────────────────────────────────────────────────────────────────

import { withSpan, createHistogram } from "@aksparadise/otel-observability";
import { logger } from "@aksparadise/otel-observability/logger";

const apiDuration = createHistogram("api_duration_ms", {
    description: "API route duration",
    unit: "ms",
});

export async function GET() {
    const startTime = Date.now();

    const data = await withSpan("api.hello", async (span) => {
        span.setAttribute("http.method", "GET");
        span.setAttribute("http.route", "/api/hello");

        logger.info("API request received", { path: "/api/hello" });

        return { message: "Hello from Next.js API with OTel" };
    });

    apiDuration.record(Date.now() - startTime, { route: "/api/hello" });

    return Response.json(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// middleware.ts - optional, place in project root for lightweight identity context
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { setTraceUser } from "@aksparadise/otel-observability/tracer";

export function middleware(request) {
    const userId = request.headers.get("x-user-id");
    const tenantId = request.headers.get("x-tenant-id") || undefined;

    if (userId) {
        setTraceUser(userId, tenantId);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*", "/dashboard/:path*"],
};

// ─────────────────────────────────────────────────────────────────────────────
// .env.local
// ─────────────────────────────────────────────────────────────────────────────

// OTEL_ENABLED=true
// OTEL_BACKEND=signoz
// OTEL_SERVICE_NAME=nextjs-app
// OTEL_SERVICE_VERSION=1.0.0
// OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
// OTEL_TRACE_SAMPLING_RATIO=1.0
