// src/logger.d.ts
// TypeScript type definitions for @aksparadise/otel-observability/logger

export interface LoggerConfig {
  enableConsoleOutput?: boolean;
  enableOtelOutput?: boolean;
  enableMonkeypatch?: boolean;
  consoleColors?: boolean;
  showMetadataInProduction?: boolean;
}

export interface Logger {
  info(...args: any[]): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
}

export interface ChildLogger extends Logger {}

export const logger: Logger;
export const configureLogger: (config?: LoggerConfig) => void;
export const createChildLogger: (context?: Record<string, any>) => ChildLogger;
export default logger;
