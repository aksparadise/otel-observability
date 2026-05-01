// src/errorHandler.js
// ─────────────────────────────────────────────────────────────────────────────
//  Global Error Handler — @aksparadise/otel-observability
//
//  Captures all unhandled errors and rejections, logs them with OTel context,
//  even if the user doesn't use the logger explicitly.
//
//  Usage:
//    import { setupGlobalErrorHandler } from '@aksparadise/otel-observability/error-handler';
//    setupGlobalErrorHandler();
// ─────────────────────────────────────────────────────────────────────────────

import { logger } from "./logger.js";
import * as otelApi from "@opentelemetry/api";
const { recordException } = otelApi;

/**
 * Setup global error handlers for uncaught exceptions and unhandled rejections
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.exitOnError - Exit process on uncaught exception (default: true)
 * @param {boolean} options.logToConsole - Log to console (default: true)
 * @param {Function} options.customHandler - Custom error handler function
 *
 * @example
 * import { setupGlobalErrorHandler } from '@aksparadise/otel-observability/error-handler';
 * setupGlobalErrorHandler();
 */
export const setupGlobalErrorHandler = (options = {}) => {
    const {
        exitOnError = true,
        logToConsole = true,
        customHandler = null,
    } = options;

    // ── Uncaught Exception Handler ───────────────────────────────────────────
    process.on("uncaughtException", (err) => {
        const errorInfo = {
            message: err.message,
            stack: err.stack,
            name: err.name,
            code: err.code,
            type: "uncaughtException",
        };

        // Log with OTel context
        if (logToConsole) {
            logger.error("Uncaught Exception", errorInfo);
        }

        // Record exception in current span if available
        try {
            recordException(err);
        } catch (e) {
            // Ignore if OTel is not available
        }

        // Call custom handler if provided
        if (typeof customHandler === "function") {
            customHandler(err, "uncaughtException");
        }

        // Exit process if configured
        if (exitOnError) {
            process.exit(1);
        }
    });

    // ── Unhandled Rejection Handler ─────────────────────────────────────────
    process.on("unhandledRejection", (reason, promise) => {
        const errorInfo = {
            reason: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined,
            type: "unhandledRejection",
            promise: promise.toString(),
        };

        // Log with OTel context
        if (logToConsole) {
            logger.error("Unhandled Promise Rejection", errorInfo);
        }

        // Record exception in current span if available
        try {
            if (reason instanceof Error) {
                recordException(reason);
            }
        } catch (e) {
            // Ignore if OTel is not available
        }

        // Call custom handler if provided
        if (typeof customHandler === "function") {
            customHandler(reason, "unhandledRejection");
        }

        // Don't exit on unhandled rejection (Node.js behavior)
        // But log it for debugging
    });

    // ── Warning Handler ─────────────────────────────────────────────────────
    process.on("warning", (warning) => {
        const warningInfo = {
            name: warning.name,
            message: warning.message,
            stack: warning.stack,
            type: "warning",
        };

        if (logToConsole) {
            logger.warn("Process Warning", warningInfo);
        }
    });

    // ── Multiple Resolves Handler ───────────────────────────────────────────
    process.on("multipleResolves", (type, promise, reason) => {
        const resolveInfo = {
            type,
            promise: promise.toString(),
            reason: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined,
        };

        if (logToConsole) {
            logger.warn("Multiple Promise Resolves", resolveInfo);
        }
    });
};

/**
 * Wrap an async function with error handling
 *
 * @param {Function} fn - Async function to wrap
 * @param {Object} options - Options
 * @param {string} options.context - Context for error logging
 * @returns {Function} - Wrapped function
 *
 * @example
 * import { withErrorHandling } from '@aksparadise/otel-observability/error-handler';
 *
 * const safeHandler = withErrorHandling(async (req, res) => {
 *   // Your code
 * }, { context: 'apiHandler' });
 */
export const withErrorHandling = (fn, options = {}) => {
    const { context = "unknown" } = options;

    return async (...args) => {
        try {
            return await fn(...args);
        } catch (err) {
            logger.error(`Error in ${context}`, {
                message: err.message,
                stack: err.stack,
                name: err.name,
            });

            try {
                recordException(err);
            } catch (e) {
                // Ignore if OTel is not available
            }

            throw err;
        }
    };
};

/**
 * Create an Express error handler middleware
 *
 * @param {Object} options - Options
 * @param {boolean} options.sendResponse - Send error response (default: true)
 * @returns {Function} - Express error middleware
 *
 * @example
 * import { expressErrorHandler } from '@aksparadise/otel-observability/error-handler';
 * app.use(expressErrorHandler());
 */
export const expressErrorHandler = (options = {}) => {
    const { sendResponse = true } = options;

    return (err, req, res, next) => {
        logger.error("Express Error", {
            message: err.message,
            stack: err.stack,
            name: err.name,
            path: req.path,
            method: req.method,
            url: req.url,
        });

        try {
            recordException(err);
        } catch (e) {
            // Ignore if OTel is not available
        }

        if (sendResponse) {
            res.status(err.status || 500).json({
                error: {
                    message: err.message || "Internal Server Error",
                    type: err.name || "Error",
                },
            });
        } else {
            next(err);
        }
    };
};

export default {
    setupGlobalErrorHandler,
    withErrorHandling,
    expressErrorHandler,
};
