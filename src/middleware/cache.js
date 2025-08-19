/**
 * Cache middleware for Untis API requests
 * @module middleware/cache
 */

import cacheService from '../services/cache.js';
import logger from '../services/logger.js';

/**
 * Cache middleware for Untis API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
export const untisCache = (req, res, next) => {
    logger.debug(`Processing Untis API request: ${req.path}`);

    const email = req.session?.user?.email;
    const noCache = req.query.noCache === 'true';

    if (!email) {
        return next();
    }

    // Generate cache key based on endpoint and user email
    const cacheKey = cacheService.generateKey(email, req.path, req.query);

    // If noCache is requested, delete existing cache entry
    if (noCache) {
        cacheService.delete(cacheKey);
        return next();
    }

    // Check if we have cached data
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
        return res.json(cachedData);
    }

    // Store original res.json to intercept response
    const originalJson = res.json;
    res.json = function (data) {
        // Cache the response data
        cacheService.set(cacheKey, data);
        // Call original json method
        return originalJson.call(this, data);
    };

    next();
};

export default { untisCache };
