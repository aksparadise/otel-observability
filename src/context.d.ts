export interface ObservabilityContext {
    [key: string]: unknown;
}

export function runWithContext<T>(context: ObservabilityContext, fn: () => T): T;
export function getContext(): ObservabilityContext;
export function setContext(values?: ObservabilityContext): void;

declare const context: {
    runWithContext: typeof runWithContext;
    getContext: typeof getContext;
    setContext: typeof setContext;
};

export default context;
