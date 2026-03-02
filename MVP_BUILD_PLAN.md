# MVP Build Plan — Ghostfolio AI Agent

## Priority: Get one tool working end-to-end FIRST, then expand.

---

## Step 1: Project Setup & Dev Environment (30 min)

1. Fork `ghostfolio/ghostfolio` on GitHub
2. Clone your fork locally
3. `cp .env.dev .env` and configure:
   - `DATABASE_URL` (PostgreSQL)
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
   - `ACCESS_TOKEN_SALT`, `JWT_SECRET_KEY` (generate with `openssl rand -hex 32`)
   - `ANTHROPIC_API_KEY` (your Anthropic API key — used by the agent for LLM calls)
4. `docker compose -f docker/docker-compose.dev.yml up -d`
5. `npm install`
6. `npm run database:setup`
7. `npm run start:server` — verify backend starts on port 3333
8. Create a user via the UI or API, note the security token
9. Verify existing AI endpoint works: `GET /api/v1/ai/prompt/portfolio`

**Gate check:** Backend running, can authenticate, existing AI endpoint responds.

---

## Step 2: Agent Service — First Tool End-to-End (1-2 hrs)

Build the minimal agent with ONE tool (`get_portfolio_holdings`) to prove the full loop works.

### 2a. Create tool definitions file

**File:** `apps/api/src/app/endpoints/ai/tools/portfolio-holdings.tool.ts`

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const getPortfolioHoldingsTool = (deps: {
  portfolioService;
  userId;
  impersonationId?;
}) =>
  tool({
    description:
      "Get the user's current portfolio holdings with allocation percentages, asset classes, and currencies",
    parameters: z.object({
      accountFilter: z.string().optional().describe('Filter by account name'),
      assetClassFilter: z
        .string()
        .optional()
        .describe('Filter by asset class (EQUITY, FIXED_INCOME, etc.)')
    }),
    execute: async (params) => {
      const { holdings } = await deps.portfolioService.getDetails({
        userId: deps.userId,
        impersonationId: deps.impersonationId,
        filters: [] // Build filters from params if provided
      });
      // Return structured, LLM-friendly data
      return Object.values(holdings).map((h) => ({
        name: h.name,
        symbol: h.symbol,
        currency: h.currency,
        assetClass: h.assetClass,
        allocationPercent: (h.allocationInPercentage * 100).toFixed(2) + '%',
        value: h.value
      }));
    }
  });
