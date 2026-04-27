// src/otel.js
// ─────────────────────────────────────────────────────────────────────────────
//  OpenTelemetry SDK Bootstrap — @aksparadise/otel-observability
//
//  ⚠️  THIS FILE MUST BE THE VERY FIRST IMPORT IN YOUR APPLICATION
//  Auto-instrumentation patches Node.js modules at load-time.
//  If anything imports Express/Mongoose/Redis first, traces won't work.
//
//  Supported Backends:
//    - SigNoz (default): Traces → Tempo, Metrics → Prometheus, Logs → Loki
//    - Grafana: Traces → Tempo, Metrics → Prometheus, Logs → Loki
//    - Custom: Any OTLP-compatible backend
//
//  Usage:
//    import '@aksparadise/otel-observability/otel';
//    import express from 'express';
// ─────────────────────────────────────────────────────────────────────────────

import { NodeSDK } from "@opentelemetry/sdk-node";
import { logs } from "@opentelemetry/api-logs";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
    BatchLogRecordProcessor,
    LoggerProvider,
} from "@opentelemetry/sdk-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-base";
import {
    ATTR_SERVICE_NAME,
    ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

/**
 * Default configuration for OTel SDK
 */
const DEFAULT_CONFIG = {
    enabled: process.env.OTEL_ENABLED === "true",
    serviceName: process.env.OTEL_SERVICE_NAME || "unknown-service",
    serviceVersion: process.env.OTEL_SERVICE_VERSION || "1.0.0",
    // Backend selection: 'signoz' (default), 'grafana', or 'custom'
    backend: process.env.OTEL_BACKEND || "signoz",
    // SigNoz endpoint (default)
    collectorEndpoint:
        process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318",
    // Grafana Cloud endpoint (if using Grafana)
    grafanaEndpoint:
        process.env.GRAFANA_OTEL_ENDPOINT ||
        "https://otlp-gateway-prod-us-east-0.grafana.net/otlp",
    grafanaInstanceId: process.env.GRAFANA_INSTANCE_ID || "",
    grafanaApiKey: process.env.GRAFANA_API_KEY || "",
    samplingRatio: Number.parseFloat(
        process.env.OTEL_TRACE_SAMPLING_RATIO || "1.0",
    ),
    environment:
        process.env.OTEL_ENVIRONMENT || process.env.NODE_ENV || "development",
    hostname: process.env.HOSTNAME || process.env.HOST || "unknown",
    metricExportInterval: 30_000, // 30 seconds
    // Framework detection
    framework: process.env.OTEL_FRAMEWORK || "express", // express, graphql, nextjs, custom
};

/**
 * Validate configuration values
 */
const validateConfig = (config) => {
    const errors = [];

    if (config.samplingRatio < 0 || config.samplingRatio > 1) {
        errors.push("OTEL_TRACE_SAMPLING_RATIO must be between 0 and 1");
    }

    // Validate based on backend
    if (config.backend === "grafana") {
        if (
            !config.grafanaEndpoint ||
            typeof config.grafanaEndpoint !== "string"
        ) {
            errors.push(
                "GRAFANA_OTEL_ENDPOINT must be a valid URL string when using Grafana backend",
            );
        }
        if (!config.grafanaApiKey || typeof config.grafanaApiKey !== "string") {
            errors.push(
                "GRAFANA_API_KEY must be provided when using Grafana backend",
            );
        }
    } else if (
        !config.collectorEndpoint ||
        typeof config.collectorEndpoint !== "string"
    ) {
        // SigNoz or custom backend
        errors.push("OTEL_EXPORTER_OTLP_ENDPOINT must be a valid URL string");
    }

    if (!config.serviceName || typeof config.serviceName !== "string") {
        errors.push("OTEL_SERVICE_NAME must be a non-empty string");
    }

    if (errors.length > 0) {
        throw new Error(`Invalid OTel configuration: ${errors.join(", ")}`);
    }

    return config;
};

/**
 * Get the appropriate endpoint based on backend selection
 */
const getEndpoint = (config) => {
    if (config.backend === "grafana") {
        return config.grafanaEndpoint;
    }
    return config.collectorEndpoint;
};

/**
 * Get headers for authentication (Grafana requires API key)
 */
const getHeaders = (config) => {
    if (config.backend === "grafana" && config.grafanaApiKey) {
        return {
            Authorization: `Bearer ${config.grafanaApiKey}`,
        };
    }
    return {};
};

/**
 * Initialize the OpenTelemetry SDK with custom configuration
 *
 * @param {Object} customConfig - Optional custom configuration
 * @param {boolean} customConfig.enabled - Enable/disable OTel (default: OTEL_ENABLED env var)
 * @param {string} customConfig.serviceName - Service name (default: OTEL_SERVICE_NAME env var)
 * @param {string} customConfig.serviceVersion - Service version (default: OTEL_SERVICE_VERSION env var)
 * @param {string} customConfig.collectorEndpoint - OTel collector endpoint (default: OTEL_EXPORTER_OTLP_ENDPOINT env var)
 * @param {number} customConfig.samplingRatio - Trace sampling ratio 0-1 (default: OTEL_TRACE_SAMPLING_RATIO env var)
 * @param {string} customConfig.environment - Deployment environment (default: OTEL_ENVIRONMENT env var)
 * @param {string} customConfig.hostname - Hostname (default: HOSTNAME env var)
 * @param {number} customConfig.metricExportInterval - Metric export interval in ms (default: 30000)
 * @param {Object} customConfig.instrumentations - Custom instrumentations configuration
 * @returns {NodeSDK|null} - Initialized SDK instance or null if disabled
 *
 * @example
 * // Use defaults from environment variables
 * import '@yourorg/otel-signoz-plugin/otel';
 *
 * @example
 * // Custom configuration
 * import { initOtel } from '@yourorg/otel-signoz-plugin/otel';
 * const sdk = initOtel({
 *     serviceName: 'my-service',
 *     collectorEndpoint: 'http://signoz:4318',
 *     samplingRatio: 0.1
 * });
 */
export const initOtel = (customConfig = {}) => {
    const config = validateConfig({ ...DEFAULT_CONFIG, ...customConfig });

    if (!config.enabled) {
        process.stdout.write(
            "\n [OTel] ⚠️  Disabled — set OTEL_ENABLED=true to enable\n",
        );
        return null;
    }

    process.stdout.write(
        `\n [OTel] Initializing with backend: ${config.backend.toUpperCase()}, sampling ratio: ${config.samplingRatio}\n`,
    );

    const endpoint = getEndpoint(config);
    const headers = getHeaders(config);

    // ── Resource: metadata attached to every span/metric/log ─────────────────
    const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: config.serviceName,
        [ATTR_SERVICE_VERSION]: config.serviceVersion,
        "deployment.environment": config.environment,
        "host.name": config.hostname,
        "otel.library.name": "@aksparadise/otel-observability",
        "otel.library.version": config.serviceVersion,
    });

    // ── Trace Exporter → OTel Collector → SigNoz Tempo / Grafana Tempo ───────
    const traceExporter = new OTLPTraceExporter({
        url: `${endpoint}/v1/traces`,
        headers,
    });

    // ── Metric Exporter → OTel Collector → Prometheus ────────────────────────
    const metricExporter = new OTLPMetricExporter({
        url: `${endpoint}/v1/metrics`,
        headers,
    });

    // ── Log Exporter → OTel Collector → SigNoz Loki / Grafana Loki ────────────
    const logExporter = new OTLPLogExporter({
        url: `${endpoint}/v1/logs`,
        headers,
    });

    // ── Logger Provider Setup ────────────────────────────────────────────────
    const loggerProvider = new LoggerProvider({
        resource,
        processors: [new BatchLogRecordProcessor(logExporter)],
    });
    logs.setGlobalLoggerProvider(loggerProvider);

    // ── Default Instrumentation Configuration ───────────────────────────────
    const defaultInstrumentationConfig = {
        // Disable very noisy fs calls (every file read/write)
        "@opentelemetry/instrumentation-fs": { enabled: false },

        // Disable DNS resolution spans (rarely useful)
        "@opentelemetry/instrumentation-dns": { enabled: false },

        // Mongoose — serialize query payload into span attribute
        "@opentelemetry/instrumentation-mongoose": {
            dbStatementSerializer: (_op, payload) => {
                try {
                    return JSON.stringify(payload).substring(0, 500);
                } catch {
                    return "[unserializable]";
                }
            },
        },

        // ioredis — show command + first arg
        "@opentelemetry/instrumentation-ioredis": {
            dbStatementSerializer: (cmdName, cmdArgs) =>
                `${cmdName} ${String(cmdArgs?.[0] ?? "").substring(0, 80)}`,
        },

        // HTTP — skip health checks and the collector endpoint to prevent loops
        // Also ignore Next.js internal requests
        "@opentelemetry/instrumentation-http": {
            ignoreOutgoingUrls: [/\/health/, /4318/, /4317/],
            ignoreIncomingRequestHook: (req) => {
                const url = req.url || "";
                return (
                    url.includes("/health") ||
                    url.includes("/metrics") ||
                    url.includes("/favicon.ico") ||
                    url.includes("/_next") // Ignore Next.js internal requests
                );
            },
        },

        // Express — capture route name on each span
        "@opentelemetry/instrumentation-express": {
            requestHook: (span, info) => {
                if (info.layerType === "request_handler") {
                    span.setAttribute(
                        "http.route",
                        info.request.route?.path || info.request.path,
                    );
                }
            },
        },

        // GraphQL — capture operation name and variables
        "@opentelemetry/instrumentation-graphql": {
            mergeItems: true,
            allowValues: true,
            depth: 3,
        },
    };

    // Merge with custom instrumentation config if provided
    const instrumentationConfig = customConfig.instrumentations
        ? { ...defaultInstrumentationConfig, ...customConfig.instrumentations }
        : defaultInstrumentationConfig;

    const sdk = new NodeSDK({
        resource,
        sampler: new TraceIdRatioBasedSampler(config.samplingRatio),
        traceExporter,
        metricReader: new PeriodicExportingMetricReader({
            exporter: metricExporter,
            exportIntervalMillis: config.metricExportInterval,
        }),
        logRecordProcessors: [new BatchLogRecordProcessor(logExporter)],
        instrumentations: [getNodeAutoInstrumentations(instrumentationConfig)],
    });

    sdk.start();

    process.stdout.write(
        `\n [OTel] ✅ SDK started — exporting to ${endpoint}\n`,
    );

    return sdk;
};

