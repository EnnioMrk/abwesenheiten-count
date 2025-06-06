import express from 'express';
import session from 'express-session';
import { LRUCache } from 'lru-cache';
import http from 'http';
import pgSession from 'connect-pg-simple';
//import { Server } from "socket.io";
import { getDb } from './helpers/db.js';
import {
    loadWidgets,
    handleWidgetReq,
    getWidgetsConfig,
} from './widgets/index.js';
import { getSession, validateSession } from './helpers/untis.js';
import AuthManager from './managers/auth.js';
import ApiManager from './managers/api.js';
import DistManager from './managers/dist.js';

let port = process.env.PORT || 3000;

// Initialize LRU Cache for Untis API requests
const untisCache = new LRUCache({
    max: 500, // Maximum number of items
    ttl: 1000 * 60 * 30, // 30 minutes TTL
    allowStale: false,
    updateAgeOnGet: false,
    updateAgeOnHas: false,
});

// Make cache available globally for API endpoints
global.untisCache = untisCache;

const db = getDb();

try {
    await db.query('SELECT 1');
    console.log('✅ Database connection successful');
} catch (err) {
    console.error('❌ Failed to connect to the database:', err);
    process.exit(1);
}

const app = express();
const server = http.createServer(app);
//const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'your-secret-key',
        resave: true,
        store: new (pgSession(session))({
            pool: db,
            createTableIfMissing: true,
        }),
        saveUninitialized: true,
        cookie: {
            secure: false, // Set to true if using HTTPS
            maxAge: 48 * 60 * 60 * 1000, // 48 hours
        },
    })
);

//log all requests
app.use((req, res, next) => {
    //join the last two parts of the path
    let reqPath = req.path.split('/').slice(-2).join('/');
    if (reqPath.includes('.')) return next();
    console.log(
        `ℹ️ ${
            req.session.user
                ? `${req.session.user.first_name} ${req.session.user.last_name} `
                : `👻 `
        }${req.method} ${req.url}`
    );
    next();
});

// Untis API Cache Middleware
app.use('/api/untis', (req, res, next) => {
    //untis middleware
    console.log(`🔄 Processing Untis API request: ${req.path}`);
    const email = req.session?.user?.email;
    const noCache = req.query.noCache === 'true';

    if (!email) {
        return next();
    }

    // Generate cache key based on endpoint and user email
    const cacheKey = `${email}:${req.path}:${JSON.stringify(req.query)}`;

    // If noCache is requested, delete existing cache entry
    if (noCache) {
        untisCache.delete(cacheKey);
        console.log(`🗑️ Cache cleared for ${req.path}`);
        return next();
    }

    // Check if we have cached data
    const cachedData = untisCache.get(cacheKey);
    if (cachedData) {
        console.log(`💾 Cache hit for ${req.path}`);
        return res.json(cachedData);
    }

    // Store original res.json to intercept response
    const originalJson = res.json;
    res.json = function (data) {
        // Cache the response data
        untisCache.set(cacheKey, data);
        console.log(`📝 Cached response for ${req.path}`);
        // Call original json method
        return originalJson.call(this, data);
    };

    next();
});

const authManager = new AuthManager(app);
authManager.start();

// Initialize and start the distribution manager
const distManager = new DistManager(app);
distManager.start();

const apiManager = new ApiManager(app);
await apiManager.start();

for (const [key, value] of Object.entries(apiManager.importedPaths)) {
    console.log(`✅ Imported ${value} routes from ${key} directory`);
}

await loadWidgets();

app.get('/widgets/config', getWidgetsConfig);

app.get('/widgets/:id', handleWidgetReq);

// Server static files after loading API routes
app.use(
    express.static('public', {
        extensions: ['html'],
        index: 'index.html',
    })
);

try {
    server.on('error', async (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`🚫 Port ${port} is already in use.`);
            if (process.env.KILL_PORT_BLOCKERS) {
                console.error(
                    `🔪 Attempting to kill processes using port ${port}...`
                );
                try {
                    const { execSync } = require('child_process');
                    const pids = execSync(`lsof -t -i:${port}`)
                        .toString()
                        .trim()
                        .split('\n');
                    if (pids.length > 0) {
                        for (const pid of pids) {
                            console.log(
                                `💀 Killing process ${pid} using port ${port}...`
                            );
                            execSync(`kill -9 ${pid}`);
                            console.log(`✅ Process ${pid} killed.`);
                        }
                        console.log(`🔄 Restarting server...`);
                        require('child_process').spawn(
                            process.argv.shift(),
                            process.argv,
                            {
                                cwd: process.cwd(),
                                detached: true,
                                stdio: 'inherit',
                            }
                        );
                        process.exit(1);
                    } else {
                        console.error('❌ No process found using the port.');
                    }
                } catch (killErr) {
                    console.error(
                        '💥 Failed to kill process using the port:',
                        killErr
                    );
                    process.exit(1);
                }
            } else {
                port += 1;
                console.log(`🔄 Restarting server on new port ${port}...`);
                server.close();
                server.listen(port, () => {
                    console.log(
                        `🚀 Server running at http://localhost:${port}`
                    );
                });
            }
        } else {
            console.error('💥 Server error:', err);
            process.exit(1);
        }
    });

    server.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
    });
} catch (error) {
    console.error('❌ Error starting server:', error);
    process.exit(1);
}

// Add global error handler
app.use((err, req, res, next) => {
    console.error('💥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Add 404 handler
app.use((req, res) => {
    console.log(`🔍 404 Not Found: ${req.url}`);
    res.status(404).json({ error: 'Not found' });
});

process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    if (process.env.RESTART_ON_ERROR) {
        console.log('🔄 Restarting server due to uncaught exception...');
        require('child_process').spawn(process.argv.shift(), process.argv, {
            cwd: process.cwd(),
            detached: true,
            stdio: 'inherit',
        });
        process.exit(1);
    } else {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    if (process.env.RESTART_ON_ERROR) {
        console.log('🔄 Restarting server due to unhandled rejection...');
        require('child_process').spawn(process.argv.shift(), process.argv, {
            cwd: process.cwd(),
            detached: true,
            stdio: 'inherit',
        });
        process.exit(1);
    } else {
        process.exit(1);
    }
});
