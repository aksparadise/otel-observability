// src/metrics.js
// ─────────────────────────────────────────────────────────────────────────────
//  OpenTelemetry Metrics Factory — OTel Signoz Plugin
//
//  Provides a factory pattern to create custom business metrics.
//  All metrics are exported by the OTel SDK → OTel Collector → Prometheus
//  They appear in SigNoz under the "Prometheus" datasource.
//
//  Usage example:
//    import { createCounter, createHistogram, createGauge } from '@yourorg/otel-signoz-plugin/metrics';
//    const requestCounter = createCounter('http_requests_total', { description: 'Total HTTP requests' });
//    requestCounter.add(1, { method: 'GET', route: '/api/users' });
//
//  Safe to import when OTEL_ENABLED=false — all metric operations are no-ops.
// ─────────────────────────────────────────────────────────────────────────────

import { metrics } from "@opentelemetry/api";

const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "unknown-service";
const SERVICE_VERSION = process.env.OTEL_SERVICE_VERSION || "1.0.0";

/**
 * Get the global meter instance
 * @returns {Meter} - OpenTelemetry Meter instance
 */
const getMeter = () => {
    try {
        return metrics.getMeter(SERVICE_NAME, SERVICE_VERSION);
    } catch (err) {
        // Return no-op meter if OTel is not initialized
        return metrics.getMeter(SERVICE_NAME);
    }
};

const meter = getMeter();

/**
 * Create a Counter metric (monotonically increasing value)
 *
 * @param {string} name - Metric name (should use snake_case)
 * @param {Object} options - Metric configuration
 * @param {string} options.description - Human-readable description
 * @param {string} options.unit - Unit of measurement (e.g., '1', 'bytes', 'ms')
 * @returns {Counter} - OpenTelemetry Counter instance
 *
 * @example
 * import { createCounter } from '@yourorg/otel-signoz-plugin/metrics';
 *
 * const emailsSent = createCounter('emails_sent_total', {
 *   description: 'Total emails successfully sent',
 *   unit: '1'
 * });
 *
 * emailsSent.add(1, { domain: 'example.com', status: 'delivered' });
 */
export const createCounter = (name, options = {}) => {
    try {
        return meter.createCounter(name, {
            description: options.description || "",
            unit: options.unit || "1",
        });
    } catch (err) {
        // Return no-op counter if OTel is not initialized
        return {
            add: () => {},
            increment: () => {},
        };
    }
};

/**
 * Create a Histogram metric (distribution of values)
 *
 * @param {string} name - Metric name (should use snake_case)
 * @param {Object} options - Metric configuration
 * @param {string} options.description - Human-readable description
 * @param {string} options.unit - Unit of measurement (e.g., 'ms', 'bytes')
 * @param {number[]} options.boundaries - Explicit histogram boundaries (optional)
 * @returns {Histogram} - OpenTelemetry Histogram instance
 *
 * @example
 * import { createHistogram } from '@yourorg/otel-signoz-plugin/metrics';
 *
 * const requestDuration = createHistogram('http_request_duration_ms', {
 *   description: 'HTTP request duration in milliseconds',
 *   unit: 'ms'
 * });
 *
 * const startTime = Date.now();
 * // ... process request ...
 * requestDuration.record(Date.now() - startTime, { method: 'GET', route: '/api/users' });
 */
export const createHistogram = (name, options = {}) => {
    try {
        const histogramOptions = {
            description: options.description || "",
            unit: options.unit || "1",
        };

        if (options.boundaries && Array.isArray(options.boundaries)) {
            histogramOptions.advice = {
                explicitBucketBoundaries: options.boundaries,
            };
        }

        return meter.createHistogram(name, histogramOptions);
    } catch (err) {
        // Return no-op histogram if OTel is not initialized
        return {
            record: () => {},
        };
    }
};

/**
 * Create an UpDownCounter metric (can increase or decrease)
 *
 * @param {string} name - Metric name (should use snake_case)
 * @param {Object} options - Metric configuration
 * @param {string} options.description - Human-readable description
 * @param {string} options.unit - Unit of measurement (e.g., '1', 'bytes')
 * @returns {UpDownCounter} - OpenTelemetry UpDownCounter instance
 *
 * @example
 * import { createUpDownCounter } from '@yourorg/otel-signoz-plugin/metrics';
 *
 * const activeConnections = createUpDownCounter('active_connections_total', {
 *   description: 'Current number of active connections',
 *   unit: '1'
 * });
 *
 * // On connection open
 * activeConnections.add(1, { type: 'websocket' });
 *
 * // On connection close
 * activeConnections.add(-1, { type: 'websocket' });
 */