// ── Auto-initialize on import (unless explicitly disabled) ───────────────
let sdk = null;
try {
    sdk = initOtel();
} catch (err) {
    process.stderr.write(`\n [OTel] Initialization error: ${err.message}\n`);
}

// ── Graceful shutdown — flush all pending spans / metrics / logs ──────────
/**
 * Shutdown the OTel SDK gracefully
 *
 * @param {NodeSDK} sdkInstance - SDK instance to shutdown (optional, uses global if not provided)
 * @returns {Promise<void>}
 *
 * @example
 * import { shutdownOtel } from '@yourorg/otel-signoz-plugin/otel';
 * process.on('SIGTERM', async () => {
 *     await shutdownOtel();
 *     process.exit(0);
 * });
 */
export const shutdownOtel = async (sdkInstance = sdk) => {
    if (sdkInstance) {
        try {
            await sdkInstance.shutdown();
            process.stdout.write(
                "\n [OTel] 🔒 SDK flushed and shut down cleanly\n",
            );
        } catch (err) {
            process.stderr.write(`\n [OTel] Shutdown error: ${err.message}\n`);
        }
    }
};

// ── Handle process termination ──────────────────────────────────────────────
const setupShutdownHandlers = (sdkInstance = sdk) => {
    const signals = ["SIGTERM", "SIGINT", "SIGHUP"];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            await shutdownOtel(sdkInstance);
        });
    });
};

if (sdk) {
    setupShutdownHandlers(sdk);
}

export default sdk;
