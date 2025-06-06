import { getSession, validateSession } from "../helpers/untis";

export default class AuthManager {
  constructor(app) {
    this.app = app;
    this.noAuthRoutes = ["/login", "/register", "/"];
    this.noUntisRoutes = [...this.noAuthRoutes, "/untis-login"];
  }

  // Authentication middleware
  requireAuth(req, res, next) {
    if (!req.session.user) {
      return res.redirect("/login");
    }
    next();
  }

  requireUntis(req, res, next) {
    if (!req.session.user?.untisUsername) {
      if (!req.session.user) {
        return res.redirect("/login");
      }
      return res.redirect("/untis-login");
    }
    next();
  }

  start() {
    // Apply authentication middleware to all routes except unprotected ones
    this.app.use((req, res, next) => {
      const path = req.path;
      //allow access to api routes without authentication
      if (path.startsWith("/api")) {
        return next();
      }

      // Allow access to static assets without authentication
      if (
        path.includes(".js") ||
        path.includes(".css") ||
        path.includes(".png") ||
        path.includes(".jpg") ||
        path.includes(".ico") ||
        path.includes(".svg")
      ) {
        return next();
      }

      //redirect to dashboard if user is logged in
      if (
        req.session.user?.untisUsername &&
        ["/untis-login", "/login", "/register"].some((route) =>
          path.includes(route)
        )
      ) {
        return res.redirect("/dashboard");
      }

      //allow access to unprotected routes
      if (
        this.noAuthRoutes.some(
          (route) => route == path || path.includes(route + "/")
        )
      ) {
        return next();
      }

      //allow access to routes that don't require untis login
      if (
        this.noUntisRoutes.some(
          (route) => route == path || path.includes(route + "/")
        )
      ) {
        return this.requireAuth(req, res, next);
      } else {
        return this.requireUntis(req, res, next);
      }
    });

    this.app.use(async (req, res, next) => {
      if (req.path.includes("/api/untis")) {
        if (!req.session.user.email) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        let session = getSession(req.session.user.email);
        if (!(await validateSession(session, req.session.user.email))) {
          console.log("❌ Invalid session");
          return res.status(401).json({ error: "Unauthorized" });
        }
      }
      next();
    });
  }
}
