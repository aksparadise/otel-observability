// src/index.js
// ─────────────────────────────────────────────────────────────────────────────
//  Main Entry Point — @aksparadise/otel-observability
//
//  This root entry point is intentionally side-effect safe.
//  It does not auto-start OpenTelemetry; call setup() or import ./otel for that.
//
//  Quick Start:
//    import '@aksparadise/otel-observability/otel';
//    import { logger, withSpan, createCounter } from '@aksparadise/otel-observability';
// ─────────────────────────────────────────────────────────────────────────────

// Setup helper
export { setup, setupNestJS, setupExpress, setupNextJS } from "./setup.js";

// Tracer helpers
export {
    getTracer,
    withSpan,
    getCurrentTraceId,
    getCurrentSpanContext,
    setTraceAttributes,
    setTraceUser,
    startSpan,
} from "./tracer.js";

// Metrics factory
export {
    createCounter,
    createHistogram,
    createUpDownCounter,
    createObservableGauge,
    createMetricsBatch,
    isMetricsEnabled,
} from "./metrics.js";

// Logger
export { logger, configureLogger, createChildLogger } from "./logger.js";

// Middleware
export {
    otelContextMiddleware,
    configureMiddleware,
    createCustomMiddleware,
} from "./middleware.js";

// Request context
export { runWithContext, getContext, setContext } from "./context.js";

// Sanitizer
export {
    sanitize,
    configureSensitiveFields,
    resetSensitiveFields,
    sanitizeFields,
    maskString,
} from "./sanitizer.js";

// Error Handler
export {
    setupGlobalErrorHandler,
    withErrorHandling,
    expressErrorHandler,
} from "./errorHandler.js";

// Security
export { runSecurityCheck, autoUpdateSafePackages } from "./security.js";

// Re-export defaults for convenience
export { default as setupDefault } from "./setup.js";
export { default as tracer } from "./tracer.js";
export { default as metrics } from "./metrics.js";
export { default as loggerDefault } from "./logger.js";
export { default as middleware } from "./middleware.js";
export { default as context } from "./context.js";
export { default as sanitizer } from "./sanitizer.js";
export { default as errorHandler } from "./errorHandler.js";
export { default as security } from "./security.js";
