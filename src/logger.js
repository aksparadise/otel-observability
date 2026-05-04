// src/logger.js
// ─────────────────────────────────────────────────────────────────────────────
//  Centralised Logger with OTel Context — OTel Signoz Plugin
//
//  Features:
//    - Automated OTel context injection (Identity, Trace, Span)
//    - Global security sanitization (Redacts passwords/tokens)
//    - Strict Schema: All logs exported as structured JSON objects
//    - Console Monkeypatching: Captures vanilla console.log calls (optional)
//
//  Usage:
//    import { logger } from '@aksparadise/otel-observability/logger';
//    logger.info('User logged in', { userId: '123' });
// ─────────────────────────────────────────────────────────────────────────────

import util from "node:util";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";
import { getCurrentSpanContext } from "./tracer.js";
import { sanitize } from "./sanitizer.js";
import { getContext } from "./context.js";

const isProduction =
    process.env.OTEL_ENVIRONMENT === "production" ||
    process.env.NODE_ENV === "production";
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "unknown-service";

// Obtain the OTel Logger instance
const otelLogger = logs.getLogger(SERVICE_NAME);

/**
 * Configuration options for the logger
 */
const DEFAULT_LOGGER_CONFIG = {
    enableConsoleOutput: true,
    enableOtelOutput: true,
    enableMonkeypatch: false,
    consoleColors: true,
    showMetadataInProduction: false,
};

let loggerConfig = { ...DEFAULT_LOGGER_CONFIG };

/**
 * Configure the logger with custom options
 *
 * @param {Object} config - Logger configuration
 * @param {boolean} config.enableConsoleOutput - Enable console output (default: true)
 * @param {boolean} config.enableOtelOutput - Enable OTel log export (default: true)
 * @param {boolean} config.enableMonkeypatch - Monkeypatch console.log (default: false)
 * @param {boolean} config.consoleColors - Enable colored console output (default: true)
 * @param {boolean} config.showMetadataInProduction - Show metadata in production (default: false)
 *
 * @example
 * import { configureLogger } from '@aksparadise/otel-observability/logger';
 * configureLogger({
 *   enableConsoleOutput: true,
 *   enableOtelOutput: true,
 *   enableMonkeypatch: true
 * });
 */
export const configureLogger = (config = {}) => {
    loggerConfig = { ...DEFAULT_LOGGER_CONFIG, ...config };

    if (loggerConfig.enableMonkeypatch) {
        monkeypatchConsole();
    }
};

/**
 * Ensures all logs follow a strict structure
 */
const prepareLogRecord = (level, args) => {
    const { traceId, spanId } = getCurrentSpanContext();
    const requestContext = getContext();

    // 1. Serialize and Sanitize all arguments
    const sanitizedArgs = args.map((arg) => {
        if (arg instanceof Error) {
            return {
                message: arg.message,
                stack: arg.stack,
                code: arg.code,
                type: arg.name,
            };
        }
        return sanitize(arg);
    });

    // 2. Determine Primary Message
    let message = "Log event";
    if (typeof args[0] === "string") {
        message = args[0];
    } else if (sanitizedArgs[0]?.message) {
        message = sanitizedArgs[0].message;
    }

    // 3. Build structured attributes
    const attributes = {
        "log.source": "application",
        "service.name": SERVICE_NAME,
        "user.id": requestContext.userId || null,
        "tenant.id": requestContext.tenantId || null,
        "request.id": requestContext.requestId || undefined,
        "log.severity": level,
        traceId: traceId || undefined,
        spanId: spanId || undefined,
    };

    // Add extra arguments as metadata if they aren't the primary message string
    if (
        sanitizedArgs.length > 1 ||
        (sanitizedArgs.length === 1 && typeof args[0] !== "string")
    ) {
        attributes.metadata =
            sanitizedArgs.length === 1 ? sanitizedArgs[0] : sanitizedArgs;
    }

    return { message, attributes, traceId, spanId };
};

/**
 * Color codes for console output
 */
const COLOR_CODES = {
    INFO: "\x1b[36m", // Cyan
    WARN: "\x1b[33m", // Yellow
    ERROR: "\x1b[31m", // Red
    DEBUG: "\x1b[90m", // Gray
    RESET: "\x1b[0m",
};

/**
 * Detect actual log level based on message content
 */
const detectLogLevel = (message, level) => {
    const messageStr = String(message).toLowerCase();

    // Upgrade deprecation warnings to WARN level even if they come through console.error
    if (
        messageStr.includes("deprecationwarning") ||
        messageStr.includes("deprecated") ||
        messageStr.includes("[deprecation]")
    ) {
        return "WARN";
    }

    // Downgrade certain Node.js warnings from ERROR to WARN
    if (
        messageStr.includes("multiple resolves") ||
        messageStr.includes("unhandled promise rejection") ||
        messageStr.includes("maxlistenersexceededwarning")
    ) {
        return "WARN";
    }

    return level;
};

/**
 * Emit a log at the specified level
 */
