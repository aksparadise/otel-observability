// src/sanitizer.d.ts
// TypeScript type definitions for @aksparadise/otel-observability/sanitizer

export function sanitize(data: any): any;
export function configureSensitiveFields(fields: string[], replace?: boolean): void;
export function resetSensitiveFields(): void;
