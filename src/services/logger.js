/**
 * Logger service for consistent logging across the application
 * @module services/logger
 */

class Logger {
    constructor() {
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            green: '\x1b[32m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            magenta: '\x1b[35m',
            cyan: '\x1b[36m',
        };
    }

    /**
     * Format log message with emoji (timestamp removed)
     * @param {string} level - Log level
     * @param {string} message - Log message
     * @param {string} emoji - Emoji for the log level
     * @param {string} color - Color code for the message
     * @returns {string} Formatted log message
     */
    formatMessage(level, message, emoji, color) {
        return `${color}${emoji} ${message}${this.colors.reset}`;
    }

    /**
     * Log info message
     * @param {string} message - Message to log
     */
    info(message) {
        console.log(
            this.formatMessage('info', message, 'ℹ️', this.colors.blue)
        );
    }

    /**
     * Log success message
     * @param {string} message - Message to log
     */
    success(message) {
        console.log(
            this.formatMessage('success', message, '✅', this.colors.green)
        );
    }

    /**
     * Log warning message
     * @param {string} message - Message to log
     */
    warn(message) {
        console.warn(
            this.formatMessage('warn', message, '⚠️', this.colors.yellow)
        );
    }

    /**
     * Log error message
     * @param {string} message - Message to log
     * @param {Error} [error] - Optional error object
     */
    error(message, error = null) {
        const errorMessage = error ? `${message}: ${error.message}` : message;
        console.error(
            this.formatMessage('error', errorMessage, '❌', this.colors.red)
        );
        if (error && error.stack) {
            console.error(error.stack);
        }
    }

    /**
     * Log debug message (only in development)
     * @param {string} message - Message to log
     */
    debug(message) {
        if (process.env.NODE_ENV !== 'production') {
            console.log(
                this.formatMessage('debug', message, '🐛', this.colors.magenta)
            );
        }
    }

    /**
     * Log request with user information
     * @param {Object} req - Express request object
     */
    request(req) {
        const reqPath = req.path.split('/').slice(-2).join('/');
        if (reqPath.includes('.')) return;

        const userInfo = req.session?.user
            ? `${req.session.user.first_name} ${req.session.user.last_name}`
            : '👻';

        this.info(`${userInfo} ${req.method} ${req.url}`);
    }

    /**
     * Log cache operations
     * @param {string} operation - Cache operation (hit, miss, set, clear)
     * @param {string} path - Request path
     */
    cache(operation, path) {
        const emoji =
            {
                hit: '💾',
                miss: '🔍',
                set: '📝',
                clear: '🗑️',
            }[operation] || '📦';

        this.info(`${emoji} Cache ${operation} for ${path}`);
    }

    /**
     * Log server startup
     * @param {number} port - Server port
     */
    serverStart(port) {
        this.success(`Server running at http://localhost:${port}`);
    }

    /**
     * Log database connection
     */
    dbConnected() {
        this.success('Database connection successful');
    }

    /**
     * Log process termination
     * @param {string} reason - Reason for termination
     */
    processExit(reason) {
        this.error(`Process exiting: ${reason}`);
    }
}

// Create singleton instance
const logger = new Logger();

export default logger;
