import express from "express";
import session from "express-session";
import { Server } from "socket.io";
import http from "http";
import pgSession from "connect-pg-simple";
import { getDb } from "./helpers/db.js";
import { readdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  loadWidgets,
  handleWidgetReq,
  getWidgetsConfig,
} from "./widgets/index.js";

const port = 3000 || process.env.PORT;

const db = getDb();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: "your-secret-key",
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

// Socket.IO connection handling
io.on("connection", (socket) => {
  // Get session ID from handshake
  const sessionId = socket.handshake.query.sessionId;
  console.log(`New Socket.IO connection with sessionId ${sessionId}`);
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
};

const requireUntis = (req, res, next) => {
  if (!req.session.user?.untisUsername) {
    return res.redirect("/untis-login");
  }
  next();
};

// Define unprotected routes
const noAuthRoutes = ["/login", "/register", "/"];

const noUntisRoutes = [...noAuthRoutes, "/untis-login"];

// Apply authentication middleware to all routes except unprotected ones
app.use((req, res, next) => {
  // Check if the current path is in the unprotected routes list
  const path = req.path;
  if (path.startsWith("/api")) {
    return next();
  }
  // Allow access to static assets without authentication
  if (
    req.session.user &&
    ["/untis-login", "/login", "/register"].some((route) =>
      path.includes(route)
    )
  ) {
    return res.redirect("/dashboard");
  }
  if (
    path.includes(".js") ||
    path.includes(".css") ||
    path.includes(".png") ||
    path.includes(".jpg") ||
    path.includes(".ico") ||
    path.includes(".svg") ||
    noAuthRoutes.some((route) => route == path || path.includes(route + "/"))
  ) {
    return next();
  }

  if (
    noUntisRoutes.some((route) => route == path || path.includes(route + "/"))
  ) {
    return requireAuth(req, res, next);
  } else {
    return requireUntis(req, res, next);
  }
});

let importedPaths = {};
// Recursive API route loader
const loadApiRoutes = async (directory = "api", basePath = "") => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dirPath = path.join(__dirname, directory);

  try {
    // Check if directory exists
    if (!fs.existsSync(dirPath)) {
      console.warn(`API directory not found: ${dirPath}`);
      return;
    }

    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      // Handle directories recursively
      if (entry.isDirectory()) {
        // Use the directory name as part of the route path
        const newBasePath = path.join(basePath, entry.name);
        await loadApiRoutes(path.join(directory, entry.name), newBasePath);
        continue;
      }

      // Handle API files
      if (entry.isFile() && entry.name.endsWith(".js")) {
        // Extract method and endpoint from filename (e.g., get-users.js)
        const filenameParts = path.parse(entry.name).name.split("-");
        const method = filenameParts[0].toLowerCase();

        // Skip files with invalid method names
        const validMethods = [
          "get",
          "post",
          "put",
          "delete",
          "patch",
          "options",
          "head",
        ];
        if (!validMethods.includes(method)) {
          console.warn(`Invalid HTTP method in filename: ${entry.name}`);
          continue;
        }

        // The rest of the filename is the endpoint
        const endpoint = filenameParts.slice(1).join("-");

        // Construct the full route path
        let routePath = path.join("/api", basePath, endpoint);

        // Normalize path separators for URL
        routePath = routePath.split(path.sep).join("/");

        try {
          // Import the route handler using dynamic import
          const importPath = `file://${fullPath}`;
          const module = await import(importPath);
          const handler = module.default;

          if (typeof handler === "function") {
            // Register the route
            app[method](routePath, handler);
            if (!importedPaths[routePath.split("/")[2]]) {
              importedPaths[routePath.split("/")[2]] = 0;
            }
            importedPaths[routePath.split("/")[2]] += 1;
          } else {
            console.warn(`❌ No default export found in ${entry.name}`);
          }
        } catch (error) {
          console.error(
            `❌ Error registering route from ${entry.name}:`,
            error
          );
        }
      }
    }
  } catch (error) {
    console.error(`Error loading API routes from ${directory}:`, error);
  }
};

await loadApiRoutes();
for (const [key, value] of Object.entries(importedPaths)) {
  console.log(`✅ Imported ${value} routes from ${key} directory`);
}

await loadWidgets();

app.get("/widgets/config", getWidgetsConfig);

app.get("/widgets/:id", handleWidgetReq);

// Server static files after loading API routes
app.use(
  express.static("public", {
    extensions: ["html"],
    index: "index.html",
  })
);

server.listen(port, () => {
  console.log(`🛜 Server running at http://localhost:${port}`);
});
