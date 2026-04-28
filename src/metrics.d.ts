// src/metrics.d.ts
// TypeScript type definitions for @aksparadise/otel-observability/metrics

export interface MetricAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface Counter {
  add(value: number, attributes?: MetricAttributes): void;
}

export interface Histogram {
  record(value: number, attributes?: MetricAttributes): void;
}

export interface Gauge {
  record(value: number, attributes?: MetricAttributes): void;
}

export function createCounter(name: string, options?: { description?: string; unit?: string }): Counter;
export function createHistogram(name: string, options?: { description?: string; unit?: string; boundaries?: number[] }): Histogram;
export function createGauge(name: string, options?: { description?: string; unit?: string }): Gauge;
export function createObservableGauge(name: string, options?: { description?: string; unit?: string }): Gauge;
