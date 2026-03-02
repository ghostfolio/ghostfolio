# Pre-Search Document

Completed before writing agent code. Decisions informed all subsequent architecture choices.

## Phase 1: Define Your Constraints

### 1. Domain Selection

- **Domain**: Finance (Ghostfolio — open source portfolio tracker)
- **Use cases**: Portfolio analysis, performance tracking, market data lookups, transaction management, account CRUD, watchlist management, tagging
- **Verification requirements**: Hallucination detection (dollar amounts, ticker symbols), output validation, confidence scoring. Financial data must match tool results exactly.
- **Data sources**: Ghostfolio's existing Prisma/Postgres models, Financial Modeling Prep API (stocks/ETFs), CoinGecko API (crypto)

### 2. Scale & Performance

- **Expected query volume**: 100-1,000 chats/day during demo period
- **Acceptable latency**: <5s single-tool, <15s multi-step
- **Concurrent users**: ~10-50 simultaneous (Render Standard plan)
- **Cost constraints**: <$50/month for demo, Sonnet 4.6 at ~$0.015/chat is viable

### 3. Reliability Requirements

- **Cost of wrong answer**: Medium — incorrect portfolio values or transaction amounts erode trust. Not life-threatening (unlike healthcare), but financial data must be accurate.
- **Non-negotiable verification**: Dollar amounts in response must match tool data (within 5% or $1). Ticker symbols must reference actual holdings.
- **Human-in-the-loop**: Write operations (buy/sell/delete) require confirmation before execution. Agent asks clarifying questions rather than assuming.
- **Audit needs**: All chats logged to AgentChatLog with requestId, tokens, latency, verification scores.

### 4. Team & Skill Constraints

- **Agent frameworks**: Familiar with Vercel AI SDK, LangChain. Chose Vercel AI SDK for native TypeScript + NestJS integration.
- **Domain experience**: Familiar with portfolio management concepts. Ghostfolio codebase already provides all financial data models.
- **Eval/testing**: Experience with Jest/Vitest. Chose evalite for dedicated eval framework with UI and scoring.

## Phase 2: Architecture Discovery

### 5. Agent Framework Selection

- **Choice**: Vercel AI SDK v6 (`ToolLoopAgent`)
- **Why not LangChain**: Ghostfolio is NestJS/TypeScript — Vercel AI SDK is native TS, lighter weight, no Python dependency. LangChain's JS version is less mature.
- **Why not custom**: Vercel AI SDK provides streaming, tool dispatch, step management out of the box. No need to reinvent.
- **Architecture**: Single agent with tool gating via `prepareStep`. Not multi-agent — single domain, single user context.
- **State management**: Conversation history passed per turn. Tool gating state tracked via `toolHistory` array across turns.

### 6. LLM Selection

- **Choice**: Claude Sonnet 4.6 (default), with Haiku 4.5 and Opus 4.6 selectable per request
- **Why Claude**: Strong function calling, excellent at structured financial output, good instruction following for system prompt rules
- **Context window**: Sonnet 4.6 has 200K context — more than sufficient for portfolio data + conversation history
- **Cost per query**: $0.015 avg with Sonnet — acceptable for demo and small-scale production

### 7. Tool Design

- **Tools built**: 10 total (6 read + 4 write)
  - Read: portfolio_analysis, portfolio_performance, holdings_lookup, market_data, symbol_search, transaction_history
  - Write: account_manage, activity_manage, watchlist_manage, tag_manage
- **External APIs**: Financial Modeling Prep (stocks/ETFs), CoinGecko (crypto) — both via Ghostfolio's existing data provider layer
- **Mock vs real**: Real data from seeded demo portfolio (AAPL, MSFT, VOO, GOOGL, BTC, TSLA, NVDA). No mocks in dev or eval.
- **Error handling**: Every tool wrapped in try/catch, returns structured error messages. Agent gracefully surfaces errors to user.

### 8. Observability Strategy

