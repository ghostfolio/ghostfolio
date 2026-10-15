# MCP server

Read-only [Model Context Protocol](https://modelcontextprotocol.io/) endpoint
that lets an AI client (Claude Code, ...) pull portfolio data to support
investment decisions.

- **Endpoint:** `POST /api/v1/mcp` (Streamable HTTP, stateless, JSON responses;
  `GET`/`DELETE` answer `405`)
- **Design:** modelled on ToucanShelf's MCP service. The package owns no data
  logic. Each tool maps 1:1 onto an existing REST endpoint and a tool call is
  replayed against the API of the same process over `127.0.0.1`, so guards,
  permissions, subscription checks and response interceptors all apply as for
  the web client.
- **Read-only on purpose:** no tool places, edits or deletes anything.

## Authentication

`Authorization: Bearer <credential>`, where the credential is one of

1. a Ghostfolio JWT (what the web client uses, valid 180 days),
2. an API key (Premium, generated in _Account → Membership_),
3. the **Security Token** you log in with.

An API key or Security Token is exchanged for a 10 minute JWT that is only used
for the internal calls of that request. A missing or invalid credential gets
`401`.

## Connect Claude Code

```bash
claude mcp add --transport http ghostfolio https://<your-host>/api/v1/mcp \
  --header "Authorization: Bearer <credential>"
```

Then ask Claude to use the `ghostfolio` MCP, e.g. "use ghostfolio to review my
holdings against my investment plan".

## Tools

| Tool                        | Endpoint                                     |
| --------------------------- | -------------------------------------------- |
| `get_user`                  | `GET /user`                                  |
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

## Adding a tool

Add an entry to `MCP_TOOLS` in `mcp-tools.ts` (GET endpoints only) and keep its
description short: the tool list is resident context for the connected model.
Responses above 200,000 characters are refused with a hint to narrow the
filters instead of being truncated.

## Tests

```bash
cd apps/api && npx jest -c jest.config.ts src/app/mcp
```
