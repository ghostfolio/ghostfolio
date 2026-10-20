# MCP server

Ghostfolio exposes a [Model Context Protocol](https://modelcontextprotocol.io/) endpoint
so an AI client such as Claude can read your portfolio, transactions and investment
plan to support decisions, and record transactions you confirm.

```text
POST https://<your-host>/api/v1/mcp
```

Everything is read-only except one tool, `create_activity`, which records a single
transaction. There is no edit, delete or import.

## Before you connect

1. Redeploy to a version that contains the endpoint.
2. Set `ROOT_URL` to the public URL of the instance, for example
   `https://ghostfolio.example.com`. The OAuth flow derives its addresses from it. If it
   is not set they are derived from `X-Forwarded-Proto` and `X-Forwarded-Host`, which
   only works when the reverse proxy forwards them.
3. Make sure the reverse proxy passes `/api/`, `/oauth/` and `/.well-known/` to the
   application. The last two are not under `/api/`.

## Connect

### Claude Code

```shell
claude mcp add --transport http ghostfolio https://<your-host>/api/v1/mcp \
  --header "Authorization: Bearer <credential>"
```

`<credential>` is one of:

| Credential         | Where to get it                                              |
| ------------------ | ------------------------------------------------------------ |
| Security Token     | The token you sign in to Ghostfolio with                     |
| API key            | _Account → Membership_ (Premium only)                        |
| JWT                | The token the web client uses, valid for 180 days            |

### claude.ai and Claude desktop (custom connector)

Add a custom connector with the URL `https://<your-host>/api/v1/mcp`, click _Connect_,
and sign in on the consent page with your **Security Token**. Accounts without a
Security Token (Google or OpenID Connect only) cannot use this path; use an API key or
a JWT with Claude Code instead.

After the instance is upgraded, reconnect the connector so the client reloads the tool
list.

## Tools

| Tool                        | What it returns                                              |
| --------------------------- | ------------------------------------------------------------ |
| `get_user`                  | Base currency, language, settings                            |
| `lookup_symbol`             | The data source and symbol Ghostfolio uses for a ticker      |
| `list_accounts`             | Accounts with balance and value                              |
| `get_portfolio_details`     | Allocation, accounts and summary                             |
| `list_holdings`             | Current positions                                            |
| `get_holding`               | One position in depth                                        |
| `get_portfolio_performance` | Performance over a range                                     |
| `get_portfolio_investments` | Money invested per period                                    |
| `get_portfolio_dividends`   | Dividends over time                                          |
| `get_portfolio_report`      | X-Ray rules                                                  |
| `list_activities`           | Transactions, paginated                                      |
| `get_investment_plan`       | Targets, allocation groups, DCA schedules, price alerts      |
| `get_investment_signals`    | Recent DCA signals                                           |
| `get_rebalancing`           | Drift per allocation group and the buy/sell actions          |
| `get_watchlist`             | Watchlist with market prices                                 |
| `create_activity` (write)   | Records one transaction                                      |

### Recording transactions

`create_activity` is meant for bookkeeping from a screenshot or a statement: the client
reads the trades, shows you the full list, and writes them after you confirm. Its
description tells the client to confirm with you first and to check `list_activities`
for duplicates. The call is not idempotent, so a repeated call records the transaction
twice. A wrong entry can only be corrected in the Ghostfolio UI.

A date without a time (`2026-10-20`) is recorded at noon UTC, so the web client shows
the same day in every time zone from UTC-12 to UTC+11. Midnight UTC would show as the
day before west of UTC. With a time, the client should send the offset, for example
`2026-10-20T11:13:58-04:00`.

### What is never returned

Webhook URLs are reduced to their host (`discord.com/***`) and credential fields are
replaced with `[redacted]`. The web client is not affected.

## Verify

1. Open the metadata and check that the addresses are your public URL, not
   `http://0.0.0.0:3333`:

   ```shell
   curl -s https://<your-host>/.well-known/oauth-protected-resource
   ```

2. Check that client registration returns JSON, not a web page:

   ```shell
   curl -s -X POST https://<your-host>/oauth/register \
     -H 'content-type: application/json' \
     -d '{"redirect_uris":["https://claude.ai/api/mcp/auth_callback"]}'
   ```

3. Connect a client and call `get_user`, then `lookup_symbol`. Try `create_activity`
   once with a small test transaction, confirm it with `list_activities`, and delete it
   in the Ghostfolio UI.

## Security notes

- Tokens issued by the OAuth flow last one hour (access) and 30 days (refresh) and are
  not valid as regular API tokens. A single refresh token cannot be revoked; changing
  `JWT_SECRET_KEY` revokes all of them.
- Failed sign-ins on the consent page are limited to 10 per IP per 10 minutes.
- Anything a tool returns becomes part of the model's context.
