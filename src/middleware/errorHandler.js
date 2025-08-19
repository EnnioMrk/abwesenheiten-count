/**
 * Error handling middleware
 * @module middleware/errorHandler
 */

import logger from '../services/logger.js';
import config from '../config/index.js';

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const errorHandler = (err, req, res, next) => {
    logger.error('Unhandled error', err);

    // Don't expose error details in production
    const errorResponse = config.isProduction
        ? { error: 'Internal server error' }
        : {
              error: 'Internal server error',
              message: err.message,
              stack: err.stack,
          };

    res.status(500).json(errorResponse);
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const notFoundHandler = (req, res) => {
    logger.debug(`404 Not Found: ${req.url}`);
    res.status(404).json({ error: 'Not found' });
};

export default { errorHandler, notFoundHandler };
