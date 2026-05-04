export interface SpanContext {
    traceId: string | null;
    spanId: string | null;
}

export function getTracer(name: string): any;
export function withSpan<T>(
    name: string,
    fn: (span: any) => T | Promise<T>,
    attributes?: Record<string, unknown>,
): Promise<T>;
export function getCurrentTraceId(): string | null;
export function getCurrentSpanContext(): SpanContext;
export function setTraceAttributes(attributes?: Record<string, unknown>): void;
export function setTraceUser(userId?: string, tenantId?: string): void;
export function startSpan(name: string, options?: Record<string, unknown>): any;

declare const tracer: {
    getTracer: typeof getTracer;
    withSpan: typeof withSpan;
    getCurrentTraceId: typeof getCurrentTraceId;
    getCurrentSpanContext: typeof getCurrentSpanContext;
    setTraceAttributes: typeof setTraceAttributes;
    setTraceUser: typeof setTraceUser;
    startSpan: typeof startSpan;
};

export default tracer;
