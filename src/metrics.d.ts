export interface MetricAttributes {
    [key: string]: string | number | boolean | undefined;
}

export interface Counter {
    add(value: number, attributes?: MetricAttributes): void;
}

export interface Histogram {
    record(value: number, attributes?: MetricAttributes): void;
}

export interface UpDownCounter {
    add(value: number, attributes?: MetricAttributes): void;
}

export interface ObservableGauge {
    addCallback?(callback: Function): void;
    removeCallback?(callback: Function): void;
}

export function createCounter(name: string, options?: { description?: string; unit?: string }): Counter;
export function createHistogram(name: string, options?: { description?: string; unit?: string; boundaries?: number[] }): Histogram;
export function createUpDownCounter(name: string, options?: { description?: string; unit?: string }): UpDownCounter;
export function createObservableGauge(
    name: string,
    options?: { description?: string; unit?: string; callback?: Function },
): ObservableGauge;
export function createMetricsBatch(config?: Record<string, any>): Record<string, any>;
export function isMetricsEnabled(): boolean;

declare const metrics: {
    createCounter: typeof createCounter;
    createHistogram: typeof createHistogram;
    createUpDownCounter: typeof createUpDownCounter;
    createObservableGauge: typeof createObservableGauge;
    createMetricsBatch: typeof createMetricsBatch;
    isMetricsEnabled: typeof isMetricsEnabled;
};

export default metrics;
