/**
 * PayPal Controller - handles payment and subscription operations
 * @module controllers/PayPalController
 */

import { getGateway } from '../utils/paypal.js';
import { saveNewUser } from '../utils/db.js';
import logger from '../services/logger.js';

export default class PayPalController {
    /**
     * Get PayPal client token for frontend
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async getClientToken(req, res) {
        try {
            logger.info('Getting PayPal client token');

            const gateway = await getGateway();
            const response = await gateway.clientToken.generate({});

            if (response.success) {
                res.json({ clientToken: response.clientToken });
            } else {
                logger.error('Failed to generate PayPal client token');
                res.status(500).json({
                    error: 'Failed to generate client token',
                });
            }
        } catch (error) {
            logger.error('Error getting PayPal client token', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Create PayPal subscription
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createSubscription(req, res) {
        try {
            const { paymentMethodNonce, planId, customerData } = req.body;

            logger.info(`Creating PayPal subscription for plan: ${planId}`);

            const gateway = await getGateway();

            // Create customer
            const customerResult = await gateway.customer.create({
                firstName: customerData.firstName,
                lastName: customerData.lastName,
                email: customerData.email,
                paymentMethodNonce: paymentMethodNonce,
            });

            if (!customerResult.success) {
                logger.error('Failed to create PayPal customer');
                return res
                    .status(400)
                    .json({ error: 'Failed to create customer' });
            }

            // Create subscription
            const subscriptionResult = await gateway.subscription.create({
                paymentMethodToken:
                    customerResult.customer.paymentMethods[0].token,
                planId: planId,
            });

            if (subscriptionResult.success) {
                // Save user to database
                await saveNewUser(
                    customerData.firstName,
                    customerData.lastName,
                    customerData.email,
                    customerData.password,
                    planId
                );

                logger.success(
                    `Subscription created successfully for: ${customerData.email}`
                );
                res.json({
                    success: true,
                    subscriptionId: subscriptionResult.subscription.id,
                    customerId: customerResult.customer.id,
                });
            } else {
                logger.error('Failed to create PayPal subscription');
                res.status(400).json({
                    error: 'Failed to create subscription',
                });
            }
        } catch (error) {
            logger.error('Error creating PayPal subscription', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Create PayPal subscription order
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async createSubscriptionOrder(req, res) {
        try {
            const { planId, customerData } = req.body;

            logger.info(
                `Creating PayPal subscription order for plan: ${planId}`
            );

            const gateway = await getGateway();

            // Create subscription order
            const orderResult = await gateway.subscription.create({
                planId: planId,
                // Add additional order configuration as needed
            });

            if (orderResult.success) {
                // Save user to database
                await saveNewUser(
                    customerData.firstName,
                    customerData.lastName,
                    customerData.email,
                    customerData.password,
                    planId
                );

                logger.success(
                    `Subscription order created successfully for: ${customerData.email}`
                );
                res.json({
                    success: true,
                    orderId: orderResult.subscription.id,
                });
            } else {
                logger.error('Failed to create PayPal subscription order');
                res.status(400).json({
                    error: 'Failed to create subscription order',
                });
            }
        } catch (error) {
            logger.error('Error creating PayPal subscription order', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Handle PayPal webhook notifications
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    async handleWebhook(req, res) {
        try {
            const webhookData = req.body;

            logger.info(`Received PayPal webhook: ${webhookData.event_type}`);

            // Handle different webhook events
            switch (webhookData.event_type) {
                case 'BILLING.SUBSCRIPTION.ACTIVATED':
                    // Handle subscription activation
                    break;
                case 'BILLING.SUBSCRIPTION.CANCELLED':
                    // Handle subscription cancellation
                    break;
                case 'BILLING.SUBSCRIPTION.SUSPENDED':
                    // Handle subscription suspension
                    break;
                default:
                    logger.info(
                        `Unhandled webhook event: ${webhookData.event_type}`
                    );
            }

            res.status(200).json({ success: true });
        } catch (error) {
            logger.error('Error handling PayPal webhook', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