const emit = (level, severityNumber, ...args) => {
    const { message, attributes, traceId } = prepareLogRecord(level, args);

    // Detect actual log level based on content
    const actualLevel = detectLogLevel(message, level);
    const actualSeverityNumber =
        actualLevel === "WARN"
            ? SeverityNumber.WARN
            : actualLevel === "ERROR"
              ? SeverityNumber.ERROR
              : actualLevel === "INFO"
                ? SeverityNumber.INFO
                : actualLevel === "DEBUG"
                  ? SeverityNumber.DEBUG
                  : SeverityNumber.INFO;

    // Update the log.severity attribute to match the detected level
    attributes["log.severity"] = actualLevel;

    // ── Local Console Output ──
    if (
        loggerConfig.enableConsoleOutput &&
        (!isProduction || actualLevel === "ERROR" || actualLevel === "WARN")
    ) {
        const color = COLOR_CODES[actualLevel] || COLOR_CODES.RESET;
        const reset = COLOR_CODES.RESET;
        const statusIcon =
            actualLevel === "ERROR"
                ? "❌"
                : actualLevel === "WARN"
                  ? "⚠️"
                  : "ℹ️";
        const traceInfo = traceId ? ` [trace=${traceId.slice(-6)}]` : "";

        const coloredLevel = loggerConfig.consoleColors
            ? `${color}[${actualLevel}]${reset}`
            : `[${actualLevel}]`;

        process.stdout.write(
            `\n${statusIcon} ${coloredLevel.padEnd(10)} ${message}${traceInfo}`,
        );

        if (
            attributes.metadata &&
            (!isProduction || loggerConfig.showMetadataInProduction)
        ) {
            process.stdout.write(
                `\n  ${util.inspect(attributes.metadata, { colors: loggerConfig.consoleColors, depth: 3 }).replace(/\n/g, "\n  ")}`,
            );
        }
    }

    // ── SigNoz OTel Emission ──
    if (loggerConfig.enableOtelOutput && process.env.OTEL_ENABLED === "true") {
        otelLogger.emit({
            severityNumber: actualSeverityNumber,
            severityText: actualLevel,
            body: message,
            attributes,
        });
    }

    // Tag errors to prevent double-logging
    args.forEach((arg) => {
        if (arg instanceof Error) arg.__otelLogged = true;
    });
};

/**
 * Logger instance with standard log levels
 */
export const logger = {
    info: (...args) => emit("INFO", SeverityNumber.INFO, ...args),
    log: (...args) => emit("INFO", SeverityNumber.INFO, ...args),
    warn: (...args) => emit("WARN", SeverityNumber.WARN, ...args),
    error: (...args) => emit("ERROR", SeverityNumber.ERROR, ...args),
    debug: (...args) => emit("DEBUG", SeverityNumber.DEBUG, ...args),
};

/**
 * Monkeypatch console to use the logger
 * This captures all console.log/warn/error calls and routes them through the logger
 */
const monkeypatchConsole = () => {
    console.log = logger.log.bind(logger);
    console.info = logger.info.bind(logger);
    console.warn = logger.warn.bind(logger);
    console.error = logger.error.bind(logger);
    console.debug = logger.debug.bind(logger);
};

/**
 * Create a child logger with additional context
 *
 * @param {Object} context - Additional context to include in all logs
 * @returns {Object} - Child logger instance
 *
 * @example
 * import { createChildLogger } from '@aksparadise/otel-observability/logger';
 * const userLogger = createChildLogger({ module: 'userService' });
 * userLogger.info('User created', { userId: '123' });
 */
export const createChildLogger = (context = {}) => {
    return {
        info: (...args) => {
            const enrichedArgs = [...args];
            if (enrichedArgs.length > 1) {
                enrichedArgs[1] = { ...enrichedArgs[1], ...context };
            } else {
                enrichedArgs.push(context);
            }
            logger.info(...enrichedArgs);
        },
        warn: (...args) => {
            const enrichedArgs = [...args];
            if (enrichedArgs.length > 1) {
                enrichedArgs[1] = { ...enrichedArgs[1], ...context };
            } else {
                enrichedArgs.push(context);
            }
            logger.warn(...enrichedArgs);
        },
        error: (...args) => {
            const enrichedArgs = [...args];
            if (enrichedArgs.length > 1) {
                enrichedArgs[1] = { ...enrichedArgs[1], ...context };
            } else {
                enrichedArgs.push(context);
            }
            logger.error(...enrichedArgs);
        },
        debug: (...args) => {
            const enrichedArgs = [...args];
            if (enrichedArgs.length > 1) {
                enrichedArgs[1] = { ...enrichedArgs[1], ...context };
            } else {
                enrichedArgs.push(context);
            }
            logger.debug(...enrichedArgs);
        },
    };
};

// Export as default for convenience
export default logger;

// Make logger available globally (optional)
if (typeof globalThis !== "undefined") {
    globalThis.logger = logger;
}
