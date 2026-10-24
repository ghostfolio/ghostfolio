import { SubscriptionType } from '@ghostfolio/common/enums';
import { scopes } from '@ghostfolio/common/scopes';

import {
  getMcpUserOfBearerToken,
  hasLimitsOfBasicSubscriptionOfBearerToken
} from './bearer-token.helper';

describe('getMcpUserOfBearerToken', () => {
  it('should give the scopes of an active access', () => {
    expect(
      getMcpUserOfBearerToken({
        impersonationOfBearerToken: {
          isActive: true,
          scopes: [scopes.portfolioRead]
        }
      })
    ).toEqual({ scopes: [scopes.portfolioRead] });
  });

  it('should give no user for an inactive access', () => {
    expect(
      getMcpUserOfBearerToken({
        impersonationOfBearerToken: {
          isActive: false,
          scopes: [scopes.portfolioRead]
        }
      })
    ).toBeUndefined();
  });

  it('should give no user without an access', () => {
    expect(getMcpUserOfBearerToken({})).toBeUndefined();
  });
});

describe('hasLimitsOfBasicSubscriptionOfBearerToken', () => {
  it('should apply to an active access with the Basic subscription which reads the values', () => {
    expect(
      hasLimitsOfBasicSubscriptionOfBearerToken({
        impersonationOfBearerToken: {
          isActive: true,
          scopes: [scopes.portfolioRead, scopes.portfolioReadValues],
          userSubscription: { type: SubscriptionType.Basic }
        }
      })
    ).toBe(true);
  });

  it('should not apply to an access with the Basic subscription which does not read the values', () => {
    expect(
      hasLimitsOfBasicSubscriptionOfBearerToken({
        impersonationOfBearerToken: {
          isActive: true,
          scopes: [scopes.portfolioRead],
          userSubscription: { type: SubscriptionType.Basic }
        }
      })
    ).toBe(false);
  });

  it('should not apply to an access with the Premium subscription', () => {
    expect(
      hasLimitsOfBasicSubscriptionOfBearerToken({
        impersonationOfBearerToken: {
          isActive: true,
          scopes: [scopes.portfolioRead, scopes.portfolioReadValues],
          userSubscription: { type: SubscriptionType.Premium }
        }
      })
    ).toBe(false);
  });

  it('should not apply to an access without a subscription', () => {
    expect(
      hasLimitsOfBasicSubscriptionOfBearerToken({
        impersonationOfBearerToken: {
          isActive: true,
          scopes: [scopes.portfolioRead, scopes.portfolioReadValues]
        }
      })
    ).toBe(false);
  });

  it('should not apply to an inactive access', () => {
    expect(
      hasLimitsOfBasicSubscriptionOfBearerToken({
        impersonationOfBearerToken: {
          isActive: false,
          scopes: [scopes.portfolioRead, scopes.portfolioReadValues],
          userSubscription: { type: SubscriptionType.Basic }
        }
      })
    ).toBe(false);
  });

  it('should not apply without an access', () => {
    expect(hasLimitsOfBasicSubscriptionOfBearerToken({})).toBe(false);
  });
});
