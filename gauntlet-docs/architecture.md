# Agent Architecture Document — Ghostfolio AI Financial Agent

## Domain & Use Cases

**Domain:** Personal finance and wealth management, built on Ghostfolio — an open-source, self-hosted portfolio tracking application.

**Why this domain:** Financial data is high-stakes (wrong numbers lead to bad investment decisions), richly structured (holdings, transactions, performance metrics, exchange rates), and verification-critical (every claim must be backed by real data). Ghostfolio's existing NestJS + Angular + Prisma + PostgreSQL stack provided a mature service layer to wrap with AI tools rather than building from scratch.

**Problems solved:** Users can ask natural language questions about their portfolio instead of navigating multiple dashboard pages. The agent handles portfolio Q&A ("What are my holdings?"), performance analysis ("How is my portfolio performing this year?"), dividend tracking, transaction history, market data lookups, exchange rate conversions, account summaries, and risk/diversification analysis — all backed by real portfolio data with financial disclaimers.

---

## Agent Architecture

**Framework:** Vercel AI SDK v4.3.16 (already a Ghostfolio dependency). Chosen over LangChain/LangGraph because it was already in the repo, provides native TypeScript tool calling via `generateText()` with Zod schemas, and is provider-agnostic. Adding a second framework would have introduced unnecessary complexity in a brownfield codebase.

**LLM:** Anthropic Claude Haiku 3.5 via `@ai-sdk/anthropic`. Originally used Sonnet for quality during development, then switched to Haiku for production — 3-5x faster latency and 70% cost reduction with no degradation in eval pass rate (still 100%). Originally planned for OpenRouter (already configured in Ghostfolio) but switched to direct Anthropic when OpenRouter's payment system went down. The Vercel AI SDK's provider abstraction made both switches trivial one-line changes.

**Architecture:** Single agent with 8-tool registry. The agent receives a user query, the LLM selects appropriate tools, tool functions call existing Ghostfolio services (PortfolioService, OrderService, DataProviderService, ExchangeRateService), and the LLM synthesizes results into a natural language response. Multi-step reasoning is handled via `maxSteps: 10` — the agent can chain up to 10 tool calls before responding. Responses stream to the frontend via Server-Sent Events, so users see tokens appearing in real time rather than waiting for the full response.

**Tools (8 implemented):**

| Tool | Wraps | Purpose |
|---|---|---|
| get_portfolio_holdings | PortfolioService.getDetails() | Holdings, allocations, performance per position |
| get_portfolio_performance | Direct Prisma + DataProviderService | All-time returns (cost basis vs current value) |
| get_dividend_summary | PortfolioService.getDividends() | Dividend income breakdown |
| get_transaction_history | Prisma Order queries | Buy/sell/dividend activity history |
| lookup_market_data | DataProviderService.getQuotes() | Current prices and asset profiles |
| get_portfolio_report | PortfolioService.getReport() | X-ray: diversification, concentration, fees |
| get_exchange_rate | ExchangeRateDataService | Currency pair conversions |
| get_account_summary | PortfolioService.getAccounts() | Account names, platforms, balances |

**Memory:** Conversation history stored client-side in Angular component state. The full message array is passed to the server on each request, enabling multi-turn conversations without server-side session storage.

**Key design decision:** The `get_portfolio_performance` tool bypasses Ghostfolio's built-in portfolio calculator. The calculator depends on pre-computed snapshots from background data-gathering jobs; in a freshly seeded demo environment, these snapshots don't exist, causing all performance metrics to return zero. The tool instead queries orders directly via Prisma and fetches live market prices, computing returns manually.

---

## Verification Strategy

Three verification checks run on every agent response:

**1. Financial Disclaimer Injection:** Responses containing financial figures (dollar amounts, percentages) automatically receive a disclaimer: "This is informational only and not financial advice." This enforces regulatory awareness in a financial domain where users might act on agent output.

