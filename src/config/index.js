/**
 * Application configuration module
 * @module config
 */

export const config = {
    // Server configuration
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost',
        killPortBlockers: process.env.KILL_PORT_BLOCKERS === 'true',
        restartOnError: process.env.RESTART_ON_ERROR === 'true',
    },

    // Session configuration
    session: {
        secret: process.env.SESSION_SECRET || 'your-secret-key',
        resave: true,
        saveUninitialized: true,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            maxAge: 48 * 60 * 60 * 1000, // 48 hours
        },
    },

    // Cache configuration
    cache: {
        max: 500, // Maximum number of items
        ttl: 1000 * 60 * 30, // 30 minutes TTL
        allowStale: false,
        updateAgeOnGet: false,
        updateAgeOnHas: false,
    },

    // Database configuration
    database: {
        createTablesIfMissing: true,
    },

    // Authentication routes
    auth: {
        noAuthRoutes: ['/login', '/register', '/'],
        noUntisRoutes: ['/login', '/register', '/', '/untis-login'],
        staticFileExtensions: [
            '.js',
            '.css',
            '.png',
            '.jpg',
            '.ico',
            '.svg',
            '.json',
        ],
    },

    // Environment
    env: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',
};

export default config;
