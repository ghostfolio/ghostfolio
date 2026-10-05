import { HelmetOptions } from 'helmet';

export function getHelmetOptions({
  isSubscriptionEnabled
}: {
  isSubscriptionEnabled: boolean;
}): HelmetOptions {
  if (isSubscriptionEnabled) {
    return {
      contentSecurityPolicy: {
        directives: {
          connectSrc: ["'self'", 'https://js.stripe.com'], // Allow connections to Stripe
          frameSrc: ["'self'", 'https://js.stripe.com'], // Allow loading frames from Stripe
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://js.stripe.com'], // Allow inline scripts and scripts from Stripe
          scriptSrcAttr: ["'self'", "'unsafe-inline'"], // Allow inline event handlers
          styleSrc: ["'self'", "'unsafe-inline'"] // Allow inline styles
        }
      },
      crossOriginOpenerPolicy: false // Disable Cross-Origin-Opener-Policy header (for Internet Identity)
    };
  }

  // The self-hosted setup can run via HTTP, hence the headers which need HTTPS
  // are disabled (see https://github.com/ghostfolio/ghostfolio/issues/2102)
  return {
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts
        scriptSrcAttr: ["'self'", "'unsafe-inline'"], // Allow inline event handlers
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
        upgradeInsecureRequests: null // Disable upgrade-insecure-requests directive (the browser changes each request to HTTPS, which gives a blank page via HTTP)
      }
    },
    crossOriginOpenerPolicy: false, // Disable Cross-Origin-Opener-Policy header (the browser ignores it via HTTP)
    strictTransportSecurity: false // Disable Strict-Transport-Security header (the reverse proxy sets it, if HTTPS is required)
  };
}
