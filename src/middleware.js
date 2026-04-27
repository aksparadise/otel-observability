// src/middleware.js
// ─────────────────────────────────────────────────────────────────────────────
//  OpenTelemetry Context Injection Middleware — OTel Signoz Plugin
//
//  This middleware extracts authenticated user and tenant identities
//  and attaches them to the current OpenTelemetry span.
//
//  This enables:
//    1. Automatic correlation of logs with User IDs in SigNoz.
//    2. Filtering traces by Tenant (Client ID).
//    3. Professional audit trails without manual tagging in every controller.
//
//  Usage:
//    import { otelContextMiddleware } from '@yourorg/otel-signoz-plugin/middleware';
//    app.use(otelContextMiddleware);
// ─────────────────────────────────────────────────────────────────────────────

import { setTraceAttributes } from "./tracer.js";
import { logger } from "./logger.js";

/**
 * Default configuration for the middleware
 */
const DEFAULT_MIDDLEWARE_CONFIG = {
    userIdPaths: ["user._id", "user.id", "auth.principal_id", "req.user"],
    tenantIdPaths: ["user.client_id", "auth.tenant_client_id", "req.tenant"],
    delegationIdPaths: ["auth.delegation_id"],
    includeClientIp: true,
    includeUserAgent: false,
    includeRequestId: false,
};

let middlewareConfig = { ...DEFAULT_MIDDLEWARE_CONFIG };

/**
 * Configure the middleware with custom options
 *
 * @param {Object} config - Middleware configuration
 * @param {string[]} config.userIdPaths - Paths to extract user ID from request
 * @param {string[]} config.tenantIdPaths - Paths to extract tenant ID from request
 * @param {string[]} config.delegationIdPaths - Paths to extract delegation ID from request
 * @param {boolean} config.includeClientIp - Include client IP in trace (default: true)
 * @param {boolean} config.includeUserAgent - Include user agent in trace (default: false)
 * @param {boolean} config.includeRequestId - Include request ID in trace (default: false)
 *
 * @example
 * import { configureMiddleware } from '@yourorg/otel-signoz-plugin/middleware';
 * configureMiddleware({
 *   userIdPaths: ['user._id', 'auth.userId'],
 *   tenantIdPaths: ['user.tenantId'],
 *   includeClientIp: true
 * });
 */
export const configureMiddleware = (config = {}) => {
    middlewareConfig = { ...DEFAULT_MIDDLEWARE_CONFIG, ...config };
};

/**
 * Extract value from nested object using dot notation path
 *
 * @param {Object} obj - Object to extract from
 * @param {string} path - Dot notation path (e.g., 'user._id')
 * @returns {any} - Extracted value or undefined
 */
const extractByPath = (obj, path) => {
    if (!obj || !path) return undefined;

    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
        if (current == null) return undefined;
        current = current[key];
    }

    return current;
};

/**
 * Extract user ID from request using configured paths
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - User ID or null
 */
const extractUserId = (req) => {
    for (const path of middlewareConfig.userIdPaths) {
        const value = extractByPath(req, path);
        if (value != null) return String(value);
    }
    return "anonymous";
};

/**
 * Extract tenant ID from request using configured paths
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - Tenant ID or null
 */
const extractTenantId = (req) => {
    for (const path of middlewareConfig.tenantIdPaths) {
        const value = extractByPath(req, path);
        if (value != null) return String(value);
    }
    return "system";
};

/**
 * Extract delegation ID from request using configured paths
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - Delegation ID or null
 */
const extractDelegationId = (req) => {
    for (const path of middlewareConfig.delegationIdPaths) {
        const value = extractByPath(req, path);
        if (value != null) return String(value);
    }
    return null;
};

/**
 * OpenTelemetry Identity Context Middleware
 *
 * ⚠️ MUST run after authentication middleware (e.g., verifyToken)
 * so that req.user is available.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 *
 * @example
 * import express from 'express';
 * import { otelContextMiddleware } from '@yourorg/otel-signoz-plugin/middleware';
 *
 * const app = express();
 * app.use(verifyToken); // Authentication middleware
 * app.use(otelContextMiddleware); // OTel context injection
 */
export const otelContextMiddleware = (req, res, next) => {
    try {
        // 1. Identify User/Tenant from request
        const userId = extractUserId(req);
        const tenantId = extractTenantId(req);
        const delegationId = extractDelegationId(req);

        // 2. Build attributes to inject into OTel Context
        const attributes = {
            "user.id": userId,
            "tenant.id": tenantId,
        };

        if (delegationId) {
            attributes["user.delegation_id"] = delegationId;
            attributes["user.is_delegated"] = "true";
        }

        // 3. Add request metadata if configured
        if (middlewareConfig.includeClientIp) {
            attributes["http.client_ip"] = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
        }

        if (middlewareConfig.includeUserAgent) {
            attributes["http.user_agent"] = req.get("user-agent");
        }

        if (middlewareConfig.includeRequestId) {
            attributes["http.request_id"] = req.id || req.headers["x-request-id"];
        }

        // 4. Apply to Tracer
        setTraceAttributes(attributes);

    } catch (err) {
        // Silently fail to ensure request processing continues
        logger.debug("Failed to inject OTel context identity", { error: err.message });
    }

    next();
};

/**
 * Create a custom middleware with specific extraction logic
 * Useful when you have non-standard authentication patterns
 *
 * @param {Function} extractor - Function that extracts user/tenant info from request
 * @returns {Function} - Express middleware function
 *
 * @example
 * import { createCustomMiddleware } from '@yourorg/otel-signoz-plugin/middleware';
 *
 * const customMiddleware = createCustomMiddleware((req) => {
 *   return {
 *     userId: req.session?.userId,
 *     tenantId: req.session?.tenantId,
 *     customAttribute: req.session?.role
 *   };
 * });
 *
 * app.use(customMiddleware);
 */
export const createCustomMiddleware = (extractor) => {
    return (req, res, next) => {
        try {
            const extracted = extractor(req);
            if (extracted) {
                const attributes = {};

                if (extracted.userId) {
                    attributes["user.id"] = String(extracted.userId);
                }

                if (extracted.tenantId) {
                    attributes["tenant.id"] = String(extracted.tenantId);
                }

                // Add any custom attributes
                Object.entries(extracted).forEach(([key, value]) => {
                    if (key !== "userId" && key !== "tenantId" && value != null) {
                        attributes[key] = String(value);
                    }
                });

                setTraceAttributes(attributes);
            }
        } catch (err) {
            logger.debug("Failed to inject custom OTel context", { error: err.message });
        }

        next();
    };
};

export default otelContextMiddleware;
