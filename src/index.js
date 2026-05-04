// src/index.js
// ─────────────────────────────────────────────────────────────────────────────
//  Main Entry Point — @aksparadise/otel-observability
//
//  This is the main entry point that exports all public APIs.
//  Import this file to get access to all plugin functionality.
//
//  Quick Start:
//    import '@aksparadise/otel-observability/otel';
//    import { logger, withSpan, createCounter } from '@aksparadise/otel-observability';
// ─────────────────────────────────────────────────────────────────────────────

// OTel SDK initialization (auto-runs on import)
export { initOtel, shutdownOtel } from "./otel.js";

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

// Re-export default for convenience
export { default as otel } from "./otel.js";
export { default as tracer } from "./tracer.js";
export { default as metrics } from "./metrics.js";
export { default as loggerDefault } from "./logger.js";
export { default as middleware } from "./middleware.js";
export { default as context } from "./context.js";
export { default as sanitizer } from "./sanitizer.js";
export { default as errorHandler } from "./errorHandler.js";
export { default as security } from "./security.js";
