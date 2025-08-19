import { BraintreeGateway, Environment } from 'braintree';

const gateway = new BraintreeGateway({
    environment: Environment.Sandbox,
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});

export function getGateway() {
    return gateway;
}
