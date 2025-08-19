/**
 * User Controller - handles user authentication and profile operations
 * @module controllers/UserController
 */

import {
    getUntisUrl,
    verifyUserPassword,
    saveUntisUrl,
    getDb,
} from '../utils/db.js';
import { loginWithUrl } from '../utils/untis.js';
import logger from '../services/logger.js';

export default class UserController {
    /**
     * Handle user login
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            logger.info(`User login attempt: ${email}`);

            const user = await verifyUserPassword(email, password);

            if (user) {
                // Save user to session
                req.session.user = user;

                // Try to get existing Untis URL
                const untisUrl = await getUntisUrl(email);
                if (untisUrl) {
                    // Try to login with existing URL
                    const untisUsername = await loginWithUrl(email, untisUrl);
                    if (untisUsername) {
                        req.session.user.untisUsername = untisUsername;
                        logger.success(
                            `User ${email} logged in successfully with Untis`
                        );
                        return res.json({
                            success: true,
                            redirect: '/dashboard',
                        });
                    }
                }

                logger.success(`User ${email} logged in successfully`);
                res.json({ success: true, redirect: '/untis-login' });
            } else {
                logger.warn(`Failed login attempt for ${email}`);
                res.status(401).json({ error: 'Invalid credentials' });
            }
        } catch (error) {
            logger.error('Error during login', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Handle user logout
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async logout(req, res) {
        try {
            const email = req.session?.user?.email;
            if (email) {
                logger.info(`User logout: ${email}`);
            }

            req.session.destroy((err) => {
                if (err) {
                    logger.error('Error destroying session', err);
                    return res.status(500).json({ error: 'Failed to logout' });
                }
                res.json({ success: true, redirect: '/login' });
            });
        } catch (error) {
            logger.error('Error during logout', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Save Untis QR code data
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async saveQrCode(req, res) {
        try {
            const { qrCodeData, url } = req.body;
            const qrData = qrCodeData || url; // Handle both formats
            const email = req.session.user.email;

            logger.info(`Saving QR code for user: ${email}`);

            await saveUntisUrl(email, qrData);
            const untisUsername = await loginWithUrl(email, qrData);

            if (untisUsername) {
                req.session.user.untisUsername = untisUsername;
                logger.success(
                    `QR code saved and Untis login successful for ${email}`
                );
                res.json({ success: true });
            } else {
                logger.error(`Failed to login with QR code for ${email}`);
                res.status(400).json({ error: 'Invalid QR code' });
            }
        } catch (error) {
            logger.error('Error saving QR code', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get user information
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getUserInfo(req, res) {
        try {
            const email = req.session.user.email;
            const db = getDb();

            logger.info(`Getting user info for: ${email}`);

            const query = `
                SELECT email, first_name, last_name, plan, subscription_status
                FROM users 
                WHERE email = $1
            `;
            const result = await db.query(query, [email]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }

            const user = result.rows[0];
            res.json({
                success: true,
                user: {
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    plan: user.plan,
                    subscriptionStatus: user.subscription_status,
                },
            });
        } catch (error) {
            logger.error('Error getting user info', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get user information',
            });
        }
    }
}
