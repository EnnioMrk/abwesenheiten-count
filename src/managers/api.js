import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import logger from '../services/logger.js';

export default class ApiManager {
    constructor(app) {
        this.app = app;
        this.importedPaths = {};
        this.validMethods = [
            'get',
            'post',
            'put',
            'delete',
            'patch',
            'options',
            'head',
        ];
    }

    /**
     * Check if directory exists
     * @param {string} dirPath - Directory path to check
     * @returns {boolean} True if directory exists
     */
    directoryExists(dirPath) {
        return fs.existsSync(dirPath);
    }

    /**
     * Parse filename to extract HTTP method and endpoint
     * @param {string} filename - Filename to parse
     * @returns {Object|null} Object with method and endpoint, or null if invalid
     */
    parseFilename(filename) {
        const filenameParts = path.parse(filename).name.split('-');
        const method = filenameParts[0].toLowerCase();

        if (!this.validMethods.includes(method)) {
            logger.warn(`Invalid HTTP method in filename: ${filename}`);
            return null;
        }

        const endpoint = filenameParts.slice(1).join('-');
        return { method, endpoint };
    }

    /**
     * Normalize route path for URL
     * @param {string} basePath - Base path
     * @param {string} endpoint - Endpoint
     * @returns {string} Normalized route path
     */
    normalizeRoutePath(basePath, endpoint) {
        let routePath = path.join('/api', basePath, endpoint);
        return routePath.split(path.sep).join('/');
    }

    /**
     * Create error-wrapped handler
     * @param {Function} handler - Original handler function
     * @param {string} routePath - Route path for error logging
     * @returns {Function} Wrapped handler
     */
    createWrappedHandler(handler, routePath) {
        return async (req, res, next) => {
            try {
                await handler(req, res, next);
            } catch (error) {
                logger.error(`Error in route handler ${routePath}`, error);
                res.status(500).json({ error: 'Internal server error' });
            }
        };
    }

    /**
     * Register API route
     * @param {string} method - HTTP method
     * @param {string} routePath - Route path
     * @param {Function} handler - Route handler
     */
    registerRoute(method, routePath, handler) {
        const wrappedHandler = this.createWrappedHandler(handler, routePath);
        this.app[method](routePath, wrappedHandler);

        const routeGroup = routePath.split('/')[2];
        if (!this.importedPaths[routeGroup]) {
            this.importedPaths[routeGroup] = 0;
        }
        this.importedPaths[routeGroup] += 1;
    }

    /**
     * Process API file
     * @param {string} fullPath - Full path to the API file
     * @param {string} filename - Filename
     * @param {string} basePath - Base path for the route
     */
    async processApiFile(fullPath, filename, basePath) {
        try {
            const parsed = this.parseFilename(filename);
            if (!parsed) return;

            const { method, endpoint } = parsed;
            const routePath = this.normalizeRoutePath(basePath, endpoint);

            // Import the route handler using dynamic import
            const importPath = `file://${fullPath}`;
            const module = await import(importPath);
            const handler = module.default;

            if (typeof handler === 'function') {
                this.registerRoute(method, routePath, handler);
            } else {
                logger.warn(`No default export found in ${filename}`);
            }
        } catch (error) {
            logger.error(`Error registering route from ${filename}`, error);
        }
    }

    /**
     * Load API routes from directory
     * @param {string} directory - Directory to load from
     * @param {string} basePath - Base path for routes
     */
    async start(directory = 'api', basePath = '') {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const dirPath = path.join(__dirname, '..', '..', directory);

        try {
            // Check if directory exists
            if (!this.directoryExists(dirPath)) {
                logger.warn(`API directory not found: ${dirPath}`);
                return;
            }

            const entries = await readdir(dirPath, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);

                // Handle directories recursively
                if (entry.isDirectory()) {
                    try {
                        const newBasePath = path.join(basePath, entry.name);
                        await this.start(
                            path.join(directory, entry.name),
                            newBasePath
                        );
                    } catch (error) {
                        logger.error(
                            `Error loading routes from directory ${entry.name}`,
                            error
                        );
                        continue;
                    }
                    continue;
                }

                // Handle API files
                if (entry.isFile() && entry.name.endsWith('.js')) {
                    await this.processApiFile(fullPath, entry.name, basePath);
                }
            }
        } catch (error) {
            logger.error(`Error loading API routes from ${directory}`, error);
        }
    }
}
