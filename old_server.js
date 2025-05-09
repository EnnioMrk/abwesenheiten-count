import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { login, getAbsences, getLessons } from './scraper.js';
import { Server } from 'socket.io';
import http from 'http';
import fs from 'fs/promises';
import pgSessionSimple from 'connect-pg-simple';
import { getDb } from './helpers/db.js';

// Store registered users
let registeredUsers = new Set();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = getDb();
await db.connect();

const USERS_FILE = join(__dirname, 'users.json');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

// Store loading states and browser windows for each session
const loadingStates = new Map();
const browserWindows = new Map();

let pgSession = pgSessionSimple(session);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: 'your-secret-key',
        resave: true,
        store: new pgSession({
            pool: db,
            tableName: 'session',
        }),
        saveUninitialized: true,
        cookie: {
            secure: false, // Set to true if using HTTPS
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Socket.IO connection handling
io.on('connection', (socket) => {
    // Get session ID from handshake
    const sessionId = socket.handshake.query.sessionId;
    console.log(`New Socket.IO connection with sessionId ${sessionId}`);

    // If there's a loading state for this session, send it
    if (sessionId && loadingStates.has(sessionId)) {
        const state = loadingStates.get(sessionId);
        socket.emit('progress', state);
    }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.isLoggingIn && !req.session.absenceData) {
        return res.redirect('/login');
    }
    next();
};

// Define unprotected routes
const unprotectedRoutes = [
    '/login',
    '/api/login',
    '/api/register',
    '/register',
    '/login-qr',
];

// Apply authentication middleware to all routes except unprotected ones
app.use((req, res, next) => {
    // Check if the current path is in the unprotected routes list
    const path = req.path;
    // Allow access to static assets without authentication
    if (
        path.includes('.js') ||
        path.includes('.css') ||
        path.includes('.png') ||
        path.includes('.jpg') ||
        path.includes('.ico') ||
        path.includes('.svg') ||
        unprotectedRoutes.some(
            (route) => route == path || path.includes(route + '/')
        )
    ) {
        return next();
    }

    // Apply authentication for all other routes
    requireAuth(req, res, next);
});

// Load registered users
async function loadUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        const users = JSON.parse(data);
        registeredUsers = new Set(users);
    } catch (error) {
        // If file doesn't exist, create it
        await fs.writeFile(USERS_FILE, '[]');
    }
}

// Save registered users
async function saveUsers() {
    await fs.writeFile(USERS_FILE, JSON.stringify(Array.from(registeredUsers)));
}

// Initialize users
loadUsers();

// Routes
app.post('/api/register', async (req, res) => {
    const { username, orderId } = req.body;

    if (!username || !orderId) {
        return res.json({
            success: false,
            error: 'Missing username or payment information',
        });
    }

    if (registeredUsers.has(username)) {
        return res.json({ success: false, error: 'Username already exists' });
    }

    // In a production environment, verify the PayPal payment here
    // For this example, we'll just accept any orderId

    try {
        registeredUsers.add(username);
        await saveUsers();
        res.json({ success: true });
    } catch (error) {
        console.error('Error registering user:', error);
        res.json({ success: false, error: 'Registration failed' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        req.session.isLoggingIn = true;

        loadingStates.set(req.sessionID, {
            message: 'Starting login process...',
            progress: 0,
        });

        res.redirect('/loading');

        const broadcast = (message, progress) => {
            const state = { message, progress };
            loadingStates.set(req.sessionID, state);
            io.emit('progress', state);
        };

        const { page, browser } = await login(username, password, broadcast);
        browserWindows.set(req.sessionID, browser);

        const { absenceData, userData, token } = await getAbsences(
            page,
            broadcast
        );

        const { total, cancelled, totalByDay, cancelledByDay } =
            await getLessons(page, token, userData.user.person.id);

        req.session.absenceData = absenceData.data;
        req.session.lessonData = {
            total,
            cancelled,
            totalByDay,
            cancelledByDay,
        };
        req.session.isLoggingIn = false;

        console.log(req.session.lessonData);

        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                throw err;
            }
            broadcast('Complete!', 100);
        });

        setTimeout(() => {
            loadingStates.delete(req.sessionID);
        }, 2000);
    } catch (error) {
        console.error(error);
        req.session.isLoggingIn = false;
        loadingStates.delete(req.sessionID);
        if (browserWindows.has(req.sessionID)) {
            const browser = browserWindows.get(req.sessionID);
            await browser.close();
            browserWindows.delete(req.sessionID);
        }
        io.emit('error', {
            message: 'Login failed. Please try again.',
            error: true,
        });
    }
});

app.get('/api/data/absences', (req, res) => {
    res.json(req.session.absenceData);
});

app.get('/api/data/lessons', (req, res) => {
    res.json(req.session.lessonData);
});

app.post('/logout', async (req, res) => {
    try {
        if (browserWindows.has(req.sessionID)) {
            const browser = browserWindows.get(req.sessionID);
            await browser.close();
            browserWindows.delete(req.sessionID);
        }

        req.session.destroy((err) => {
            if (err) {
                console.error('Error destroying session:', err);
                return res.status(500).json({ error: 'Failed to logout' });
            }

            loadingStates.delete(req.sessionID);
            res.json({ success: true });
        });
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({ error: 'Failed to logout' });
    }
});

app.use(
    express.static('public', {
        extensions: ['html'],
        index: 'index.html',
    })
);

server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
