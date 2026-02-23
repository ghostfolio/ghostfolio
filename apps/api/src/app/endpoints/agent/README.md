# AgentForge — Ghostfolio AI Portfolio Agent

Chat endpoint and web UI for the Ghostfolio agent: natural-language portfolio Q&A with tool use, verification, and eval framework.

## Quick Start

```bash
# 1. Start Postgres + Redis
cd docker && docker compose -f docker-compose.dev.yml up -d && cd ..

# 2. Copy env and fill in passwords
cp .env.dev .env
#    Edit .env: set REDIS_PASSWORD, POSTGRES_PASSWORD, ACCESS_TOKEN_SALT, JWT_SECRET_KEY

# 3. Install, migrate, seed, and run
npm install
npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma
npx prisma db seed --schema=./apps/api/prisma/schema.prisma
npx nx serve api
```

The API starts on `http://localhost:3333`.

## Agent Chat UI

Open **`http://localhost:3333/api/v1/agent/chat`** (GET) in a browser. Enter your Ghostfolio security token to authenticate, then chat with the agent.

## API Endpoint

- **POST** `/api/v1/agent/chat`
- **Auth:** JWT required (`Authorization: Bearer <token>`). Permission: `readAiPrompt`.
- **Body:** `{ "messages": [{ "role": "user" | "assistant" | "system", "content": string }] }`
- **Response:** `{ "message": { "role": "assistant", "content": string }, "verification"?: { "passed": boolean, "type": string }, "error"?: string }`

## Tools (5)

| Tool | Description |
|------|-------------|
| `portfolio_analysis` | Holdings, allocation %, asset classes |
| `portfolio_performance` | Performance over date range (1d, 1y, ytd, max, mtd, wtd) |
| `transaction_list` | Recent activities with optional limit |
| `portfolio_report` | X-Ray risk report — diversification, fees, emergency fund rules |
| `market_quote` | Current price for a symbol (e.g. AAPL, datasource YAHOO/COINGECKO) |

## Verification

- **Output validation:** Non-empty response check.
- **Source attribution:** When the response contains financial content (%, $, allocation, performance), a suffix is auto-appended: " (Source: your Ghostfolio data.)"

## OpenRouter Configuration

The agent uses OpenRouter for LLM access. **Easiest:** run the setup script from repo root:

```bash
export DATABASE_URL="postgresql://..."
node scripts/agent-setup.mjs --openrouter-key=sk-or-YOUR_KEY
```

This writes `API_KEY_OPENROUTER` and `OPENROUTER_MODEL` (default: `openai/gpt-4o-mini`) to the DB. Alternatively, set them in Ghostfolio Admin → Settings.

## Eval

- **Test cases:** See `eval-cases.ts` (10 cases: 6 happy path, 2 edge, 1 adversarial, 1 multi-step).
- **Unit tests:** `agent.service.spec.ts` (verification logic + not-configured path).
- **Run:** `npx nx test api --testFile=agent.service.spec.ts`

## Architecture

```
POST /api/v1/agent/chat
  └─ AgentController (auth, validation)
      └─ AgentService.chat()
          ├─ OpenRouter LLM (via Vercel AI SDK)
          ├─ Tool Registry (5 tools)
          │   ├─ portfolio_analysis  → PortfolioService.getDetails()
          │   ├─ portfolio_performance → PortfolioService.getPerformance()
          │   ├─ portfolio_report    → PortfolioService.getReport()
          │   ├─ transaction_list   → OrderService.getOrders()
          │   └─ market_quote       → DataProviderService.getQuotes()
          └─ verifyAgentOutput() → source attribution + output validation
```