export const createUpDownCounter = (name, options = {}) => {
    try {
        return meter.createUpDownCounter(name, {
            description: options.description || "",
            unit: options.unit || "1",
        });
    } catch (err) {
        // Return no-op counter if OTel is not initialized
        return {
            add: () => {},
            increment: () => {},
            decrement: () => {},
        };
    }
};

/**
 * Create an ObservableGauge metric (callback-based gauge)
 *
 * @param {string} name - Metric name (should use snake_case)
 * @param {Object} options - Metric configuration
 * @param {string} options.description - Human-readable description
 * @param {string} options.unit - Unit of measurement (e.g., '1', 'bytes')
 * @param {Function} options.callback - Function that returns the current value
 * @returns {ObservableGauge} - OpenTelemetry ObservableGauge instance
 *
 * @example
 * import { createObservableGauge } from '@yourorg/otel-signoz-plugin/metrics';
 *
 * const memoryUsage = createObservableGauge('process_memory_bytes', {
 *   description: 'Current process memory usage in bytes',
 *   unit: 'bytes',
 *   callback: (observableResult) => {
 *     const usage = process.memoryUsage();
 *     observableResult.observe(usage.heapUsed, { type: 'heap' });
 *     observableResult.observe(usage.external, { type: 'external' });
 *   }
 * });
 */
export const createObservableGauge = (name, options = {}) => {
    try {
        return meter.createObservableGauge(name, {
            description: options.description || "",
            unit: options.unit || "1",
        }, (observableResult) => {
            if (typeof options.callback === "function") {
                options.callback(observableResult);
            }
        });
    } catch (err) {
        // Return no-op gauge if OTel is not initialized
        return {
            addCallback: () => {},
            removeCallback: () => {},
        };
    }
};

/**
 * Create a batch of metrics from a configuration object
 * Useful for defining all metrics in one place
 *
 * @param {Object} metricsConfig - Configuration object with metric definitions
 * @returns {Object} - Object containing all created metric instances
 *
 * @example
 * import { createMetricsBatch } from '@yourorg/otel-signoz-plugin/metrics';
 *
 * const metrics = createMetricsBatch({
 *   counters: {
 *     httpRequests: { name: 'http_requests_total', description: 'Total HTTP requests' },
 *     errors: { name: 'errors_total', description: 'Total errors' }
 *   },
 *   histograms: {
 *     requestDuration: { name: 'http_request_duration_ms', description: 'Request duration', unit: 'ms' }
 *   },
 *   gauges: {
 *     activeConnections: { name: 'active_connections_total', description: 'Active connections' }
 *   }
 * });
 *
 * metrics.counters.httpRequests.add(1, { method: 'GET' });
 */
export const createMetricsBatch = (metricsConfig = {}) => {
    const result = {
        counters: {},
        histograms: {},
        gauges: {},
        observableGauges: {},
    };

    // Create counters
    if (metricsConfig.counters) {
        Object.entries(metricsConfig.counters).forEach(([key, config]) => {
            result.counters[key] = createCounter(config.name, config);
        });
    }

    // Create histograms
    if (metricsConfig.histograms) {
        Object.entries(metricsConfig.histograms).forEach(([key, config]) => {
            result.histograms[key] = createHistogram(config.name, config);
        });
    }

    // Create up/down counters (gauges)
    if (metricsConfig.gauges) {
        Object.entries(metricsConfig.gauges).forEach(([key, config]) => {
            result.gauges[key] = createUpDownCounter(config.name, config);
        });
    }

    // Create observable gauges
    if (metricsConfig.observableGauges) {
        Object.entries(metricsConfig.observableGauges).forEach(([key, config]) => {
            result.observableGauges[key] = createObservableGauge(config.name, config);
        });
    }

    return result;
};

/**
 * Check if metrics are enabled
 * @returns {boolean} - True if OTel is enabled and metrics are available
 */
export const isMetricsEnabled = () => {
    try {
        return process.env.OTEL_ENABLED === "true";
    } catch {
        return false;
    }
};
