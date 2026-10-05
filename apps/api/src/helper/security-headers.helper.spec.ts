import helmet from 'helmet';
import { IncomingMessage, ServerResponse } from 'node:http';

import { getHelmetOptions } from './security-headers.helper';

/**
 * Gives the headers which the helmet middleware sets on a response with the
 * options of the helper, and the function which it calls as next middleware.
 */
function getHeaders({
  isSubscriptionEnabled
}: {
  isSubscriptionEnabled: boolean;
}) {
  const headers = new Map<string, string>();
  const next = jest.fn();

  const response = {
    removeHeader: (name: string) => {
      headers.delete(name.toLowerCase());
    },
    setHeader: (name: string, value: string) => {
      headers.set(name.toLowerCase(), value);
    }
  };

  helmet(getHelmetOptions({ isSubscriptionEnabled }))(
    {} as IncomingMessage,
    response as unknown as ServerResponse,
    next
  );

  return { headers, next };
}

describe('getHelmetOptions', () => {
  describe('without the subscription', () => {
    let headers: Map<string, string>;
    let next: jest.Mock;

    beforeAll(() => {
      ({ headers, next } = getHeaders({ isSubscriptionEnabled: false }));
    });

    it('should call the next middleware without an error', () => {
      expect(next).toHaveBeenCalledWith();
    });

    it('should set the Content-Security-Policy header', () => {
      expect(headers.get('content-security-policy')).toContain(
        "default-src 'self'"
      );
    });

    it('should not upgrade insecure requests', () => {
      expect(headers.get('content-security-policy')).not.toContain(
        'upgrade-insecure-requests'
      );
    });

    it('should not set the Strict-Transport-Security header', () => {
      expect(headers.has('strict-transport-security')).toBe(false);
    });

    it('should not set the Cross-Origin-Opener-Policy header', () => {
      expect(headers.has('cross-origin-opener-policy')).toBe(false);
    });

    it('should not allow resources of Stripe', () => {
      expect(headers.get('content-security-policy')).not.toContain(
        'https://js.stripe.com'
      );
    });
  });

  describe('with the subscription', () => {
    let headers: Map<string, string>;
    let next: jest.Mock;

    beforeAll(() => {
      ({ headers, next } = getHeaders({ isSubscriptionEnabled: true }));
    });

    it('should call the next middleware without an error', () => {
      expect(next).toHaveBeenCalledWith();
    });

    it('should upgrade insecure requests', () => {
      expect(headers.get('content-security-policy')).toContain(
        'upgrade-insecure-requests'
      );
    });

    it('should set the Strict-Transport-Security header', () => {
      expect(headers.has('strict-transport-security')).toBe(true);
    });

    it('should allow resources of Stripe', () => {
      expect(headers.get('content-security-policy')).toContain(
        'https://js.stripe.com'
      );
    });
  });
});