- **Choice**: Self-hosted structured JSON logging + Postgres persistence + in-memory metrics
- **Why not LangSmith/Braintrust**: Adds external dependency and cost. Structured logs + Postgres give full control and queryability. Metrics endpoint provides real-time dashboard.
- **Key metrics**: Latency, token usage (prompt/completion/total), cost per chat, tool usage frequency, error rate, verification scores
- **Real-time monitoring**: `GET /agent/metrics?since=1h` endpoint with summary + recent chats
- **Cost tracking**: Token counts × model-specific pricing computed in metrics summary

### 9. Eval Approach

- **Framework**: evalite (dedicated eval runner with UI, separate from unit tests)
- **Correctness**: GoldenCheck scorer — deterministic binary pass/fail on tool routing, output patterns, forbidden content
- **Quality**: ResponseQuality scorer — LLM-judged (Haiku 4.5) scoring relevance, data-groundedness, conciseness, formatting
- **Tool accuracy**: ToolCallAccuracy scorer — F1-style partial credit for expected vs actual tool calls
- **Ground truth**: Real API responses from seeded demo portfolio
- **CI integration**: GitHub Actions runs golden evals on push, threshold 100%

### 10. Verification Design

- **Claims verified**: Dollar amounts, ticker symbols, holding references
- **Fact-checking sources**: Tool result data (the agent's own tool calls serve as ground truth)
- **Confidence thresholds**: Composite 0-1 score (tool success rate 0.3, step efficiency 0.1, output validity 0.3, hallucination score 0.3)
- **Escalation triggers**: Low confidence score logged but no automated escalation (deterministic verification only)

## Phase 3: Post-Stack Refinement

### 11. Failure Mode Analysis

- **Tool failures**: Try/catch per tool, error surfaced to user with suggestion to retry. Agent continues conversation.
- **Ambiguous queries**: Agent uses multiple tools when unsure (e.g., "How am I doing?" calls both performance and analysis). Over-fetching preferred over under-fetching.
- **Rate limiting**: No explicit rate limiting implemented. Render Standard plan handles moderate traffic. Would add Redis-based rate limiting at scale.
- **Graceful degradation**: If market data API fails, agent acknowledges and proceeds with available data.

### 12. Security Considerations

- **Prompt injection**: System prompt instructs agent to stay in role. Eval suite includes adversarial inputs (jailbreak, developer mode, system prompt extraction).
- **Data leakage**: Agent scoped to authenticated user's data only. JWT auth on all endpoints.
- **API key management**: All keys in environment variables, not committed. Error messages sanitized (DB URLs, API keys redacted).
- **Audit logging**: Every chat logged with requestId, userId, tools used, token counts, verification results.

### 13. Testing Strategy

- **Unit tests**: 16 tests for prepareStep tool gating logic
- **Eval tests**: 86 cases across golden (19) and scenarios (67)
- **Adversarial testing**: 11 cases covering prompt injection, jailbreak, resource abuse, system prompt extraction
- **Regression**: CI gate enforces 100% golden pass rate on every push

### 14. Open Source Planning

- **Release**: Eval dataset (86 cases) published as `evals/dataset.json` — structured JSON with input, expected tools, expected behavior, categories
- **License**: Follows Ghostfolio's existing AGPL-3.0 license
- **Documentation**: Agent README (280 lines), architecture doc, cost analysis, this pre-search document

### 15. Deployment & Operations

- **Hosting**: Render (Docker) — web + Redis + Postgres, Oregon region
- **CI/CD**: GitHub Actions for eval gate. Render auto-deploys from main branch.
- **Monitoring**: Structured JSON logs + `/agent/metrics` endpoint
- **Rollback**: Render provides instant rollback to previous deploy

### 16. Iteration Planning

- **User feedback**: Thumbs up/down per message, stored in AgentFeedback table, surfaced in metrics
- **Eval-driven improvement**: Failures in eval suite drive agent refinement (e.g., stale test cases updated when write tools added)
- **Future work**: Automated feedback → eval pipeline, LLM-judged hallucination detection, useChat migration if UI complexity grows
