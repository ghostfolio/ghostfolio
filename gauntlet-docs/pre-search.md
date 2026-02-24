# AgentForge Pre-Search Document

**Project:** Ghostfolio AI Financial Agent
**Author:** Alan
**Date:** February 23, 2026
**Domain:** Finance (Ghostfolio — Open Source Wealth Management)
**Repository:** github.com/ghostfolio/ghostfolio

## Key Decisions Summary

| Decision | Choice | Rationale |
|---|---|---|
| Domain | Finance (Ghostfolio) | Personal interest, rich codebase, clear agent use cases |
| Agent Framework | Vercel AI SDK | Already in repo, native tool calling, TypeScript-native |
| LLM Provider | OpenRouter | Already configured in Ghostfolio, model flexibility, user choice |
| Observability | Langfuse | Open source, Vercel AI SDK integration, comprehensive |
| Architecture | Single agent + tool registry | Simpler, debuggable, sufficient for use cases |
| Frontend | Angular chat component | Integrates naturally into existing Angular app |
| Verification | 4 checks | Data accuracy, scope validation, disclaimers, consistency |
| Open Source | PR to Ghostfolio + eval dataset | Maximum community impact |

---

## Phase 1: Define Your Constraints

### 1. Domain Selection

**Domain:** Finance — Personal Wealth Management

**Repository:** Ghostfolio — an open-source wealth management application built with NestJS + Angular + Prisma + PostgreSQL + Redis, organized as an Nx monorepo in TypeScript.

**Specific Use Cases:**
- **Portfolio Q&A:** Users ask natural language questions about holdings, allocation, and performance
- **Dividend Analysis:** Income tracking by period, yield comparisons across holdings
- **Risk Assessment:** Agent runs the existing X-ray report and explains findings conversationally
- **Transaction Inquiry:** Query past buy/sell/dividend activities with natural language
- **Market Data Lookup:** Current prices via Ghostfolio's data provider layer
- **Multi-Currency Support:** Portfolio valuation in different currencies using exchange rate services
- **Portfolio Optimization:** Allocation analysis with rebalancing suggestions (with disclaimers)

**Verification Requirements:**
- All factual claims about the user's portfolio must be backed by actual data — no hallucinated numbers
- Financial disclaimers required on any forward-looking or advisory statements
- Symbol validation: confirm referenced assets exist in the user's portfolio before making claims
- Performance figures must match Ghostfolio's own calculation engine (ROAI methodology)
- Confidence scoring on analytical or recommendation outputs

**Data Sources:**
- Ghostfolio's PostgreSQL database (accounts, orders, holdings, market data) via Prisma ORM
- Ghostfolio's data provider layer (Yahoo Finance, CoinGecko, Alpha Vantage, Financial Modeling Prep)
- Ghostfolio's portfolio calculation engine (performance, dividends, allocation)
- Exchange rate service for multi-currency conversions

### 2. Scale & Performance

**Expected Query Volume:** Low to moderate — self-hosted personal finance tool. Typical usage: 5–50 queries/day per user instance.

**Acceptable Latency:**
- Single-tool queries: <5 seconds
- Multi-step reasoning (holdings + performance + report): <15 seconds
- Market data lookups with external API calls: <8 seconds

**Concurrent Users:** 1–5 per Ghostfolio instance (personal/household use). The existing NestJS architecture handles this naturally.

**Cost Constraints:** Users self-host and provide their own LLM API keys via OpenRouter. Target: <$0.05 per complex query. Caching and prompt optimization are priorities.

### 3. Reliability Requirements

**Cost of a Wrong Answer:** High. Incorrect portfolio values or performance figures could lead to poor investment decisions. Incorrect tax-related information (dividends, capital gains) could have legal and financial consequences. Users rely on this data for real financial planning.

**Non-Negotiable Verification:**
- Portfolio data accuracy: all numbers must match Ghostfolio's own calculations
- Symbol/asset existence validation before making claims about specific holdings
- Financial disclaimer on any recommendation or forward-looking statement
- No fabricated performance numbers or holdings under any circumstances

**Human-in-the-Loop:** Not required for read-only queries. Recommended for any action that would modify data (future: placing orders, rebalancing). MVP is read-only.

**Audit/Compliance:** Full trace logging of every agent interaction (input → reasoning → tool calls → output). Important for users who use Ghostfolio for tax reporting.

### 4. Team & Skill Constraints

**Agent Frameworks:** Moderate familiarity. Have used the Vercel AI SDK and built chat-based applications. Ghostfolio already integrates the Vercel AI SDK (v4.3.16) and OpenRouter provider.

**Domain Experience:** Strong. Personal interest in finance and investing; built a Polymarket trading system in Go with real-time data processing and automated strategies. Familiar with portfolio analysis concepts, asset allocation, and financial data structures.

