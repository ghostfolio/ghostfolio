export const environment = {
  lastPublish: '{BUILD_TIMESTAMP}',
  production: true,
  stripePublicKey: '{STRIPE_PUBLIC_KEY}',
  version: `v${require('../../../../package.json').version}`
};
