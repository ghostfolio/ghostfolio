# CLAUDE.md — Ghostfolio AI Agent Project Context

## Project Overview

We are adding an AI-powered financial agent to Ghostfolio, an open-source wealth management app. The agent lets users ask natural language questions about their portfolio and get answers backed by real data.

**This is a brownfield project** — we are adding a new module to an existing NestJS + Angular + Prisma + PostgreSQL + Redis monorepo. Do NOT rewrite existing code. Wire into existing services.

## Repository Structure

- `apps/api/` — NestJS backend (our primary workspace)
- `apps/client/` — Angular frontend
- `libs/common/` — Shared types and interfaces
- `prisma/schema.prisma` — Database schema
- `docker/` — Docker compose files for dev/prod

## Existing AI Foundation

There is already a basic AI service at `apps/api/src/app/endpoints/ai/`. It uses:
- **Vercel AI SDK** (`ai` package v4.3.16) — already a dependency
- **OpenRouter** (`@openrouter/ai-sdk-provider`) — already a dependency (but we are using Anthropic directly instead)
- The existing `AiService` only generates a static prompt from portfolio holdings. We are extending this into a full agent with tool calling.

## Tech Decisions (DO NOT CHANGE)

- **Agent Framework:** Vercel AI SDK (already in repo — use `generateText()` with tools)
- **LLM Provider:** Anthropic (via `@ai-sdk/anthropic`). The pre-search planned for OpenRouter but their payment system was down. Vercel AI SDK is provider-agnostic so this is a one-line swap. The API key is set via `ANTHROPIC_API_KEY` env var.
- **Observability:** Langfuse (`@langfuse/vercel-ai`) — add as new dependency
- **Language:** TypeScript throughout
- **Auth:** Existing JWT auth guards — agent endpoints MUST use the same auth

## Key Existing Services to Wrap as Tools

| Tool | Service | Method |
|------|---------|--------|
| `get_portfolio_holdings` | `PortfolioService` | `getDetails()` |
| `get_portfolio_performance` | `PortfolioService` | `getPerformance()` |
| `get_dividend_summary` | `PortfolioService` | `getDividends()` |
| `get_transaction_history` | `OrderService` | via Prisma query |
| `lookup_market_data` | `DataProviderService` | `getQuotes()` or `getHistorical()` |
| `get_portfolio_report` | `PortfolioService` | `getReport()` |
| `get_exchange_rate` | `ExchangeRateDataService` | `toCurrency()` |
| `get_account_summary` | `PortfolioService` | `getAccounts()` |

These services are injected via NestJS DI. The agent module will import the same modules they depend on.

## MVP — COMPLETE ✅

All 9 MVP requirements passed. Deployed at https://ghostfolio-production-f9fe.up.railway.app

## Current Phase: Early Submission

See `EARLY_BUILD_PLAN.md` for the full step-by-step plan. Key remaining work:

1. **Langfuse observability** — install `@langfuse/vercel-ai`, wrap `generateText()` calls, get tracing dashboard working
2. **3+ verification checks** — currently have 1 (financial disclaimer). Add: portfolio scope validation, hallucination detection (data-backed claims), consistency check
3. **50+ eval test cases** — currently have 10. Expand with correctness checks, adversarial inputs, edge cases, multi-step reasoning. Add ground-truth validation against actual DB/API data
4. **AI Cost Analysis doc** — track actual Anthropic spend, project costs at scale
5. **Agent Architecture doc** — 1-2 page doc using pre-search content
6. **Open source contribution** — publish eval dataset publicly
7. **Updated demo video** — re-record with observability dashboard + expanded evals
8. **Social post** — LinkedIn/X post tagging @GauntletAI

## Architecture Pattern

```
User message
  → Agent Controller (new NestJS controller)
    → Agent Service (new — orchestrates the Vercel AI SDK)
      → generateText({ tools, messages, system prompt, maxSteps })
        → LLM selects tool(s) → Tool functions call existing Ghostfolio services
        → LLM synthesizes results → Verification layer checks output
    → Response returned to user
```

## Important Conventions

- Follow existing NestJS patterns: module + controller + service files
- Use existing auth guards: `@UseGuards(AuthGuard('jwt'), HasPermissionGuard)`
- Tools should be defined using Zod schemas (Vercel AI SDK standard)
- Tool functions receive the authenticated `userId` — never let users query other users' data
- All new code goes in `apps/api/src/app/endpoints/ai/` (extend existing module)
- System prompt must include financial disclaimers
- Error handling: catch and return friendly messages, never crash

## Known Issues / Gotchas

- **Ghostfolio's portfolio calculator** depends on pre-computed snapshots from background data-gathering jobs. In a freshly seeded environment, these don't exist, so `getPerformance()` returns zeroes. The `get_portfolio_performance` tool was rewritten to bypass this and compute returns directly from orders + live quotes.
- **Exchange rate tool** may return 1:1 for currency pairs if market data hasn't been gathered. Same root cause — data gathering needs to run.
- **Demo user** is auto-created by the seed script. Access via `/demo` route which auto-authenticates.
- **Production port** is 8080 (set in Dockerfile), not 3333 (dev only).

## Dev Environment

```bash
cp .env.dev .env  # Then fill in DATABASE_URL, REDIS_HOST, etc.
# Also add: ANTHROPIC_API_KEY=sk-ant-...
docker compose -f docker/docker-compose.dev.yml up -d  # Start PostgreSQL + Redis
npm install
npm run database:setup  # Prisma migrate + seed
npm run start:server    # Backend on port 3333
npm run start:client    # Frontend on port 4200
```

## Testing the Agent

```bash
# Get a bearer token first
curl -s http://localhost:3333/api/v1/auth/anonymous -X POST \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "<SECURITY_TOKEN_OF_ACCOUNT>"}'

# Then call the agent endpoint
curl -s http://localhost:3333/api/v1/ai/agent \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my top holdings?"}'
```