**Eval/Testing:** Moderate. Have written test suites but not LLM-specific evaluation frameworks. Will use Langfuse eval capabilities combined with custom test harnesses.

**Codebase Familiarity:** Becoming familiar. Ghostfolio is a large NestJS monorepo. Key services identified: PortfolioService, OrderService, DataProviderService, ExchangeRateService. The existing AI service provides a foundation to extend.

---

## Phase 2: Architecture Discovery

### 5. Agent Framework Selection

**Decision:** Vercel AI SDK (already in the repository)

**Rationale:**
- Ghostfolio already depends on `ai` v4.3.16 and `@openrouter/ai-sdk-provider` — zero new framework dependencies
- Native tool calling support via `generateText()` with Zod-based tool definitions
- Streaming support via `streamText()` for responsive UI
- Provider-agnostic: works with OpenRouter (already configured), Anthropic, OpenAI, and others
- Multi-step tool calling built in (`maxSteps` parameter handles tool call loops)
- TypeScript-native, matching the entire codebase

**Alternatives Considered:**
- **LangChain.js:** More abstractions, but adds significant dependency weight and a second paradigm. Overkill for tool-augmented chat.
- **LangGraph.js:** Powerful for complex state machines with cycles, but agent flow is relatively linear. Not justified.
- **Custom:** Full control but duplicates what Vercel AI SDK already provides well.

**Architecture:** Single agent with tool registry. The agent receives user queries, selects and invokes appropriate tools (backed by Ghostfolio services), verifies results, and returns structured responses. No multi-agent collaboration needed — one agent with clear tool boundaries is simpler and more debuggable.

**State Management:** Conversation history stored in-memory per session (with option to persist to Redis, which Ghostfolio already runs). The Vercel AI SDK's messages array handles this naturally.

### 6. LLM Selection

**Decision:** OpenRouter (flexible model switching)

**Rationale:**
- Already configured in Ghostfolio — the AiService uses OpenRouter with admin-configurable API key and model
- Users choose their preferred model: Claude Sonnet for quality, GPT-4o for speed, Llama 3 for cost
- Single API key accesses 100+ models — ideal for self-hosted tool with diverse user preferences
- Vercel AI SDK's provider pattern makes switching models a one-line configuration change

**Function Calling:** All major models on OpenRouter support tool calling. Tools defined with Zod schemas (Vercel AI SDK standard) for type-safe definitions.

**Context Window:** Most queries under 8K tokens. Portfolio data is tabular and compact. 128K context windows (Claude/GPT-4o) provide ample room for history + tool results.

**Cost per Query (varies by model choice):**
- Claude 3.5 Sonnet: ~$0.01–0.03 per query
- GPT-4o: ~$0.01–0.02 per query
- Llama 3 70B: ~$0.001–0.005 per query

### 7. Tool Design

Eight tools, each wrapping an existing Ghostfolio service method. No new external API dependencies.

| Tool | Wraps Service | Description |
|---|---|---|
| `get_portfolio_holdings` | `PortfolioService.getDetails()` | Holdings with allocation %, asset class, currency, performance |
| `get_portfolio_performance` | `PortfolioService.getPerformance()` | Return metrics: total return, net performance, chart data |
| `get_dividend_summary` | `PortfolioService.getDividends()` | Dividend income breakdown by period and holding |
| `get_transaction_history` | `OrderService` | Activities filtered by symbol, type, date range |
| `lookup_market_data` | `DataProviderService` | Current price, historical data, asset profile |
| `get_portfolio_report` | `PortfolioService.getReport()` | X-ray rules: diversification, fees, concentration risks |
| `get_exchange_rate` | `ExchangeRateService` | Currency pair conversion rate at a given date |
| `get_account_summary` | `PortfolioService.getAccounts()` | Account names, platforms, balances, currencies |

**External API Dependencies:** Ghostfolio's data provider layer already handles external calls (Yahoo Finance, CoinGecko, etc.) with error handling, rate limiting, and Redis caching. Agent tools wrap these existing services rather than making direct external calls.

**Mock vs Real Data:** Development uses Ghostfolio's demo account data (seeded by `prisma/seed.mts`). For eval test cases, a deterministic test dataset with known expected outputs will be created.

**Error Handling Per Tool:**
- Missing/invalid symbols → return 'Symbol not found' with suggestions
- Empty portfolio → return 'No holdings found' with guidance to add activities
- Data provider failure → graceful fallback message, log error, suggest retry
- Permission errors → clear access denied message
- Timeout → return partial results with indication of incompleteness

### 8. Observability Strategy

**Decision:** Langfuse (open source)

