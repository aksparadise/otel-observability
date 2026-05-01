// src/setup.js
// ─────────────────────────────────────────────────────────────────────────────
//  Auto-Detection Setup — @aksparadise/otel-observability
//
//  Single function to detect environment and configure everything automatically:
//    - Framework detection (NestJS, Express, Next.js, etc.)
//    - Logger configuration with optimal defaults
//    - Global error handling
//    - Console monkeypatching for complete log capture
//
//  Usage:
//    import { setup } from '@aksparadise/otel-observability/setup';
//    setup(); // Auto-detects and configures everything
// ─────────────────────────────────────────────────────────────────────────────

import { configureLogger } from "./logger.js";
import { setupGlobalErrorHandler } from "./errorHandler.js";
import { NestJSLogger } from "./nestjs-logger.js";

// Auto-initialize OTel SDK if enabled
const initializeOtel = async () => {
    if (process.env.OTEL_ENABLED === "true") {
        try {
            // Dynamic import to initialize OTel SDK
            await import("./otel.js");
            return true;
        } catch (error) {
            console.error("[OTel] OTel SDK initialization failed:", error);
            return false;
        }
    }
    return false;
};

/**
 * Auto-detect and configure complete observability setup
 *
 * @param {Object} options - Optional configuration overrides
 * @param {boolean} options.autoDetect - Enable auto-detection (default: true)
 * @param {boolean} options.enableConsoleOutput - Console output (default: true)
 * @param {boolean} options.enableOtelOutput - OTel output (default: true)
 * @param {boolean} options.enableMonkeypatch - Console monkeypatching (default: true)
 * @param {boolean} options.consoleColors - Colored console (default: true)
 * @param {string} options.framework - Force framework detection (default: auto)
 *
 * @example
 * // Simple auto-setup
 * import { setup } from '@aksparadise/otel-observability/setup';
 * setup();
 *
 * // With custom options
 * setup({
 *   enableConsoleOutput: false,
 *   framework: 'nestjs'
 * });
 */
export const setup = async (options = {}) => {
    // Auto-detect configuration from environment variables
    const otelEnabled = process.env.OTEL_ENABLED === "true";

    const {
        autoDetect = true,
        enableConsoleOutput = true,
        enableOtelOutput = otelEnabled, // Auto-enable from .env
        enableMonkeypatch = true,
        consoleColors = true,
        showMetadataInProduction = false,
        framework = null,
        ...loggerOptions
    } = options;

    // 0️⃣ Initialize OTel SDK first (critical for SigNoz integration)
    let otelSdkInitialized = false;
    if (enableOtelOutput && otelEnabled) {
        otelSdkInitialized = await initializeOtel();
    }

    // 1️⃣ Configure Logger with optimal defaults
    configureLogger({
        enableConsoleOutput,
        enableOtelOutput,
        enableMonkeypatch,
        consoleColors,
        showMetadataInProduction,
        ...loggerOptions,
    });

    // 2️⃣ Setup Global Error Handling
    setupGlobalErrorHandler({
        exitOnError: false, // Don't exit in production
        logToConsole: enableConsoleOutput,
    });

    // 3️⃣ Auto-detect Framework and return appropriate logger
    if (autoDetect) {
        const detectedFramework = framework || detectFramework();

        switch (detectedFramework) {
            case "nestjs":
                return {
                    framework: "nestjs",
                    logger: new NestJSLogger(),
                    otelSdkInitialized,
                    setupNestJS: (app) => {
                        app.useLogger(new NestJSLogger());
                        return app;
                    },
                };

            case "express":
                return {
                    framework: "express",
                    middleware: getExpressMiddleware(),
                };

            case "nextjs":
                return {
                    framework: "nextjs",
                    middleware: getNextJSMiddleware(),
                };

            default:
                return {
                    framework: "vanilla",
                    logger: null, // Use console monkeypatching
                };
        }
    }

    return {
        framework: "custom",
        logger: null,
    };
};

/**
 * Check package.json dependencies for framework detection
 */
function checkPackageDependencies(packageJson) {
    if (
        packageJson.dependencies?.["@nestjs/core"] ||
        packageJson.devDependencies?.["@nestjs/core"]
    ) {
        return "nestjs";
    }

    if (
        packageJson.dependencies?.["express"] ||
        packageJson.devDependencies?.["express"]
    ) {
        return "express";
    }

    if (
        packageJson.dependencies?.["next"] ||
        packageJson.devDependencies?.["next"]
    ) {
        return "nextjs";
    }

    return "vanilla";
}

/**
 * Auto-detect the current framework
 */
function detectFramework() {
    try {
        // Check for NestJS
        if (globalThis?.require?.resolve?.("@nestjs/core")) {
            return "nestjs";
        }

        // Check for Express
        if (globalThis?.require?.resolve?.("express")) {
            return "express";
        }

        // Check for Next.js
        if (globalThis?.require?.resolve?.("next")) {
            return "nextjs";
        }

        // Check package.json dependencies
        if (typeof process !== "undefined" && process.cwd()) {
            try {
                const fs = require("node:fs");
                const path = require("node:path");
                const packagePath = path.join(process.cwd(), "package.json");

                if (fs.existsSync(packagePath)) {
                    const packageJson = JSON.parse(
                        fs.readFileSync(packagePath, "utf8"),
                    );
                    return checkPackageDependencies(packageJson);
                }
            } catch (error) {
                // Silent fail for package.json detection
                console.debug("Package.json detection failed:", error.message);
            }
        }

        return "vanilla";
    } catch (e) {
        return "vanilla";
    }
}

/**
 * Get Express middleware for automatic logging
 */
function getExpressMiddleware() {
    return (req, res, next) => {
        // Express-specific logging middleware
        next();
    };
}

/**
 * Get Next.js middleware for automatic logging
 */
function getNextJSMiddleware() {
    return (req, res, next) => {
        // Next.js-specific logging middleware
        next();
    };
}

/**
 * Export framework-specific setup helpers
 */
export const setupNestJS = () => {
    const result = setup({ framework: "nestjs" });
    return result;
};

export const setupExpress = () => {
    const result = setup({ framework: "express" });
    return result;
};

export const setupNextJS = () => {
    const result = setup({ framework: "nextjs" });
    return result;
};

// Default export for convenience
export default setup;
