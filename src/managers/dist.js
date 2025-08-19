import { join } from 'path';
import { existsSync } from 'fs';
import logger from '../services/logger.js';

export default class DistManager {
    constructor(app) {
        this.app = app;
        this.libraries = {
            chartist: 'node_modules/chartist/dist',
        };
    }

    /**
     * Add a library to be served
     * @param {string} libraryName - The name of the library (used in URL)
     * @param {string} libraryPath - The path to the library files
     */
    addLibrary(libraryName, libraryPath) {
        if (!existsSync(libraryPath)) {
            logger.error(`Library path does not exist: ${libraryPath}`);
            return;
        }
        this.libraries[libraryName] = libraryPath;
        console.log(`✅ Added library: ${libraryName} from ${libraryPath}`);
    }

    /**
     * Start serving library files
     */
    start() {
        // Serve each library at /dist/libraryName
        Object.entries(this.libraries).forEach(([libraryName, libraryPath]) => {
            this.app.use(`/dist/${libraryName}`, (req, res, next) => {
                // Prevent directory traversal attacks
                const requestedPath = req.path.replace(/\.\./g, '');
                const fullPath = join(
                    process.cwd(),
                    libraryPath,
                    requestedPath
                );

                logger.debug(`Serving ${libraryName} file: ${fullPath}`);

                // Serve the file
                res.sendFile(fullPath, (err) => {
                    if (err) {
                        logger.error(`Error serving ${libraryName} file`, err);
                        if (!res.headersSent) {
                            res.status(404).send('File not found');
                        }
                    }
                });
            });
        });

        logger.success('Distribution manager started');
    }
}
