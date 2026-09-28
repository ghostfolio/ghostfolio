import { scopes } from '@ghostfolio/common/scopes';

import { getMcpUserOfBearerToken } from './bearer-token.helper';

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
