/**
 * Process management service for handling server lifecycle
 * @module services/processManager
 */

import { execSync, spawn } from 'child_process';
import config from '../config/index.js';
import logger from './logger.js';

class ProcessManager {
    constructor() {
        this.setupProcessHandlers();
    }

    /**
     * Setup process event handlers
     */
    setupProcessHandlers() {
        process.on(
            'uncaughtException',
            this.handleUncaughtException.bind(this)
        );
        process.on(
            'unhandledRejection',
            this.handleUnhandledRejection.bind(this)
        );
        process.on('SIGINT', this.handleSigint.bind(this));
        process.on('SIGTERM', this.handleSigterm.bind(this));
    }

    /**
     * Handle uncaught exceptions
     * @param {Error} err - The uncaught exception
     */
    handleUncaughtException(err) {
        logger.error('Uncaught Exception', err);
        if (config.server.restartOnError) {
            this.restartServer('uncaught exception');
        } else {
            process.exit(1);
        }
    }

    /**
     * Handle unhandled promise rejections
     * @param {*} reason - Rejection reason
     * @param {Promise} promise - The rejected promise
     */
    handleUnhandledRejection(reason, promise) {
        logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
        if (config.server.restartOnError) {
            this.restartServer('unhandled rejection');
        } else {
            process.exit(1);
        }
    }

    /**
     * Handle SIGINT signal (Ctrl+C)
     */
    handleSigint() {
        logger.info('Received SIGINT, shutting down gracefully...');
        process.exit(0);
    }

    /**
     * Handle SIGTERM signal
     */
    handleSigterm() {
        logger.info('Received SIGTERM, shutting down gracefully...');
        process.exit(0);
    }

    /**
     * Handle port already in use error
     * @param {number} port - Current port
     * @param {Function} callback - Callback to restart server on new port
     */
    async handlePortInUse(port, callback) {
        logger.error(`Port ${port} is already in use`);

        if (config.server.killPortBlockers) {
            try {
                logger.info(
                    `Attempting to kill processes using port ${port}...`
                );
                const pids = execSync(`lsof -t -i:${port}`)
                    .toString()
                    .trim()
                    .split('\n')
                    .filter((pid) => pid);

                if (pids.length > 0) {
                    for (const pid of pids) {
                        logger.info(
                            `Killing process ${pid} using port ${port}...`
                        );
                        execSync(`kill -9 ${pid}`);
                        logger.success(`Process ${pid} killed`);
                    }

                    logger.info('Restarting server...');
                    this.restartServer('port conflict resolved');
                } else {
                    logger.warn('No process found using the port');
                    callback(port + 1);
                }
            } catch (killErr) {
                logger.error('Failed to kill process using the port', killErr);
                callback(port + 1);
            }
        } else {
            callback(port + 1);
        }
    }

    /**
     * Restart the server process
     * @param {string} reason - Reason for restart
     */
    restartServer(reason) {
        logger.info(`Restarting server due to ${reason}...`);

        spawn(process.argv.shift(), process.argv, {
            cwd: process.cwd(),
            detached: true,
            stdio: 'inherit',
        });

        process.exit(1);
    }

    /**
     * Graceful shutdown
     * @param {http.Server} server - Express server instance
     * @param {Function} cleanup - Optional cleanup function
     */
    gracefulShutdown(server, cleanup) {
        const shutdown = async (signal) => {
            logger.info(`${signal} signal received: closing HTTP server`);

            if (cleanup && typeof cleanup === 'function') {
                try {
                    await cleanup();
                } catch (err) {
                    logger.error('Error during cleanup', err);
                }
            }

            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });

            // Force close after 10 seconds
            setTimeout(() => {
                logger.error(
                    'Could not close connections in time, forcefully shutting down'
                );
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }
}

// Create singleton instance
const processManager = new ProcessManager();

export default processManager;
