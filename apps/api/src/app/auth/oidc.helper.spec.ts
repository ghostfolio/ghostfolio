import { getOidcDiscoveryUrl } from './oidc.helper';

describe('getOidcDiscoveryUrl', () => {
  it.each([
    [
      'https://auth.example.com',
      'https://auth.example.com/.well-known/openid-configuration'
    ],
    [
      'https://auth.example.com/',
      'https://auth.example.com/.well-known/openid-configuration'
    ],
    [
      'https://auth.example.com/application/o/ghostfolio/',
      'https://auth.example.com/application/o/ghostfolio/.well-known/openid-configuration'
    ]
  ])('creates the discovery URL for %s', (issuer, expected) => {
    expect(getOidcDiscoveryUrl(issuer)).toBe(expected);
  });
});
