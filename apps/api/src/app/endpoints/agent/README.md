# Agent Module

AI-powered portfolio assistant built as a NestJS module inside the Ghostfolio fork. Sonnet 4.6 with 6 tools, SSE streaming, structured observability, 2-tier eval suite, and CI-gated golden tests.

**Live**: https://ghostfolio-4eid.onrender.com/agent

---

## Try It Now (30 seconds)

A demo user with a seeded portfolio is auto-created on every deploy.

1. Go to https://ghostfolio-4eid.onrender.com/agent
2. Ask "What do I own?"

The demo portfolio has AAPL (20 shares), MSFT (10), VOO (20), GOOGL (8), and 0.5 BTC with buys, sells, and dividends spanning Jan 2024 – Jan 2025.

### New User Flow (bring your own data)

1. Go to https://ghostfolio-4eid.onrender.com and click **Get Started**
2. Save the Security Token shown -- this is your only login credential
3. Navigate to **Portfolio → Activities → Import** (upload icon)
4. Upload one of the sample CSVs from `seed-data/`:
   - `stocks-portfolio.csv` -- US equities (VOO, AAPL, MSFT, GOOGL, AMZN, NVDA, META)
   - `crypto-portfolio.csv` -- crypto (BTC, ETH, SOL, LINK, UNI)
   - `hybrid-portfolio.csv` -- mixed stocks + crypto
5. Go to `/agent` and chat

---

## Prerequisites

- Node.js 22+
- Docker (for local Postgres + Redis)
- npm

## Architecture

- **Model**: Sonnet 4.6 via Vercel AI SDK v6 (`ai@6.0.97`, `@ai-sdk/anthropic@3.0.46`)
- **Schemas**: Zod v4 (`zod@4.3.6`) -- required by AI SDK v6 `inputSchema`
- **Max steps**: 6 per chat (multi-tool chaining via `stopWhen: stepCountIs(6)`)
- **Auth**: Ghostfolio JWT + `readAiPrompt` permission guard
- **Stream**: SSE UI message stream (`text-delta`, `tool-input-start` events)

## Tools

| Tool                    | Description                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `symbol_search`         | Disambiguate crypto vs stock symbols, find correct CoinGecko slugs or Yahoo tickers. Use before `market_data` for any non-obvious crypto.                 |
| `portfolio_analysis`    | Holdings, allocations, total value, account breakdown                                                                                                     |
| `portfolio_performance` | Returns, net performance, chart data over a date range                                                                                                    |
| `holdings_lookup`       | Deep dive on a single position (dividends, fees, sectors, countries)                                                                                      |
| `market_data`           | Live quotes for 1-10 symbols. Default provider: FMP (Financial Modeling Prep). Also supports CoinGecko, Yahoo, etc. via `dataProviderService.getQuotes()` |
| `transaction_history`   | Buy/sell/dividend/fee activity log, filterable + sortable                                                                                                 |

All tools wrapped in try/catch -- errors returned to LLM as `{ error: ... }` so it can recover gracefully.

## Observability

| Layer                | Detail                                                                                                          |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Structured logs      | `chat_start`, `step_finish`, `verification`, `chat_complete`, `chat_error` -- JSON with requestId, userId, etc. |
| In-memory metrics    | Ring buffer (last 1000 chats) via `AgentMetricsService`, served at `GET /api/v1/agent/metrics?since=1h`         |
| Postgres persistence | `AgentChatLog` table with `verificationScore` + `verificationResult` -- survives deploys, queryable via Prisma  |
| Verification         | 3 systems run on every response: output validation, hallucination detection, confidence scoring (0-1 composite) |
| Feedback             | `AgentFeedback` table -- thumbs up/down per response, unique per requestId+userId, summary in metrics endpoint  |
| Error handling       | `onError` callback in `streamText()` records error metrics; controller wrapped in try/catch returns clean 500   |
| Security             | Error messages sanitized -- DB URLs, Redis URLs, API keys redacted before storage/exposure                      |

## Verification Systems

Three deterministic checks run in `onFinish` on every agent response:

| System                  | What it checks                                                                                | Weight |
| ----------------------- | --------------------------------------------------------------------------------------------- | ------ |
| Output Validation       | Non-empty, reasonable length, numeric data present when tools called, disclaimer on forecasts | 0.3    |
| Hallucination Detection | Ticker symbols match tool data, dollar amounts approximately match, no phantom holdings       | 0.3    |
| Confidence Score        | Composite 0-1 from tool success rate (0.3), step efficiency (0.1), validation + hallucination | --     |

Results are persisted to `AgentChatLog` and queryable via `GET /agent/verification/:requestId`.

## Feedback

Chat UI shows thumbs up/down buttons after each assistant message. Feedback is stored in `AgentFeedback` with a unique constraint per (requestId, userId).

- `POST /agent/feedback` -- submit rating (-1 or 1) + optional comment
- `GET /agent/metrics` -- includes feedback summary (total, positive, negative, satisfaction rate, recent comments)