```

### 2b. Extend AiService with agent method

**File:** `apps/api/src/app/endpoints/ai/ai.service.ts` (extend existing)

Add a new method `chat()` that uses `generateText()` with tools and a system prompt.

### 2c. Add POST endpoint to AiController

**File:** `apps/api/src/app/endpoints/ai/ai.controller.ts` (extend existing)

Add `POST /ai/agent` that accepts `{ message: string, conversationHistory?: Message[] }` and returns the agent's response.

### 2d. Test it

```bash
curl -X POST http://localhost:3333/api/v1/ai/agent \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"message": "What are my portfolio holdings?"}'
```

**Gate check:** Agent receives query, calls `get_portfolio_holdings` tool, returns natural language answer with real data.

---

## Step 3: Add Remaining Tools (2-3 hrs)

Add tools one at a time, testing each before moving to the next:

### Tool 2: `get_portfolio_performance`

- Wraps `PortfolioService.getPerformance()`
- Parameters: `dateRange` (enum: 'ytd', '1y', '5y', 'max')
- Returns: total return, net performance percentage, chart data points

### Tool 3: `get_account_summary`

- Wraps `PortfolioService.getAccounts()`
- No parameters needed
- Returns: account names, platforms, balances, currencies

### Tool 4: `get_dividend_summary`

- Wraps `PortfolioService.getDividends()`
- Parameters: `dateRange`, `groupBy` (month/year)
- Returns: dividend income breakdown

### Tool 5: `get_transaction_history`

- Wraps `OrderService` / Prisma query on Order table
- Parameters: `symbol?`, `type?` (BUY/SELL/DIVIDEND), `startDate?`, `endDate?`
- Returns: list of activities with dates, quantities, prices

### Tool 6: `lookup_market_data`

- Wraps `DataProviderService`
- Parameters: `symbol`, `dataSource?`
- Returns: current quote, asset profile info

### Tool 7: `get_exchange_rate`

- Wraps `ExchangeRateDataService`
- Parameters: `fromCurrency`, `toCurrency`, `date?`
- Returns: exchange rate value

### Tool 8: `get_portfolio_report`

- Wraps `PortfolioService.getReport()`
- No parameters
- Returns: X-ray analysis (diversification, concentration, fee rules)

**Gate check:** All 9 tools callable. Test multi-tool queries like "What's my best performing holding and when did I buy it?"

---

## Step 4: Conversation History (30 min)

- Accept `conversationHistory` (array of `{role, content}` messages) in the POST body
- Pass the full message history to `generateText()` as `messages`
- Return the updated history in the response so the frontend (or API caller) can maintain it
- For MVP, this is stateless on the server — the client sends history each request

**Gate check:** Multi-turn conversation works. Ask "What do I own?" then "Which of those is the largest position?"

---

## Step 5: Verification Layer (1 hr)

Implement at least ONE domain-specific verification check (MVP requires 1, we'll add more for Early):

### Portfolio Data Accuracy Check

After the LLM generates its response, check that any numbers mentioned in the text are traceable to tool results. Implementation:

- Collect all numerical values from tool results
- Scan the LLM's response for numbers
- Flag if the response contains specific numbers that don't appear in any tool result
- If flagged, append a disclaimer or regenerate

For MVP, a simpler approach works too:

- Always prepend the system prompt with instructions to only cite data from tool results
- Add a post-processing step that appends a standard financial disclaimer to any response containing numerical data

**Gate check:** Agent doesn't hallucinate numbers. Disclaimer appears on analytical responses.

---

## Step 6: Error Handling (30 min)

- Wrap all tool executions in try/catch
- Return friendly error messages, not stack traces
- Handle: tool execution failures, LLM API errors, auth failures, missing data
- If a tool fails, the agent should acknowledge it and provide what it can from other tools
- If the LLM provider is down, return a clear "AI service temporarily unavailable" message

**Gate check:** Intentionally break things (bad symbol, missing API key) — agent responds gracefully.

---

## Step 7: Basic Evaluation (1 hr)

Create 5+ test cases (MVP minimum) as a runnable script:

```
Test 1: "What are my holdings?" → expects get_portfolio_holdings tool called, response contains holding names
Test 2: "How is my portfolio performing this year?" → expects get_portfolio_performance with YTD
Test 3: "Show me my accounts" → expects get_account_summary tool called
Test 4: "What's the price of AAPL?" → expects lookup_market_data tool called
Test 5: "Sell all my stocks" → expects refusal (agent is read-only)
Test 6: "What dividends did I earn?" → expects get_dividend_summary tool called
Test 7: "Tell me about a holding I don't own" → expects no hallucination
```

Each test checks:

- Correct tool(s) selected
- Response is coherent and non-empty
- No crashes or unhandled errors

Save as `apps/api/src/app/endpoints/ai/eval/eval.ts` — runnable with `npx ts-node` or `tsx`.

**Gate check:** All test cases pass. Results saved to a file.

---

## Step 8: Deploy (1 hr)

Options (pick the fastest):

- **Railway:** Connect GitHub repo, set env vars, deploy
- **Docker on a VPS:** `docker compose -f docker/docker-compose.yml up -d`
- **Vercel + separate DB:** More complex but free tier available

Needs:

- PostgreSQL database (Railway/Supabase/Neon for free tier)
- Redis instance (Upstash for free tier)
- `ANTHROPIC_API_KEY` environment variable set
- The deployed URL must be publicly accessible

**Gate check:** Visit deployed URL, create account, use agent, get real responses.

---

## Time Budget (24 hours)

| Task                    | Estimated | Running Total |
| ----------------------- | --------- | ------------- |
| Setup & dev environment | 0.5 hr    | 0.5 hr        |
| First tool end-to-end   | 1.5 hr    | 2 hr          |
| Remaining 7 tools       | 2.5 hr    | 4.5 hr        |
| Conversation history    | 0.5 hr    | 5 hr          |
| Verification layer      | 1 hr      | 6 hr          |
| Error handling          | 0.5 hr    | 6.5 hr        |
| Eval test cases         | 1 hr      | 7.5 hr        |
| Deploy                  | 1 hr      | 8.5 hr        |
| Buffer / debugging      | 2.5 hr    | 11 hr         |

~11 hours of work, well within the 24-hour deadline with ample buffer for sleep and unexpected issues.
