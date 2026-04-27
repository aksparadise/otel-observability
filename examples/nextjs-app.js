// examples/nextjs-app.js
// ─────────────────────────────────────────────────────────────────────────────
//  Next.js Application Example using @aksparadise/otel-observability
//
//  This example demonstrates Next.js instrumentation with automatic tracing
//  of pages, API routes, and server-side rendering.
//
//  File structure:
//    lib/otel.js - OTel initialization (this file)
//    next.config.js - Next.js configuration
//    app/page.tsx - Example page
//    app/api/hello/route.ts - Example API route
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// lib/otel.js - OTel initialization (save as lib/otel.js in your Next.js app)
// ─────────────────────────────────────────────────────────────────────────────

import "@aksparadise/otel-observability/otel";
import "@aksparadise/otel-observability/logger";
import { setupGlobalErrorHandler } from "@aksparadise/otel-observability/error-handler";

// Setup global error handler
setupGlobalErrorHandler();

// Export to ensure this runs when imported
export {};

// ─────────────────────────────────────────────────────────────────────────────
// next.config.js - Next.js configuration (save as next.config.js)
// ─────────────────────────────────────────────────────────────────────────────

const nextConfig = {
    experimental: {
        instrumentationHook: true,
    },
};

export default nextConfig;

// ─────────────────────────────────────────────────────────────────────────────
// app/page.tsx - Example page component (save as app/page.tsx)
// ─────────────────────────────────────────────────────────────────────────────

import { withSpan, createCounter } from "@aksparadise/otel-observability";

const pageViews = createCounter("page_views_total", {
    description: "Total page views",
});

export default function HomePage() {
    return (
        <div>
            <h1>Next.js with OTel Observability</h1>
            <p>This page is automatically traced with OpenTelemetry.</p>
        </div>
    );
}

// Server-side component with manual tracing
async function getUserData() {
    return await withSpan("getUserData", async (span) => {
        span.setAttribute("operation", "fetch-user");
        
        // Simulate data fetching
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        return { name: "John Doe", email: "john@example.com" };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// app/api/hello/route.ts - Example API route (save as app/api/hello/route.ts)
// ─────────────────────────────────────────────────────────────────────────────

import { withSpan, createHistogram } from "@aksparadise/otel-observability";
import { logger } from "@aksparadise/otel-observability/logger";

const apiDuration = createHistogram("api_duration_ms", {
    description: "API route duration",
    unit: "ms",
});

export async function GET(request) {
    const startTime = Date.now();
    
    const data = await withSpan("api.hello", async (span) => {
        span.setAttribute("http.method", "GET");
        span.setAttribute("http.route", "/api/hello");
        
        logger.info("API request received", { path: "/api/hello" });
        
        return { message: "Hello from Next.js API with OTel!" };
    });
    
    apiDuration.record(Date.now() - startTime, { route: "/api/hello" });
    
    return Response.json(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// app/api/users/route.ts - Example API route (save as app/api/users/route.ts)
// ─────────────────────────────────────────────────────────────────────────────

import { withSpan, createCounter } from "@aksparadise/otel-observability";

const userRequests = createCounter("user_requests_total", {
    description: "Total user API requests",
});

export async function GET() {
    const startTime = Date.now();
    
    const users = await withSpan("users.fetch", async (span) => {
        span.setAttribute("operation", "fetch-users");
        span.setAttribute("db.collection", "users");
        
        // Simulate database query
        await new Promise((resolve) => setTimeout(resolve, 50));
        
        return [
            { id: 1, name: "User 1" },
            { id: 2, name: "User 2" },
        ];
    });
    
    userRequests.add(1, { operation: "fetch" });
    
    return Response.json({ users });
}

export async function POST(request) {
    const body = await request.json();
    
    const newUser = await withSpan("users.create", async (span) => {
        span.setAttribute("operation", "create-user");
        span.setAttribute("user.email", body.email);
        
        logger.info("Creating user", { email: body.email });
        
        // Simulate database insert
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        return { id: 3, ...body };
    });
    
    userRequests.add(1, { operation: "create" });
    
    return Response.json({ user: newUser }, { status: 201 });
}

// ─────────────────────────────────────────────────────────────────────────────
// middleware.ts - Next.js middleware (save as middleware.ts)
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { setTraceUser } from "@aksparadise/otel-observability/tracer";

export function middleware(request) {
    // Extract user from headers or cookies
    const userId = request.headers.get("x-user-id") || request.cookies.get("user_id")?.value;
    const tenantId = request.headers.get("x-tenant-id");
    
    // Set trace context for OTel
    if (userId) {
        setTraceUser(userId, tenantId || undefined);
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: [
        "/api/:path*",
        "/dashboard/:path*",
    ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Environment Variables (.env.local)
// ─────────────────────────────────────────────────────────────────────────────

// For SigNoz
// OTEL_ENABLED=true
// OTEL_BACKEND=signoz
// OTEL_SERVICE_NAME=nextjs-app
// OTEL_SERVICE_VERSION=1.0.0
// OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
// OTEL_TRACE_SAMPLING_RATIO=1.0

// For Grafana Cloud
// OTEL_ENABLED=true
// OTEL_BACKEND=grafana
// OTEL_SERVICE_NAME=nextjs-app
// GRAFANA_OTEL_ENDPOINT=https://otlp-gateway-prod-us-east-0.grafana.net/otlp
// GRAFANA_API_KEY=your-api-key
