/**
 * Cache service for managing application caching
 * @module services/cache
 */

import { LRUCache } from 'lru-cache';
import config from '../config/index.js';
import logger from './logger.js';

class CacheService {
    constructor() {
        this.cache = new LRUCache(config.cache);
    }

    /**
     * Generate cache key based on user email, path, and query params
     * @param {string} email - User email
     * @param {string} path - Request path
     * @param {Object} query - Query parameters
     * @returns {string} Cache key
     */
    generateKey(email, path, query = {}) {
        return `${email}:${path}:${JSON.stringify(query)}`;
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {*} Cached data or undefined
     */
    get(key) {
        const data = this.cache.get(key);
        if (data) {
            logger.cache('hit', key);
        } else {
            logger.cache('miss', key);
        }
        return data;
    }

    /**
     * Set cached data
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     */
    set(key, data) {
        this.cache.set(key, data);
        logger.cache('set', key);
    }

    /**
     * Delete cached data
     * @param {string} key - Cache key
     */
    delete(key) {
        this.cache.delete(key);
        logger.cache('clear', key);
    }

    /**
     * Clear all cached data
     */
    clear() {
        this.cache.clear();
        logger.info('🗑️ All cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            max: this.cache.max,
            ttl: this.cache.ttl,
        };
    }
}

// Create singleton instance
const cacheService = new CacheService();

export default cacheService;
