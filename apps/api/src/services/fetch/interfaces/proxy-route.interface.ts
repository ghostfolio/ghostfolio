/**
 * Overrides the origin (protocol, host and port) of outgoing requests for a
 * given domain. This lets a self-hosted instance transparently route a
 * provider's traffic through a local proxy (e.g. one that solves a bot
 * challenge) without changing any call sites — the request path and query are
 * preserved.
 *
 * Configured via the `PROXY_ROUTES` property as a JSON array, e.g.
 *
 * [
 *   {
 *     "domain": "example.com",
 *     "url": "http://example-proxy:8191"
 *   }
 * ]
 *
 * Matches the domain itself and its subdomains (e.g. `api.example.com`).
 */
export interface ProxyRoute {
  domain: string;
  url: string;
}
