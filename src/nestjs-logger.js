import { logger } from './logger.js';

/**
 * NestJS-compatible logger that extends ConsoleLogger
 * Automatically routes all NestJS logs through our OTel logger
 * 
 * Usage in NestJS:
 * import { NestJSLogger } from '@aksparadise/otel-observability/nestjs-logger';
 * 
 * const app = await NestFactory.create(AppModule, {
 *   logger: new NestJSLogger(),
 * });
 */
export class NestJSLogger {
    constructor(options = {}) {
        this.options = {
            log: true,
            error: true,
            warn: true,
            debug: false,
            verbose: false,
            ...options
        };
    }

    log(message, context) {
        if (this.options.log) {
            logger.info(message, { context });
        }
    }

    error(message, trace, context) {
        if (this.options.error) {
            logger.error(message, { context, trace });
        }
    }

    warn(message, context) {
        if (this.options.warn) {
            logger.warn(message, { context });
        }
    }

    debug(message, context) {
        if (this.options.debug) {
            logger.debug(message, { context });
        }
    }

    verbose(message, context) {
        if (this.options.verbose) {
            logger.debug(message, { context });
        }
    }

    // NestJS ConsoleLogger compatibility methods
    setLogLevels(levels) {
        this.options.log = levels.includes('log');
        this.options.error = levels.includes('error');
        this.options.warn = levels.includes('warn');
        this.options.debug = levels.includes('debug');
        this.options.verbose = levels.includes('verbose');
    }
}
