export function getOidcDiscoveryUrl(issuer: string) {
  return `${issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`;
}