**Rationale:**
- Open source and self-hostable — aligns with Ghostfolio's self-hosting philosophy
- First-party integration with Vercel AI SDK via `@langfuse/vercel-ai`
- Provides tracing, evals, datasets, prompt management, and cost tracking in one tool
- Free tier is generous for development; self-hosted option for production

**Key Metrics Tracked:**

| Metric | Purpose |
|---|---|
| Latency breakdown | LLM inference time, tool execution time, total end-to-end |
| Token usage | Input/output tokens per request, cost per query |
| Tool selection accuracy | Does the agent pick the right tools? |
| Error rates | Tool failures, LLM errors, verification failures |
| Eval scores | Pass/fail rates on test suite, tracked over time for regression |

### 9. Eval Approach

**Correctness Measurement:**
- **Factual accuracy:** Compare agent's numerical claims against direct database queries (ground truth)
- **Tool selection:** For each test query, define expected tool(s) and compare against actual calls
- **Response completeness:** Does the agent answer the full question or miss parts?
- **Hallucination detection:** Flag any claims not traceable to tool results

**Ground Truth Sources:**
- Direct Prisma queries against the test database for portfolio data
- Known calculation results from Ghostfolio's own endpoints
- Manually verified expected outputs for each test case

**Evaluation Mix:**
- **Automated:** Tool selection, numerical accuracy, response format, latency, safety refusals
- **LLM-as-judge:** Response quality, helpfulness, coherence (separate evaluator model)
- **Human:** Spot-check sample of responses for nuance and edge cases

**CI Integration:** Eval suite runs as a standalone script, integratable into GitHub Actions. Langfuse tracks historical scores for regression detection.

### 10. Verification Design

**Claims Requiring Verification:**
- Any specific number (portfolio value, return %, dividend amount, holding quantity)
- Any assertion about what the user owns or doesn't own
- Performance comparisons ('your best performer,' 'your worst sector')
- Historical claims ('you bought X on date Y')

**Confidence Thresholds:**

| Level | Threshold | Query Type | Handling |
|---|---|---|---|
| High | >90% | Direct data retrieval ('What do I own?') | Return data directly |
| Medium | 60–90% | Analytical queries combining multiple data points | Include caveats |
| Low | <60% | Recommendations, predictions, comparisons | Must include disclaimers |

**Verification Implementations (4):**
1. **Data-Backed Claim Verification:** Every numerical claim checked against structured tool results. Numbers not appearing in any tool result are flagged.
2. **Portfolio Scope Validation:** Before answering questions about specific holdings, verify the asset exists in the user's portfolio. Prevents hallucinated holdings.
3. **Financial Disclaimer Injection:** Responses containing recommendations, projections, or comparative analysis automatically include appropriate disclaimers.
4. **Consistency Check:** When multiple tools are called, verify data consistency across them (e.g., total allocation sums to ~100%).

**Escalation Triggers:**
- Agent asked to execute trades or modify portfolio → refuse, suggest Ghostfolio UI
- Tax advice requested → disclaim, suggest consulting a tax professional
- Query about assets not in portfolio → clearly state limitation
- Confidence below threshold → surface uncertainty to user explicitly

---

## Phase 3: Post-Stack Refinement

### 11. Failure Mode Analysis

**Tool Failures:**
- Individual tool failure → acknowledge, provide partial answer from successful tools, suggest retry
- All tools fail → clear error message with diagnostic info
- Timeout → return what's available within the time limit

**Ambiguous Queries:**
- 'How am I doing?' → ask for clarification or default to overall portfolio performance
- Unclear time ranges → default to YTD with note about the assumption
- Multiple interpretations → choose most likely, state the interpretation explicitly

**Rate Limiting & Fallback:**
- Request queuing for burst protection
- Exponential backoff on 429 responses from OpenRouter
- Model fallback: if primary model is rate-limited, try a backup model

**Graceful Degradation:**
- LLM unavailable → message explaining AI feature is temporarily unavailable
- Database unavailable → health check catches this, return service unavailable
- Redis down → bypass cache, slower but functional

### 12. Security Considerations

**Prompt Injection Prevention:**
- User input always passed as user message, never interpolated into system prompts
- Tool results clearly delimited in context
- System prompt hardcoded, not user-configurable
- Vercel AI SDK's structured tool calling reduces injection surface vs. raw string concatenation

