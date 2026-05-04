// src/sanitizer.js
// ─────────────────────────────────────────────────────────────────────────────
//  Global Security Sanitizer — OTel Signoz Plugin
//
//  Redacts sensitive fields (passwords, tokens, secrets) from objects
//  and strings to prevent accidental leakage into logs or SigNoz.
//
//  Usage:
//    import { sanitize } from '@aksparadise/otel-observability/sanitizer';
//    const safeData = sanitize(userData);
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default sensitive field names to redact
 */
const DEFAULT_SENSITIVE_FIELDS = new Set([
    "password",
    "token",
    "secret",
    "key",
    "authorization",
    "credit_card",
    "creditcard",
    "ssn",
    "social_security",
    "bank_account",
    "bankaccount",
    "cvv",
    "cvc",
    "otp",
    "passphrase",
    "private_key",
    "privatekey",
    "api_key",
    "apikey",
    "access_token",
    "accesstoken",
    "refresh_token",
    "refreshtoken",
    "auth_token",
    "authtoken",
    "session_token",
    "sessiontoken",
    "bearer",
    "csrf",
    "xsrf",
]);

let sensitiveFields = new Set(DEFAULT_SENSITIVE_FIELDS);

/**
 * Maximum recursion depth to prevent stack overflow
 */
const MAX_DEPTH = 5;

/**
 * Redaction value to use for sensitive data
 */
const REDACTION_VALUE = "[REDACTED]";

/**
 * Configure custom sensitive fields
 *
 * @param {string[]} fields - Array of field names to redact
 * @param {boolean} merge - Whether to merge with default fields (default: true)
 *
 * @example
 * import { configureSensitiveFields } from '@aksparadise/otel-observability/sanitizer';
 * configureSensitiveFields(['custom_secret', 'internal_key'], true);
 */
export const configureSensitiveFields = (fields, merge = true) => {
    if (merge) {
        sensitiveFields = new Set([...DEFAULT_SENSITIVE_FIELDS, ...fields]);
    } else {
        sensitiveFields = new Set(fields);
    }
};

/**
 * Reset sensitive fields to defaults
 */
export const resetSensitiveFields = () => {
    sensitiveFields = new Set(DEFAULT_SENSITIVE_FIELDS);
};

/**
 * Check if a field name is sensitive
 *
 * @param {string} fieldName - Field name to check
 * @returns {boolean} - True if field is sensitive
 */
const isSensitiveField = (fieldName) => {
    if (!fieldName || typeof fieldName !== "string") return false;
    const lowerFieldName = fieldName.toLowerCase();
    
    for (const field of sensitiveFields) {
        if (lowerFieldName.includes(field)) {
            return true;
        }
    }
    return false;
};

/**
 * Sanitize a string by redacting sensitive query parameters
 *
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
const sanitizeString = (str) => {
    if (!str || typeof str !== "string") return str;

    let sanitized = str;
    sensitiveFields.forEach((field) => {
        // Match pattern: field=value in query strings
        const regex = new RegExp(`(${field}=)([^&\\s]+)`, "gi");
        sanitized = sanitized.replace(regex, `$1${REDACTION_VALUE}`);
    });

    return sanitized;
};

/**
 * Sanitize an array recursively
 *
 * @param {Array} arr - Array to sanitize
 * @param {number} depth - Current recursion depth
 * @returns {Array} - Sanitized array
 */
const sanitizeArray = (arr, depth) => {
    if (depth > MAX_DEPTH) return [REDACTION_VALUE];
    return arr.map((item) => sanitize(item, depth + 1));
};

/**
 * Sanitize an object recursively
 *
 * @param {Object} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @returns {Object} - Sanitized object
 */
const sanitizeObject = (obj, depth) => {
    if (depth > MAX_DEPTH) return { [REDACTION_VALUE]: REDACTION_VALUE };

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (isSensitiveField(key)) {
            sanitized[key] = REDACTION_VALUE;
        } else if (value != null && typeof value === "object") {
            sanitized[key] = sanitize(value, depth + 1);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
};

/**
 * Recursively redacts sensitive fields from an object or string.
 *
 * @param {any} data - The data to sanitize
 * @param {number} depth - Internal depth tracker (for recursion)
 * @returns {any} - The sanitized data
 *
 * @example
 * import { sanitize } from '@aksparadise/otel-observability/sanitizer';
 *
 * const userData = {
 *   email: 'user@example.com',
 *   password: 'secret123',
 *   apiKey: 'abc-123-def'
 * };
 *
 * const safeData = sanitize(userData);
 * // { email: 'user@example.com', password: '[REDACTED]', apiKey: '[REDACTED]' }
 */
export const sanitize = (data, depth = 0) => {
    // ── Performance Optimization: Limit recursion depth ──
    if (depth > MAX_DEPTH) return REDACTION_VALUE;
    if (data == null) return data;

    // Handle strings (simple match for known keys in query strings)
    if (typeof data === "string") {
        return sanitizeString(data);
    }

    // Handle non-objects (numbers, booleans, etc.)
    if (typeof data !== "object") return data;

    // Handle Arrays
    if (Array.isArray(data)) {
        return sanitizeArray(data, depth);
    }

    // Handle Objects
    return sanitizeObject(data, depth);
};

/**
 * Sanitize only specific fields in an object
 * Useful when you want to redact only certain fields
 *
 * @param {Object} obj - Object to sanitize
 * @param {string[]} fields - Fields to redact
 * @returns {Object} - Sanitized object
 *
 * @example
 * import { sanitizeFields } from '@aksparadise/otel-observability/sanitizer';
 *
 * const data = { email: 'test@example.com', password: 'secret', name: 'John' };
 * const safeData = sanitizeFields(data, ['password']);
 * // { email: 'test@example.com', password: '[REDACTED]', name: 'John' }
 */
export const sanitizeFields = (obj, fields) => {
    if (!obj || typeof obj !== "object") return obj;
    if (!fields || !Array.isArray(fields)) return obj;

    const sanitized = { ...obj };
    fields.forEach((field) => {
        if (field in sanitized) {
            sanitized[field] = REDACTION_VALUE;
        }
    });

    return sanitized;
};

/**
 * Mask a string value with asterisks
 * Useful for partial redaction (e.g., showing last 4 digits of a card)
 *
 * @param {string} value - Value to mask
 * @param {Object} options - Masking options
 * @param {number} options.visibleChars - Number of characters to keep visible (default: 4)
 * @param {string} options.maskChar - Character to use for masking (default: '*')
 * @param {boolean} options.showEnd - Show visible characters at end (default: true)
 * @returns {string} - Masked string
 *
 * @example
 * import { maskString } from '@aksparadise/otel-observability/sanitizer';
 *
 * maskString('1234567890123456', { visibleChars: 4 });
 * // '************3456'
 *
 * maskString('user@example.com', { visibleChars: 2, showEnd: false });
 * // 'er@example.com'
 */
export const maskString = (value, options = {}) => {
    if (!value || typeof value !== "string") return value;

    const {
        visibleChars = 4,
        maskChar = "*",
        showEnd = true,
    } = options;

    if (value.length <= visibleChars) {
        return maskChar.repeat(value.length);
    }

    if (showEnd) {
        const visible = value.slice(-visibleChars);
        const masked = maskChar.repeat(value.length - visibleChars);
        return masked + visible;
    } else {
        const visible = value.slice(0, visibleChars);
        const masked = maskChar.repeat(value.length - visibleChars);
        return visible + masked;
    }
};

export default sanitize;
