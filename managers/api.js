import { fileURLToPath } from "url";
import { readdir } from "fs/promises";
import path from "path";
import fs from "fs";

export default class ApiManager {
  constructor(app) {
    this.app = app;
    this.importedPaths = {};
  }

  async start(directory = "api", basePath = "") {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dirPath = path.join(__dirname, "..", directory);

    try {
      // Check if directory exists
      if (!fs.existsSync(dirPath)) {
        console.warn(`✴️ API directory not found: ${dirPath}`);
        return;
      }

      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        // Handle directories recursively
        if (entry.isDirectory()) {
          try {
            // Use the directory name as part of the route path
            const newBasePath = path.join(basePath, entry.name);
            await this.start(path.join(directory, entry.name), newBasePath);
          } catch (error) {
            console.error(
              `❌ Error loading routes from directory ${entry.name}:`,
              error
            );
            continue;
          }
          continue;
        }

        // Handle API files
        if (entry.isFile() && entry.name.endsWith(".js")) {
          try {
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
              console.warn(`✴️ Invalid HTTP method in filename: ${entry.name}`);
              continue;
            }

            // The rest of the filename is the endpoint
            const endpoint = filenameParts.slice(1).join("-");

            // Construct the full route path
            let routePath = path.join("/api", basePath, endpoint);

            // Normalize path separators for URL
            routePath = routePath.split(path.sep).join("/");

            // Import the route handler using dynamic import
            const importPath = `file://${fullPath}`;
            const module = await import(importPath);
            const handler = module.default;

            if (typeof handler === "function") {
              // Wrap the handler with error handling
              const wrappedHandler = async (req, res, next) => {
                try {
                  await handler(req, res, next);
                } catch (error) {
                  console.error(
                    `❌ Error in route handler ${routePath}:`,
                    error
                  );
                  res.status(500).json({ error: "Internal server error" });
                }
              };

              // Register the route
              this.app[method](routePath, wrappedHandler);
              if (!this.importedPaths[routePath.split("/")[2]]) {
                this.importedPaths[routePath.split("/")[2]] = 0;
              }
              this.importedPaths[routePath.split("/")[2]] += 1;
            } else {
              console.warn(`✴️ No default export found in ${entry.name}`);
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
      console.error(`❌ Error loading API routes from ${directory}:`, error);
    }
  }
}
