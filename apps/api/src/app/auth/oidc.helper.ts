export function getOidcDiscoveryUrl(issuer: string) {
  // Remove trailing slashes
  return `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`;
}
