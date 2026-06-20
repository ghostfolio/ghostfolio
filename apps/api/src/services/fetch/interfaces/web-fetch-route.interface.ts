/**
 * Routes outgoing GET requests for a given domain through the OpenRouter
 * `web_fetch` tool instead of a direct network request.
 *
 * Configured via the `WEB_FETCH_ROUTES` property as a JSON array, e.g.
 *
 * [
 *   {
 *     "domain": "example.com",
 *     "responseContentType": "application/json"
 *   }
 * ]
 *
 * Matches the domain itself and its subdomains (e.g. `api.example.com`).
 */
export interface WebFetchRoute {
  domain: string;
  responseContentType?: string;
}