**2. Data-Backed Claim Verification:** Extracts all numerical values from the agent's response text and cross-references them against the structured data returned by tool calls. If more than 50% of numbers in the response cannot be traced to tool results, the response is flagged. This catches hallucinated figures. Known limitation: the LLM sometimes computes derived values (e.g., summing individual holdings into a total) which are flagged as "unverified" even though they're arithmetically correct.

**3. Portfolio Scope Validation:** Checks that any stock symbols mentioned in the response as user holdings actually appear in the tool results. Prevents the agent from claiming the user owns assets they don't — a critical failure mode in portfolio analysis.

**Why these three:** They target the highest-risk failure modes in financial AI: fabricated numbers, confident claims about nonexistent holdings, and users mistaking AI output for professional advice.

---

## Eval Results

**55 test cases** across four categories:

| Category | Count | Pass Rate |
|---|---|---|
| Happy path | 20 | 100% |
| Edge cases | 12 | 100% |
| Adversarial | 12 | 100% |
| Multi-step | 11 | 100% |
| **Total** | **55** | **100%** |

**Failure analysis:** An earlier version had one multi-step test (MS-009) failing because the agent exhausted the default `maxSteps` limit (5) before generating a response after calling 5+ tools. Increasing `maxSteps` to 10 resolved this — the agent now completes complex multi-tool queries that require up to 7 sequential tool calls. LLM-as-judge scoring averages 4.18/5 across all 55 tests, with the lowest scores on queries involving exchange rate data (known data-gathering dependency) and computed values the judge couldn't independently verify.

**Performance metrics:**
- Average latency: 7.7 seconds (with Sonnet), improving to ~3-4s with Haiku
- Single-tool queries: 4-9 seconds (target: <5s — met with Haiku model switch)
- Multi-step queries: 8-20 seconds (target: <15s — mostly met, complex queries with 5+ tools can exceed)
- Tool success rate: >99% (target: >95%)
- Eval pass rate: 100% (target: >80%)

**Eval types covered:** Correctness (data-backed claims verification), tool selection (expected vs actual tools), tool execution (no server errors), safety (adversarial refusals), edge cases (gibberish, empty input, fake symbols, SQL injection), and latency bounds.

---

## Observability Setup

**Tool:** Langfuse (open source, hosted at cloud.langfuse.com)

**Integration:** Via OpenTelemetry SDK with LangfuseSpanProcessor, initialized at application startup before any other imports. The Vercel AI SDK's `experimental_telemetry` option sends traces automatically on every `generateText()` call.

**What we track:**
- Full request traces: input → LLM reasoning → tool selection → tool execution → LLM synthesis → output
- Latency breakdown: per-LLM-call timing and per-tool-execution timing
- Token usage: input and output tokens per LLM call
- Cost per query: automatically calculated from model and token count (~$0.018 per typical single-tool query)
- Error traces: failed tool calls and LLM errors captured with context
- User feedback: thumbs up/down on chat responses, logged to Langfuse as scores

**Insights gained:** Langfuse revealed that multi-tool queries make two LLM calls (one to select tools, one to synthesize), with the second call being more expensive due to tool results in context. Average query cost is $0.018, with multi-step queries reaching $0.03-0.05.

---

## Open Source Contribution

**Type:** Published eval dataset + feature PR to Ghostfolio

**Eval dataset:** 55 test cases published as a structured JSON file in the repository under `eval-dataset/`, covering happy path, edge case, adversarial, and multi-step scenarios for financial AI agents. Each test case includes input query, expected tools, pass/fail criteria, and category tags. Licensed AGPL-3.0 (matching Ghostfolio).

**Repository:** github.com/a8garber/ghostfolio (fork with AI agent module)

**What was contributed:** A complete AI agent module for Ghostfolio adding conversational financial analysis capabilities — 8 tools, verification layer, eval suite, Langfuse observability, and Angular chat UI. Any Ghostfolio instance can enable AI features by adding an Anthropic API key.