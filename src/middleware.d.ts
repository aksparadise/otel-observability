// src/middleware.d.ts
// TypeScript type definitions for @aksparadise/otel-observability/middleware

import { Request, Response, NextFunction } from 'express';

export function otelContextMiddleware(req: Request, res: Response, next: NextFunction): void;
