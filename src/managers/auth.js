import { getSession, validateSession } from '../utils/untis.js';
import config from '../config/index.js';
import logger from '../services/logger.js';

export default class AuthManager {
    constructor(app) {
        this.app = app;
        this.noAuthRoutes = config.auth.noAuthRoutes;
        this.noUntisRoutes = config.auth.noUntisRoutes;
    }

    /**
     * Authentication middleware - require user login
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    requireAuth(req, res, next) {
        if (!req.session.user) {
            return res.redirect('/login');
        }
        next();
    }

    /**
     * Untis authentication middleware - require Untis credentials
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Next middleware function
     */
    requireUntis(req, res, next) {
        if (!req.session.user?.untisUsername) {
            if (!req.session.user) {
                return res.redirect('/login');
            }
            return res.redirect('/untis-login');
        }
        next();
    }

    /**
     * Check if path is a static file
     * @param {string} path - Request path
     * @returns {boolean} True if path is a static file
     */
    isStaticFile(path) {
        return config.auth.staticFileExtensions.some((ext) =>
            path.includes(ext)
        );
    }

    /**
     * Check if route requires authentication
     * @param {string} path - Request path
     * @returns {boolean} True if route requires authentication
     */
    requiresAuth(path) {
        return !this.noAuthRoutes.some(
            (route) => route === path || path.includes(route + '/')
        );
    }

    /**
     * Check if route requires Untis authentication
     * @param {string} path - Request path
     * @returns {boolean} True if route requires Untis authentication
     */
    requiresUntis(path) {
        return !this.noUntisRoutes.some(
            (route) => route === path || path.includes(route + '/')
        );
    }

    /**
     * Start authentication middleware
     */
    start() {
        // Apply authentication middleware to all routes except unprotected ones
        this.app.use((req, res, next) => {
            const path = req.path;

            // Allow access to API routes without authentication
            if (path.startsWith('/api')) {
                return next();
            }

            // Allow access to static assets without authentication
            if (this.isStaticFile(path)) {
                return next();
            }

            // Redirect to dashboard if user is logged in and accessing auth pages
            if (
                req.session.user?.untisUsername &&
                ['/untis-login', '/login', '/register'].some((route) =>
                    path.includes(route)
                )
            ) {
                return res.redirect('/dashboard');
            }

            // Check authentication requirements
            if (!this.requiresAuth(path)) {
                return next();
            }

            if (!this.requiresUntis(path)) {
                return this.requireAuth(req, res, next);
            } else {
                return this.requireUntis(req, res, next);
            }
        });

        // Validate Untis session for API requests
        this.app.use(async (req, res, next) => {
            if (req.path.includes('/api/untis')) {
                if (!req.session.user?.email) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }

                const session = getSession(req.session.user.email);
                if (!(await validateSession(session, req.session.user.email))) {
                    logger.error('Invalid Untis session');
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }
            next();
        });
    }
}
