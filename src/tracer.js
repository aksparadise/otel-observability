// src/tracer.js
// ─────────────────────────────────────────────────────────────────────────────
//  OpenTelemetry Tracer Helpers — OTel Signoz Plugin
//
//  Provides:
//    getTracer(name)         — named tracer for a module/service
//    withSpan(name, fn)      — wrap async fn in a named span
//    getCurrentTraceId()     — extract current trace ID (for logs)
//    getCurrentSpanContext() — extract both traceId + spanId (for logs)
//    setTraceAttributes()    — set attributes on current span
//    setTraceUser()          — set user identity on current span
//
//  All helpers are safe to call when OTEL_ENABLED=false → return null/noop
// ─────────────────────────────────────────────────────────────────────────────

import { trace, SpanStatusCode } from "@opentelemetry/api";

const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || "1.0.0";

/**
 * Get a named tracer for a module or service.
 *
 * @param {string} name - Name of the tracer (e.g., 'userService', 'paymentService')
 * @returns {Tracer} - OpenTelemetry Tracer instance
 *
 * @example
 * import { getTracer } from '@yourorg/otel-signoz-plugin/tracer';
 * const tracer = getTracer('userService');
 * const span = tracer.startSpan('user.create');
 * span.end();
 */
export const getTracer = (name) => {
    try {
        return trace.getTracer(name, SERVICE_VERSION);
    } catch (err) {
        // Return no-op tracer if OTel is not initialized
        return trace.getTracer(name);
    }
};

/**
 * Wrap an async function in a named span.
 * Automatically sets OK status on success and ERROR status on throw.
 * Records exceptions so they appear in SigNoz Tempo.
 *
 * @param {string} spanName - Name shown in Tempo (e.g., "user.create", "payment.process")
 * @param {Function} fn - Async function receiving (span) as argument
 * @param {Object} attributes - Key/value span attributes set before fn runs
 * @returns {Promise<any>} - Result of the function execution
 *
 * @example
 * import { withSpan } from '@yourorg/otel-signoz-plugin/tracer';
 *
 * const result = await withSpan(
 *   'user.create',
 *   async (span) => {
 *     span.setAttribute('user.email', email);
 *     return await createUser(email);
 *   },
 *   { 'tenant.id': tenantId }
 * );
 */
export const withSpan = async (spanName, fn, attributes = {}) => {
    const tracer = trace.getTracer("otel-signoz-plugin", SERVICE_VERSION);

    return tracer.startActiveSpan(spanName, async (span) => {
        try {
            // Set initial attributes
            Object.entries(attributes).forEach(([k, v]) =>
                span.setAttribute(k, v != null ? String(v) : ""),
            );

            const result = await fn(span);

            span.setStatus({ code: SpanStatusCode.OK });
            return result;
        } catch (err) {
            // Record exception so it appears in the Tempo trace viewer
            span.recordException(err);
            span.setStatus({
                code: SpanStatusCode.ERROR,
                message: err?.message ?? String(err),
            });
            throw err;
        } finally {
            span.end();
        }
    });
};

/**
 * Returns the current trace ID string, or null if no active span / OTel disabled.
 * Used by logger to inject trace ID into log lines.
 *
 * @returns {string|null} - Current trace ID or null
 *
 * @example
 * import { getCurrentTraceId } from '@yourorg/otel-signoz-plugin/tracer';
 * const traceId = getCurrentTraceId();
 * console.log(`Processing request in trace: ${traceId}`);
 */
export const getCurrentTraceId = () => {
    try {
        const span = trace.getActiveSpan();
        return span?.spanContext()?.traceId ?? null;
    } catch {
        return null;
    }
};

/**
 * Returns both traceId and spanId for structured log injection.
 * Returns { traceId: null, spanId: null } when OTel is disabled.
 *
 * @returns {{ traceId: string|null, spanId: string|null }} - Current span context
 *
 * @example
 * import { getCurrentSpanContext } from '@yourorg/otel-signoz-plugin/tracer';
 * const { traceId, spanId } = getCurrentSpanContext();
 * logger.info('Processing request', { traceId, spanId });
 */
export const getCurrentSpanContext = () => {
    try {
        const span = trace.getActiveSpan();
        const ctx = span?.spanContext();
        if (!ctx) return { traceId: null, spanId: null };
        return { traceId: ctx.traceId, spanId: ctx.spanId };
    } catch {
        return { traceId: null, spanId: null };
    }
};

/**
 * Set multiple attributes on the currently active span.
 * Used for automated identity injection or custom metadata.
 *
 * @param {Object} attributes - Key/value pairs to set as span attributes
 *
 * @example
 * import { setTraceAttributes } from '@yourorg/otel-signoz-plugin/tracer';
 * setTraceAttributes({
 *   'user.id': userId,
 *   'tenant.id': tenantId,
 *   'request.id': requestId
 * });
 */
export const setTraceAttributes = (attributes = {}) => {
    try {
        const span = trace.getActiveSpan();
        if (span) {
            Object.entries(attributes).forEach(([k, v]) => {
                if (v != null) span.setAttribute(k, String(v));
            });
        }
    } catch (err) {
        // Silently fail to prevent affecting business logic
    }
};

/**
 * Convenience helper to set standard user identity on the trace.
 * This enables filtering traces by user in SigNoz.
 *
 * @param {string} userId - User identifier
 * @param {string} tenantId - Tenant/client identifier (optional)
 *
 * @example
 * import { setTraceUser } from '@yourorg/otel-signoz-plugin/tracer';
 * setTraceUser('user-123', 'tenant-456');
 */
export const setTraceUser = (userId, tenantId) => {
    setTraceAttributes({
        "user.id": userId,
        "tenant.id": tenantId,
    });
};

/**
 * Manually start a span without automatic wrapping.
 * Useful for long-running operations or when you need more control.
 *
 * @param {string} name - Span name
 * @param {Object} options - Span options (attributes, kind, etc.)
 * @returns {Span} - OpenTelemetry Span instance
 *
 * @example
 * import { startSpan } from '@yourorg/otel-signoz-plugin/tracer';
 * const span = startSpan('background.job', {
 *   attributes: { 'job.type': 'email' }
 * });
 * // ... do work ...
 * span.end();
 */
export const startSpan = (name, options = {}) => {
    try {
        const tracer = trace.getTracer("otel-signoz-plugin", SERVICE_VERSION);
        return tracer.startSpan(name, options);
    } catch (err) {
        // Return no-op span if OTel is not initialized
        return {
            setAttribute: () => {},
            setAttributes: () => {},
            setStatus: () => {},
            recordException: () => {},
            end: () => {},
            spanContext: () => ({ traceId: null, spanId: null }),
        };
    }
};