## Eval Suite (2-tier, 52 cases)

| Tier       | Cases | Scorers                                                                      | Threshold       | Purpose                            |
| ---------- | ----- | ---------------------------------------------------------------------------- | --------------- | ---------------------------------- |
| Golden Set | 19    | `GoldenCheck` (deterministic, binary pass/fail, seed-data agnostic)          | 100% required   | CI gate -- runs every push to main |
| Scenarios  | 33    | `ToolCallAccuracy` + `HasResponse` + `ResponseQuality` + `VerificationCheck` | 80%+ acceptable | Manual regression check            |

**Golden Set breakdown**: tool routing (7), structural output (4), no-tool behavioral (2), guardrails (6).

**Scenarios breakdown**: single-tool (10), multi-tool (10), ambiguous (6), edge (7).

```bash
# Run golden set (requires ANTHROPIC_API_KEY + TEST_USER_ACCESS_TOKEN in env)
npx evalite run evals/golden/agent-golden.eval.ts

# Run scenarios
npx evalite run evals/scenarios/agent-scenarios.eval.ts
```

## CI Pipeline

`.github/workflows/golden-evals.yml` -- triggers on push to `main` (agent/eval file changes) or manual dispatch. Hits the deployed Render instance, fails if golden set drops below 100%.

**Required GitHub secrets**: `RENDER_URL`, `TEST_USER_ACCESS_TOKEN`, `ANTHROPIC_API_KEY`

## Deployment

| Resource      | Config                                                     |
| ------------- | ---------------------------------------------------------- |
| Platform      | Render (Docker) via `render.yaml` blueprint                |
| URL           | https://ghostfolio-4eid.onrender.com                       |
| Web           | Standard plan, 2GB RAM                                     |
| Redis         | Starter, volatile-lru eviction                             |
| Postgres      | Basic 1GB                                                  |
| Data provider | FMP (paid tier, `batch-quote-short` endpoint)              |
| Entrypoint    | `prisma migrate deploy` -> `prisma db seed` -> `node main` |

**Render env vars**:

| Var                               | Required | Notes                                                                                    |
| --------------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`               | Yes      | Powers the agent LLM                                                                     |
| `API_KEY_FINANCIAL_MODELING_PREP` | Yes      | Primary data provider for stocks/ETFs                                                    |
| `API_KEY_COINGECKO_DEMO`          | Yes      | Free demo key from [CoinGecko](https://www.coingecko.com/en/api/pricing) -- 30 calls/min |
| `DATA_SOURCES`                    | Yes      | `["FINANCIAL_MODELING_PREP","COINGECKO","MANUAL"]`                                       |
| `DATA_SOURCE_EXCHANGE_RATES`      | Yes      | `FINANCIAL_MODELING_PREP`                                                                |
| `DATA_SOURCE_IMPORT`              | Yes      | `FINANCIAL_MODELING_PREP`                                                                |
| `NODE_ENV`                        | Yes      | `production`                                                                             |

**Endpoints**:

- Chat UI: `/agent` (Angular page)
- Chat API: `POST /api/v1/agent/chat`
- Feedback: `POST /api/v1/agent/feedback`
- Verification: `GET /api/v1/agent/verification/:requestId`
- Metrics: `GET /api/v1/agent/metrics?since=1h` (includes feedback summary)

## Demo User

A demo user is auto-created by `prisma db seed` on every deploy (and locally via `npx prisma db seed`).

- **Security token**: `demo-token-2026`
- **Role**: ADMIN
- **Account**: "Main Brokerage" (USD, $5,000 balance)

### Seeded portfolio

| Symbol  | Type | Qty | Data Source |
| ------- | ---- | --- | ----------- |
| AAPL    | BUY  | 20  | YAHOO       |
| MSFT    | BUY  | 10  | YAHOO       |
| VOO     | BUY  | 20  | YAHOO       |
| GOOGL   | BUY  | 8   | YAHOO       |
| bitcoin | BUY  | 0.5 | COINGECKO   |
| MSFT    | SELL | 3   | YAHOO       |
| VOO     | DIV  | --  | YAHOO       |

### Access token vs auth token

- **Security token** (`demo-token-2026`): permanent passphrase identifying the user. Enter in the chat UI or Ghostfolio sign-in dialog.
- **Auth token** (JWT): short-lived bearer token for API calls. Obtained by exchanging the security token:

```bash
curl http://localhost:3333/api/v1/auth/anonymous/demo-token-2026
# -> { "authToken": "eyJ..." }
```

### Sample CSVs for custom portfolios

Located in `seed-data/` at the repo root:

| File                   | Focus       | Holdings                                 |
| ---------------------- | ----------- | ---------------------------------------- |
| `stocks-portfolio.csv` | US equities | VOO, AAPL, MSFT, GOOGL, AMZN, NVDA, META |
| `crypto-portfolio.csv` | Crypto      | BTC, ETH, SOL, LINK, UNI                 |
| `hybrid-portfolio.csv` | Mixed       | Stocks + crypto                          |

Import via Ghostfolio UI: Portfolio → Activities → Import (upload icon).

## Key Files

| Path                                                         | Purpose                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `apps/api/src/app/endpoints/agent/`                          | Agent module (controller, service, metrics)                      |
| `apps/api/src/app/endpoints/agent/tools/`                    | Tool definitions (6 tools)                                       |
| `apps/api/src/app/endpoints/agent/verification/`             | Output validation, hallucination check, confidence               |
| `apps/api/src/app/endpoints/agent/agent-feedback.service.ts` | Feedback collection + summary                                    |
| `apps/api/src/app/endpoints/agent/agent-metrics.service.ts`  | In-memory metrics + Postgres logging                             |
| `apps/api/src/app/endpoints/agent/submit-feedback.dto.ts`    | Feedback DTO with class-validator decorators                     |
| `apps/client/src/app/pages/agent/`                           | Angular chat UI with rich rendering                              |
| `apps/client/src/app/pages/agent/rendering/`                 | Marked extensions (allocation, chart, sparkline, metrics, pills) |
| `evals/golden/`                                              | Golden eval set (19 cases)                                       |
| `evals/scenarios/`                                           | Scenario eval set (33 cases)                                     |
| `evals/scorers/`                                             | Scorers (GoldenCheck, ResponseQuality, Verification)             |
| `evals/helpers.ts`                                           | Eval utilities (SSE parser with tool results)                    |
| `seed-data/`                                                 | Sample CSVs for demo portfolios                                  |
| `prisma/seed.mts`                                            | Demo user + portfolio seed                                       |
| `prisma/schema.prisma`                                       | AgentChatLog, AgentFeedback models                               |
| `.github/workflows/golden-evals.yml`                         | CI workflow                                                      |

## Quickstart

### Local Dev

```bash
# 1. Copy env and fill in values
cp .env.example .env