**Data Leakage Protection:**
- Agent only accesses data for the authenticated user (enforced by Ghostfolio's auth guards)
- Tool calls pass the authenticated userId — cannot access other users' data
- Conversation history is per-session, not shared across users

**API Key Management:**
- OpenRouter API key stored in Ghostfolio's Property table (existing pattern)
- Langfuse keys stored as environment variables
- No API keys exposed in frontend code or logs
- Existing JWT auth protects agent endpoints

### 13. Testing Strategy

| Test Type | Scope | Approach |
|---|---|---|
| Unit Tests | Individual tools | Mock data, verify parameter passing, error handling, schema compliance |
| Integration Tests | End-to-end agent flows | User query → agent → tool calls → response; multi-step reasoning; conversation continuity |
| Adversarial Tests | Security & safety | Prompt injection, cross-user data access, data modification requests, hallucination triggers |
| Regression Tests | Historical performance | Eval suite as Langfuse dataset, run on every change, minimum 80% pass rate |

### 14. Open Source Planning

**Release:** A reusable AI agent module for Ghostfolio — a PR or published package adding conversational AI capabilities to any Ghostfolio instance.

**Contribution Types:**
- **Primary:** Feature PR to the Ghostfolio repository adding the agent module
- **Secondary:** Eval dataset published publicly for testing financial AI agents

**License:** AGPL-3.0 (matching Ghostfolio's existing license)

**Documentation:**
- Setup guide: how to enable the AI agent (API keys, configuration)
- Architecture overview: how the agent integrates with existing services
- Tool reference: what each tool does and its parameters
- Eval guide: how to run and extend the test suite

### 15. Deployment & Operations

**Hosting:** The agent is part of the Ghostfolio NestJS backend — no separate deployment needed. Ships as a new module within the existing application. Deployed wherever the user hosts Ghostfolio (Docker, Vercel, Railway, self-hosted VM).

**CI/CD:**
- Lint + type check on PR
- Unit tests on PR
- Eval suite on merge to main
- Docker build and publish on release

**Rollback Strategy:** The agent is a feature-flagged module. Disable via admin settings (toggle in Ghostfolio's Property table). No impact on core Ghostfolio functionality.

### 16. Iteration Planning

**User Feedback:**
- Thumbs up/down on each agent response (stored and sent to Langfuse)
- Optional text feedback field; feedback tied to traces for debugging

**Eval-Driven Improvement Cycle:**
1. Run eval suite → identify failure categories
2. Analyze failing test cases in Langfuse traces
3. Improve system prompt, tool descriptions, or verification logic
4. Re-run evals → confirm improvement, check for regressions

**Feature Roadmap:**

The MVP (24-hour hard gate) covers all required items. All submission deliverables target Early (Day 4), with Final (Day 7) reserved as buffer for fixes and polish.

| Phase | Deliverable | MVP Requirements Covered |
|---|---|---|
| MVP (24 hrs) | Read-only agent with 8 tools, conversation history, error handling, 1 verification check, 5+ test cases, deployed publicly | ✓ Natural language queries in finance domain · ✓ 8 functional tools (exceeds minimum of 3) · ✓ Tool calls return structured results · ✓ Agent synthesizes tool results into responses · ✓ Conversation history across turns · ✓ Graceful error handling (no crashes) · ✓ Portfolio data accuracy verification check · ✓ 5+ test cases with expected outcomes · ✓ Deployed and publicly accessible |
| Early (Day 4) | Full eval framework (50+ test cases), Langfuse observability, 3+ verification checks, open source contribution, cost analysis, demo video, docs | Post-MVP: complete eval dataset, tracing, cost tracking, scope validation, disclaimers, consistency checks, published package/PR, public eval dataset, documentation — all submission requirements complete by this point |
| Final (Day 7) | Bug fixes, eval failures addressed, edge cases hardened, documentation polished, demo video re-recorded if needed | Buffer: fix issues found during Early review, improve pass rates based on eval results, address any deployment or stability issues |
| Future | Streaming responses, persistent history (Redis), write actions with human-in-the-loop, proactive insights | Beyond scope: planned for post-submission iteration if adopted by Ghostfolio upstream |

---

## Architecture Overview

```
Existing Angular Frontend [unchanged]
  └─ Chat UI Component [new] — added within existing Angular app
        │
        ▼  WebSocket / REST
Existing NestJS Backend [unchanged]
  └─ AI Agent Module [new] — added within existing NestJS backend
        ├─ Reasoning Engine (Vercel AI SDK)
        ├─ Tool Registry (8 tools)
        ├─ Verification Layer (4 checks)
        └─ Memory / Conversation History
              │
              ▼  calls into
     Existing Ghostfolio Services [unchanged]
        ├─ PortfolioService
        ├─ OrderService
        ├─ DataProviderService
        ├─ ExchangeRateService
        └─ AccountService
              │
              ▼
     Infrastructure [existing]
        ├─ PostgreSQL (Prisma ORM)
        ├─ Redis (Cache)
        └─ External APIs (Yahoo Finance, CoinGecko, Alpha Vantage)
              │
              ▼  traces sent to
     Langfuse — Tracing + Evals + Cost Tracking [new]
```