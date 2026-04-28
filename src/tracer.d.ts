// src/tracer.d.ts
// TypeScript type definitions for @aksparadise/otel-observability/tracer

export interface SpanContext {
  traceId?: string;
  spanId?: string;
}

export function getCurrentSpanContext(): SpanContext;
export function withSpan<T>(name: string, fn: (span: any) => T | Promise<T>, attributes?: Record<string, any>): Promise<T>;
export function setTraceIdentity(userId?: string, tenantId?: string): void;