# 2. Start infra
docker compose -f docker/docker-compose.dev.yml up -d

# 3. Install deps + run migrations + seed demo user
npm install
npx prisma migrate deploy
npx prisma db seed

# 4. Start server
npx nx serve api

# 5. Chat UI (sign in first, then navigate to Agent)
open http://localhost:4200/agent

# 6. Check metrics
curl http://localhost:3333/api/v1/auth/anonymous/demo-token-2026
# Use the returned JWT:
curl -H "Authorization: Bearer <jwt>" http://localhost:3333/api/v1/agent/metrics?since=1h
```

### Evals

```bash
# Golden set (requires ANTHROPIC_API_KEY + TEST_USER_ACCESS_TOKEN in env)
TEST_USER_ACCESS_TOKEN=demo-token-2026 \
  npx evalite run evals/golden/agent-golden.eval.ts

# Scenarios
TEST_USER_ACCESS_TOKEN=demo-token-2026 \
  npx evalite run evals/scenarios/agent-scenarios.eval.ts

# Against Render
API_BASE=https://ghostfolio-4eid.onrender.com \
  TEST_USER_ACCESS_TOKEN=demo-token-2026 \
  npx evalite run evals/golden/agent-golden.eval.ts
```

> **Note**: Without `API_BASE`, evals default to `http://localhost:3333`.

---

## Validation Report

Metrics snapshot (production, 1h window):

- 43 chats tracked
- Avg latency: 6.5s, avg 1.7 steps, avg 2.5K tokens
- Tool usage: portfolio_analysis(9), market_data(9), transaction_history(7), portfolio_performance(5), holdings_lookup(3)
- Per-chat detail: requestId, userId, latency, steps, tools, tokens

### MVP Checklist

| #   | Requirement                             | Status | Evidence                                                                                                             |
| --- | --------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Agent responds to natural language      | PASS   | All 6 tools return coherent natural language responses                                                               |
| 2   | 3+ functional tools                     | PASS   | 6 tools: symbol_search, portfolio_analysis, portfolio_performance, holdings_lookup, market_data, transaction_history |
| 3   | Tool calls execute + structured results | PASS   | Tools return tables, dollar amounts, percentages                                                                     |
| 4   | Agent synthesizes tool results          | PASS   | Combines tool data into markdown tables, summaries, key takeaways                                                    |
| 5   | Conversation history across turns       | PASS   | "What is its current price?" correctly resolved to VOO from prior turn                                               |
| 6   | Basic error handling                    | PASS   | 401 on bad auth, tool errors caught, clean 500s                                                                      |
| 7   | Domain-specific verification            | PASS   | Rejects trades ("read-only"), rejects advice, rejects role-play                                                      |
| 8   | 5+ eval test cases                      | PASS   | 19 golden (100%) + 33 scenarios = 52 total                                                                           |
| 9   | Deployed + publicly accessible          | PASS   | https://ghostfolio-4eid.onrender.com, health OK                                                                      |
