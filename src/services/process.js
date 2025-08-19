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
     * Handle port already in use error
     * @param {number} port - Port that's in use
     * @param {Function} callback - Callback with new port
     */
    async handlePortInUse(port, callback) {
        logger.error(`Port ${port} is already in use`);

        if (config.server.killPortBlockers) {
            logger.info(`Attempting to kill processes using port ${port}...`);
            try {
                const pids = execSync(`lsof -t -i:${port}`)
                    .toString()
                    .trim()
                    .split('\n');

                if (pids.length > 0) {
                    for (const pid of pids) {
                        logger.info(
                            `Killing process ${pid} using port ${port}...`
                        );
                        execSync(`kill -9 ${pid}`);
                        logger.success(`Process ${pid} killed`);
                    }
                    logger.info('Restarting server...');
                    this.restartProcess();
                } else {
                    logger.error('No process found using the port');
                }
            } catch (killErr) {
                logger.error('Failed to kill process using the port', killErr);
                process.exit(1);
            }
        } else {
            const newPort = port + 1;
            logger.info(`Restarting server on new port ${newPort}...`);
            callback(newPort);
        }
    }

    /**
     * Restart the current process
     */
    restartProcess() {
        spawn(process.argv.shift(), process.argv, {
            cwd: process.cwd(),
            detached: true,
            stdio: 'inherit',
        });
        process.exit(1);
    }

    /**
     * Setup graceful shutdown handlers
     * @param {Object} server - HTTP server instance
     */
    gracefulShutdown(server) {
        const shutdown = (signal) => {
            logger.info(`Received ${signal}, shutting down gracefully...`);

            server.close((err) => {
                if (err) {
                    logger.error('Error during server shutdown', err);
                    process.exit(1);
                }
                logger.info('Server closed successfully');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }

    /**
     * Setup global process error handlers
     */
    setupProcessHandlers() {
        process.on('uncaughtException', (err) => {
            logger.error('Uncaught Exception', err);
            if (config.server.restartOnError) {
                logger.info('Restarting server due to uncaught exception...');
                this.restartProcess();
            } else {
                process.exit(1);
            }
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error(
                `Unhandled Rejection at: ${promise}, reason: ${reason}`
            );
            if (config.server.restartOnError) {
                logger.info('Restarting server due to unhandled rejection...');
                this.restartProcess();
            } else {
                process.exit(1);
            }
        });
    }
}

// Create singleton instance
const processManager = new ProcessManager();

export default processManager;
