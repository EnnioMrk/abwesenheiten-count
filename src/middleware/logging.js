/**
 * Request logging middleware
 * @module middleware/logging
 */

import logger from '../services/logger.js';

/**
 * Request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const requestLogger = (req, res, next) => {
    logger.request(req);
    next();
};

export default { requestLogger };
