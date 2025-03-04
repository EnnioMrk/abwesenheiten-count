import express from "express";
import session from "express-session";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { login, getAbsences, getLessons } from "./scraper.js";
import { Server } from "socket.io";
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

// Store loading states and browser windows for each session
const loadingStates = new Map();
const browserWindows = new Map();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your-secret-key",
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: false, // Set to true if using HTTPS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Socket.IO connection handling
io.on("connection", (socket) => {
  // Get session ID from handshake
  const sessionId = socket.handshake.query.sessionId;
  console.log(`New Socket.IO connection with sessionId ${sessionId}`);

  // If there's a loading state for this session, send it
  if (sessionId && loadingStates.has(sessionId)) {
    const state = loadingStates.get(sessionId);
    socket.emit("progress", state);
  }
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.isLoggingIn && !req.session.absenceData) {
    return res.redirect("/");
  }
  next();
};

// Routes
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.get(["/loading.html", "/loading"], requireAuth, (req, res) => {
  // Add session ID to the response for the client to use
  const html = res.sendFile(join(__dirname, "public", "loading.html"));
});

app.get(["/dashboard.html", "/dashboard"], requireAuth, (req, res) => {
  res.sendFile(join(__dirname, "public", "dashboard.html"));
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    req.session.isLoggingIn = true;

    loadingStates.set(req.sessionID, {
      message: "Starting login process...",
      progress: 0,
    });

    res.redirect("/loading.html");

    const broadcast = (message, progress) => {
      const state = { message, progress };
      loadingStates.set(req.sessionID, state);
      io.emit("progress", state);
    };

    const { page, browser } = await login(username, password, broadcast);
    browserWindows.set(req.sessionID, browser);

    const { absenceData, userData, token } = await getAbsences(page, broadcast);

    const { total, cancelled } = await getLessons(
      page,
      token,
      userData.user.person.id
    );

    req.session.absenceData = absenceData.data;
    req.session.lessonData = { total, cancelled };
    req.session.isLoggingIn = false;

    console.log(req.session.lessonData);

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        throw err;
      }
      broadcast("Complete!", 100);
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
    io.emit("error", {
      message: "Login failed. Please try again.",
      error: true,
    });
  }
});

app.get("/api/data/absences", (req, res) => {
  if (!req.session.absenceData) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json(req.session.absenceData);
});

app.get("/api/data/lessons", (req, res) => {
  if (!req.session.lessonData) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json(req.session.lessonData);
});

app.post("/logout", async (req, res) => {
  try {
    if (browserWindows.has(req.sessionID)) {
      const browser = browserWindows.get(req.sessionID);
      await browser.close();
      browserWindows.delete(req.sessionID);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        return res.status(500).json({ error: "Failed to logout" });
      }

      loadingStates.delete(req.sessionID);
      res.json({ success: true });
    });
  } catch (error) {
    console.error("Error during logout:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});

app.use(
  express.static("public", {
    extensions: ["html"],
  })
);

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
