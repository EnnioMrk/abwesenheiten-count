import { getGateway } from '../../helpers/paypal';
import { saveNewUser } from '../../helpers/db';

const SUBSCRIPTION_PLANS = {
    basic: 'basic', // Replace with your actual Braintree plan ID for basic plan
    standard: 'standard', // Replace with your actual Braintree plan ID for standard plan
    premium: 'premium', // Replace with your actual Braintree plan ID for premium plan
};

export default async function createSubscriptionOrder(req, res) {
    const gateway = getGateway();
    const { planId, paymentMethodNonce, userData } = req.body;

    if (!planId || !paymentMethodNonce) {
        return res.status(400).json({
            success: false,
            error: 'Missing required parameters: planId and paymentMethodNonce are required',
        });
    }

    // Validate plan ID
    if (!SUBSCRIPTION_PLANS[planId]) {
        return res.status(400).json({
            success: false,
            error: 'Invalid plan selected',
        });
    }

    try {
        console.log(
            `Creating subscription for ${userData.email} with plan ${planId}`
        );

        // First create a customer to associate with the subscription
        const customerResult = await gateway.customer.create({
            firstName: userData?.firstName || '',
            lastName: userData?.lastName || '',
            email: userData.email,
        });

        if (!customerResult.success) {
            console.error('Failed to create customer:', customerResult.message);
            return res.status(500).json({
                success: false,
                error: `Failed to create customer: ${customerResult.message}`,
            });
        }

        const customerId = customerResult.customer.id;

        // Create a payment method using the nonce
        const paymentMethodResult = await gateway.paymentMethod.create({
            customerId: customerId,
            paymentMethodNonce: paymentMethodNonce,
            options: {
                failOnDuplicatePaymentMethod: false,
                makeDefault: true,
            },
        });

        if (!paymentMethodResult.success) {
            console.error(
                'Failed to create payment method:',
                paymentMethodResult.message
            );
            return res.status(500).json({
                success: false,
                error: 'Failed to create payment method',
            });
        }

        const paymentMethodToken = paymentMethodResult.paymentMethod.token;

        // Create the subscription using the payment method token
        const subscriptionResult = await gateway.subscription.create({
            paymentMethodToken: paymentMethodToken,
            planId: SUBSCRIPTION_PLANS[planId], // Use the mapped plan ID
            options: {
                startImmediately: true,
            },
        });

        if (!subscriptionResult.success) {
            console.error(
                'Failed to create subscription:',
                subscriptionResult.message
            );
            return res.status(500).json({
                success: false,
                error: 'Failed to create subscription',
            });
        }

        // If we have user data, create a new user in our system
        if (userData) {
            try {
                const newUser = await saveNewUser({
                    email: userData.email,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    password: userData.password,
                    plan: userData.plan,
                    customerId: customerId,
                    subscriptionId: subscriptionResult.subscription.id,
                });

                // Successfully created the user and subscription
                return res.status(200).json({
                    success: true,
                    subscription: subscriptionResult.subscription,
                    user: {
                        email: newUser.email,
                        plan: newUser.plan,
                    },
                });
            } catch (userError) {
                console.error('Error saving user:', userError);

                // Cancel the subscription since user creation failed
                try {
                    await gateway.subscription.cancel(
                        subscriptionResult.subscription.id
                    );
                } catch (cancelError) {
                    console.error('Error canceling subscription:', cancelError);
                }

                return res.status(500).json({
                    success: false,
                    error: 'Failed to register user',
                });
            }
        } else {
            // If no user data, just return the subscription
            return res.status(200).json({
                success: true,
                subscription: subscriptionResult.subscription,
            });
        }
    } catch (err) {
        console.error('Subscription creation error:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'An error occurred during payment processing',
        });
    }
}
