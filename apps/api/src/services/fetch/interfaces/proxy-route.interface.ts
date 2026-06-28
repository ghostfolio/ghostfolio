/**
 * Overrides the origin (protocol, host and port) of outgoing requests for a
 * given domain.
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
