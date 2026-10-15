# MCP server

[Model Context Protocol](https://modelcontextprotocol.io/) endpoint that lets an
AI client (Claude Code, ...) pull portfolio data to support investment
decisions, and record transactions from a screenshot.

- **Endpoint:** `POST /api/v1/mcp` (Streamable HTTP, stateless, JSON responses;
  `GET`/`DELETE` answer `405`)
- **Design:** modelled on ToucanShelf's MCP service. The package owns no data
  logic. Each tool maps 1:1 onto an existing REST endpoint and a tool call is
  replayed against the API of the same process over `127.0.0.1`, so guards,
  permissions, subscription checks and response interceptors all apply as for
  the web client.
- **Read-only for the most part, with one write exception:** every tool only
  reads, except `create_activity`. The reason is bookkeeping from screenshots:
  an agent reads a broker trade confirmation and records the trades. The
  boundary is deliberate: `create_activity` only creates one transaction
  (`POST /api/v1/activities`, which places no order). There is no edit, no
  delete and no import, so a wrong entry can be added but never silently
  changed or removed, and the user fixes it in the UI. The write is allowlisted
  where the request is sent (`MCP_ALLOWED_WRITES` in `mcp-api-client.ts`), not
  just by tool definition, and it goes through the normal API guards, so the
  user needs the `createActivity` permission.
- **Rules baked into the tool description:** show the user the full list of
  entries and get explicit confirmation before writing, and check
  `list_activities` for duplicates first. The call is not idempotent.

## Authentication

`Authorization: Bearer <credential>`, where the credential is one of

1. an access token from the OAuth flow below,
2. a Ghostfolio JWT (what the web client uses, valid 180 days),
3. an API key (Premium, generated in _Account → Membership_),
4. the **Security Token** you log in with.

An API key or Security Token is exchanged for a 10 minute JWT that is only used
for the internal calls of that request. A missing or invalid credential gets
`401` with a `WWW-Authenticate` header pointing at the OAuth metadata.

## OAuth (claude.ai connectors)

Clients that can only connect through OAuth discover and run the flow on their
own (`oauth/`): protected-resource and authorization-server metadata under
`/.well-known/`, dynamic client registration at `/oauth/register`, a consent
page at `/oauth/authorize`, and `/oauth/token` for `authorization_code` (PKCE
S256 required) and `refresh_token`.

- **Public URL:** issuer, redirect base and token audience come from `ROOT_URL`
  if set. Otherwise they are derived from `X-Forwarded-Proto`/`X-Forwarded-Host`
  (or the request's own host). Set `ROOT_URL` explicitly when the reverse proxy
  does not forward those headers: its built-in default is the listen address
  (`http://0.0.0.0:3333`), which no client can reach.
- **Consent:** the page asks for the Security Token you sign in with. There is no
  server-side browser session in Ghostfolio to reuse (the web app keeps its JWT
  client-side), so this is the sign-in. Accounts without a Security Token (for
  example Google/OIDC only) cannot use this path; use an API key or JWT.
- **Stateless tokens:** access tokens last 1 hour, refresh tokens 30 days. Both
  are signed with a key derived from `JWT_SECRET_KEY`, so they are not valid as
  API JWTs and vice versa. Registered clients are signed `client_id`s, no table.
  The consequence is that a single refresh token cannot be revoked: rotating
  `JWT_SECRET_KEY` revokes everything, deleting the user ends their tokens.
- **In-memory state:** authorization codes (5 minutes, single use) and the
  failed-consent counter (10 attempts per IP per 10 minutes) live in memory, so
  a restart only costs an in-flight sign-in.

## Connect Claude Code

```bash
claude mcp add --transport http ghostfolio https://<your-host>/api/v1/mcp \
  --header "Authorization: Bearer <credential>"
```

In claude.ai add a custom connector with the URL `https://<your-host>/api/v1/mcp`
and sign in on the consent page.

Then ask Claude to use the `ghostfolio` MCP, e.g. "use ghostfolio to review my
holdings against my investment plan".

## Tools

| Tool                        | Endpoint                                     |
| --------------------------- | -------------------------------------------- |
| `get_user`                  | `GET /user`                                  |
| `lookup_symbol`             | `GET /symbol/lookup`                         |
| `list_accounts`             | `GET /account`                               |
| `get_portfolio_details`     | `GET /portfolio/details`                     |
| `list_holdings`             | `GET /portfolio/holdings`                    |
| `get_holding`               | `GET /portfolio/holding/:dataSource/:symbol` |
| `get_portfolio_performance` | `GET /v2/portfolio/performance`              |
| `get_portfolio_investments` | `GET /portfolio/investments`                 |
| `get_portfolio_dividends`   | `GET /portfolio/dividends`                   |
| `get_portfolio_report`      | `GET /portfolio/report`                      |
| `list_activities`           | `GET /activities`                            |
| `get_investment_plan`       | `GET /investment-plan`                       |
| `get_investment_signals`    | `GET /investment-plan/signals`               |
| `get_rebalancing`           | `GET /investment-plan/rebalancing`           |
| `get_watchlist`             | `GET /watchlist`                             |
| `create_activity` (write)   | `POST /activities`                           |

## Adding a tool

Add an entry to `MCP_TOOLS` in `mcp-tools.ts` and keep its description short:
the tool list is resident context for the connected model. Tools are `GET`
only. A tool that writes also needs its `METHOD /path` added to
`MCP_ALLOWED_WRITES` in `mcp-api-client.ts`, an explicit decision that should
come with a test and an update of this README and the consent text in
`oauth/oauth-pages.ts`. Responses above 200,000 characters are refused with a
hint to narrow the filters instead of being truncated.

## Tests

```bash
cd apps/api && npx jest -c jest.config.ts src/app/mcp
```
