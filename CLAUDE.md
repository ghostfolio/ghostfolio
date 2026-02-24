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

## MVP Requirements (24-hour hard gate)

ALL of these must be working:
1. Agent responds to natural language queries about finance/portfolio
2. At least 3 functional tools the agent can invoke (we're building 8)
3. Tool calls execute successfully and return structured results
4. Agent synthesizes tool results into coherent responses
5. Conversation history maintained across turns
6. Basic error handling (graceful failure, not crashes)
7. At least one domain-specific verification check (portfolio data accuracy)
8. Simple evaluation: 5+ test cases with expected outcomes
9. Deployed and publicly accessible

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