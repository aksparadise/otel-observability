// src/otel.d.ts
// TypeScript type definitions for @aksparadise/otel-observability/otel

export interface OtelConfig {
    enabled?: boolean;
    serviceName?: string;
    serviceVersion?: string;
    backend?: 'signoz' | 'grafana' | 'custom';
    collectorEndpoint?: string;
    grafanaEndpoint?: string;
    grafanaApiKey?: string;
    samplingRatio?: number;
    environment?: string;
    hostname?: string;
    metricExportInterval?: number;
    instrumentations?: Record<string, unknown>;
}

export function initOtel(config?: OtelConfig): unknown;
export function shutdownOtel(sdkInstance?: unknown): Promise<void>;

declare const sdk: unknown;
export default sdk;
