/**
 * Main server application
 * @module server
 */

import express from 'express';
import session from 'express-session';
import http from 'http';
import pgSession from 'connect-pg-simple';

// Import services
import config from './config/index.js';
import logger from './services/logger.js';
import processManager from './services/process.js';

// Import middleware
import { untisCache } from './middleware/cache.js';
import { requestLogger } from './middleware/logging.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Import managers
import AuthManager from './managers/auth.js';
import ApiManager from './managers/api.js';
import DistManager from './managers/dist.js';

// Import utilities
import { getDb } from './utils/db.js';
import {
    loadWidgets,
    handleWidgetReq,
    getWidgetsConfig,
} from '../widgets/index.js';

/**
 * Application class to encapsulate server setup and configuration
 */
class Application {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.port = config.server.port;
        this.db = null;
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        try {
            this.db = getDb();
            await this.db.query('SELECT 1');
            logger.dbConnected();
        } catch (err) {
            logger.error('Failed to connect to the database', err);
            process.exit(1);
        }
    }

    /**
     * Setup middleware
     */
    setupMiddleware() {
        // Basic middleware
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Session middleware
        this.app.use(
            session({
                ...config.session,
                store: new (pgSession(session))({
                    pool: this.db,
                    createTableIfMissing: config.database.createTablesIfMissing,
                }),
            })
        );

        // Request logging
        this.app.use(requestLogger);

        // Untis API cache middleware
        this.app.use('/api/untis', untisCache);
    }

    /**
     * Setup managers
     */
    async setupManagers() {
        // Authentication manager
        const authManager = new AuthManager(this.app);
        authManager.start();

        // Distribution manager
        const distManager = new DistManager(this.app);
        distManager.start();

        // API manager
        const apiManager = new ApiManager(this.app);
        await apiManager.start();

        // Log imported API routes
        for (const [key, value] of Object.entries(apiManager.importedPaths)) {
            logger.success(`Imported ${value} routes from ${key} directory`);
        }
    }

    /**
     * Setup widgets
     */
    async setupWidgets() {
        await loadWidgets();
        this.app.get('/widgets/config', getWidgetsConfig);
        this.app.get('/widgets/:id', handleWidgetReq);
    }

    /**
     * Setup static file serving
     */
    setupStaticFiles() {
        this.app.use(
            express.static('public', {
                extensions: ['html'],
                index: 'index.html',
            })
        );
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        this.app.use(errorHandler);
        this.app.use(notFoundHandler);
    }

    /**
     * Setup server error handling
     */
    setupServerErrorHandling() {
        this.server.on('error', async (err) => {
            if (err.code === 'EADDRINUSE') {
                await processManager.handlePortInUse(this.port, (newPort) => {
                    this.port = newPort;
                    logger.info(
                        `Restarting server on new port ${this.port}...`
                    );
                    this.server.close();
                    this.startServer();
                });
            } else {
                logger.error('Server error', err);
                process.exit(1);
            }
        });
    }

    /**
     * Start the server
     */
    startServer() {
        this.server.listen(this.port, () => {
            logger.serverStart(this.port);
        });
    }

    /**
     * Initialize and start the application
     */
    async start() {
        try {
            // Initialize database
            await this.initializeDatabase();

            // Setup middleware
            this.setupMiddleware();

            // Setup managers
            await this.setupManagers();

            // Setup widgets
            await this.setupWidgets();

            // Setup static files
            this.setupStaticFiles();

            // Setup error handling
            this.setupErrorHandling();

            // Setup server error handling
            this.setupServerErrorHandling();

            // Setup graceful shutdown
            processManager.gracefulShutdown(this.server);

            // Start server
            this.startServer();
        } catch (error) {
            logger.error('Error starting application', error);
            process.exit(1);
        }
    }
}

// Create and start application
const app = new Application();
app.start().catch((err) => {
    logger.error('Failed to start application', err);
    process.exit(1);
});

export default Application;
