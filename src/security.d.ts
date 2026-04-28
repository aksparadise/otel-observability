// src/security.d.ts
// TypeScript type definitions for @aksparadise/otel-observability/security

export interface SecurityCheckResult {
  hasVulnerabilities: boolean;
  vulnerabilities: Array<{
    name: string;
    severity: string;
    package: string;
  }>;
}

export function runSecurityCheck(): SecurityCheckResult;
