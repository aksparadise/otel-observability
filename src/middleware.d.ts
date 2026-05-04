export interface MiddlewareConfig {
    userIdPaths?: string[];
    tenantIdPaths?: string[];
    delegationIdPaths?: string[];
    includeClientIp?: boolean;
    includeUserAgent?: boolean;
    includeRequestId?: boolean;
}

export type Middleware = (req: any, res: any, next: () => void) => void;
export type ContextExtractor = (req: any) => Record<string, unknown> | null | undefined;

export function otelContextMiddleware(req: any, res: any, next: () => void): void;
export function configureMiddleware(config?: MiddlewareConfig): void;
export function createCustomMiddleware(extractor?: ContextExtractor): Middleware;

export default otelContextMiddleware;
