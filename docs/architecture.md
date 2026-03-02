# Agent Architecture Document

## Domain & Use Cases

**Domain**: Personal finance portfolio management (Ghostfolio fork)

**Problems solved**: Ghostfolio's existing UI requires manual navigation across multiple pages to understand portfolio state. The agent provides a conversational interface that synthesizes holdings, performance, market data, and transaction history into coherent natural language — and can execute write operations (account management, activity logging, watchlist, tags) with native tool approval gates.

**Target users**: Self-directed investors tracking multi-asset portfolios (stocks, ETFs, crypto) who want quick portfolio insights without clicking through dashboards.

## Agent Architecture

### Framework & Stack

| Layer           | Choice                                                                    | Rationale                                                                                   |
| --------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Runtime         | NestJS (TypeScript)                                                       | Native to Ghostfolio codebase                                                               |
| Agent framework | Vercel AI SDK v6 (`ToolLoopAgent`)                                        | Native TS, streaming SSE, built-in tool dispatch                                            |
| LLM             | Claude Sonnet 4.6 (default)                                               | Strong function calling, structured output, 200K context                                    |
| Model options   | Haiku 4.5 ($0.005/chat), Sonnet 4.6 ($0.015/chat), Opus 4.6 ($0.077/chat) | User-selectable per session                                                                 |
| Schemas         | Zod v4                                                                    | Required by AI SDK v6 `inputSchema`                                                         |
| Database        | Prisma + Postgres                                                         | Shared with Ghostfolio, plus agent-specific tables                                          |
| Cache warming   | `warmPortfolioCache` helper                                               | Redis + BullMQ (`PortfolioSnapshotService`) — ensures portfolio reads reflect recent writes |

### Request Flow

```
User message
    │
    ▼
POST /api/v1/agent/chat (JWT auth)
    Body: { messages: UIMessage[], toolHistory?, model?, approvedActions? }
    │
    ▼
ToolLoopAgent created → pipeAgentUIStreamToResponse()
    │
    ├─► prepareStep()
    │     ├─ Injects current date into system prompt
    │     ├─ All 10 tools available from step 1 (activity_manage auto-resolves accountId)
    │     └─ Loads contextual SKILL.md files based on tool history
    │
    ├─► LLM reasoning → tool selection
    │     └─ Up to 10 steps (stopWhen: stepCountIs(10))
    │
    ├─► Tool execution (try/catch per tool)
    │     └─ Returns structured JSON to LLM for synthesis
    │
    ├─► Approval gate (write tools only)
    │     ├─ needsApproval() evaluates per invocation
    │     ├─ Skips: list actions, previously-approved signatures, SKIP_APPROVAL env
    │     └─ If required: stream pauses → client shows approval card → resumes on approve/deny
    │
    ├─► Post-write cache warming (activity_manage, account_manage)
    │     └─ warmPortfolioCache: clear Redis → drain stale jobs → enqueue HIGH priority → await (30s timeout)
    │
    ├─► SSE stream to client (UIMessage protocol)
    │     └─ Events: text-delta, tool-input-start, tool-input-available, tool-approval-request, tool-output-available, finish
    │
    └─► onFinish callback
          ├─ Verification pipeline (3 systems)
          ├─ Metrics recording (in-memory + Postgres)
          └─ Structured log: chat_complete
```

### Tool Design

10 tools organized into read (6) and write (4) categories:

| Tool                    | Type  | Purpose                                                           |
| ----------------------- | ----- | ----------------------------------------------------------------- |
| `portfolio_analysis`    | Read  | Holdings, allocations, total value, account breakdown             |
| `portfolio_performance` | Read  | Returns, net performance, chart data (downsampled to ~20 points)  |
| `holdings_lookup`       | Read  | Deep dive on single position: dividends, fees, sectors, countries |
| `market_data`           | Read  | Live quotes for 1-10 symbols (FMP + CoinGecko)                    |
| `symbol_search`         | Read  | Disambiguate crypto vs stock, find correct data source            |
| `transaction_history`   | Read  | Buys, sells, dividends, fees, deposits, withdrawals               |
| `account_manage`        | Write | CRUD accounts + transfers between accounts                        |
| `activity_manage`       | Write | CRUD transactions (BUY/SELL/DIVIDEND/FEE/INTEREST/LIABILITY)      |
| `watchlist_manage`      | Write | Add/remove/list watchlist items                                   |
| `tag_manage`            | Write | CRUD tags for transaction organization                            |

**Auto-resolution**: `activity_manage` auto-resolves `accountId` when omitted on creates — matches accounts by asset type keywords (crypto → "crypto"/"wallet" accounts, stocks → "stock"/"brokerage" accounts) with fallback to highest-activity account. No tool gating; all 10 tools available from step 1.

**Approval gates**: All 4 write tools define `needsApproval` — a function-based gate evaluated per invocation. Read-only actions (`list`) and previously-approved action signatures are auto-skipped. `SKIP_APPROVAL=true` env var disables all gates (used in evals). Action signatures follow the pattern `tool_name:action:identifier` (e.g., `activity_manage:create:AAPL`).

| Tool               | Approval Rule                                                                    |
| ------------------ | -------------------------------------------------------------------------------- |
| `activity_manage`  | `create` and `delete` only (not `update`), unless signature in `approvedActions` |
| `account_manage`   | Everything except `list`, unless signature in `approvedActions`                  |
| `tag_manage`       | Everything except `list`                                                         |
| `watchlist_manage` | Everything except `list`                                                         |

**Cache warming**: After every write operation in `activity_manage` and `account_manage`, `warmPortfolioCache()` runs — clears stale Redis portfolio snapshots, drains in-flight BullMQ jobs, enqueues fresh computation at HIGH priority, and awaits completion with a 30s timeout. Ensures subsequent read tools return up-to-date portfolio data. Injected via `PortfolioSnapshotService`, `RedisCacheService`, and `UserService`.

**Skill injection**: Contextual SKILL.md documents (transaction workflow, market data patterns) are injected into the system prompt based on which tools have been used, providing the LLM with domain-specific guidance without bloating every request.

## Verification Strategy

Three deterministic systems run on every response in the `onFinish` callback:

| System                      | What It Checks                                                                                                                          | Weight in Composite |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **Output Validation**       | Min/max length, numeric data present when tools called, disclaimer on forward-looking language, write claims backed by write tool calls | 0.3                 |
| **Hallucination Detection** | Ticker symbols in response exist in tool data, dollar amounts match within 5% or $1, holding claims reference actual tool results       | 0.3                 |
| **Confidence Score**        | Composite 0-1: tool success rate (0.3), step efficiency (0.1), output validity (0.3), hallucination score (0.3)                         | —                   |

**Why deterministic**: No additional LLM calls = zero latency overhead and zero cost. Cross-references response text against actual tool result data. Catches the most common financial hallucination patterns (phantom tickers, fabricated dollar amounts) with high precision.

**Persistence**: Results stored on `AgentChatLog` (`verificationScore`, `verificationResult`) and exposed via `GET /agent/verification/:requestId`.

## Eval Results

**Framework**: evalite — dedicated eval runner with scoring, UI, and CI integration.

| Suite      | Cases  | Pass Rate | Scorers                                                          |
| ---------- | ------ | --------- | ---------------------------------------------------------------- |
| Golden Set | 19     | **100%**  | GoldenCheck (deterministic binary)                               |
| Scenarios  | 67     | **91%**   | ToolCallAccuracy (F1), HasResponse, ResponseQuality (LLM-judged) |
| **Total**  | **86** |           |                                                                  |

**Category breakdown**: single-tool (10), multi-tool (10), ambiguous (6), account management (8), activity management (10), watchlist (4), tag (4), multi-step write (4), adversarial write (4), edge cases (7), golden routing (7), golden structural (4), golden behavioral (2), golden guardrails (4).

**CI gate**: GitHub Actions runs golden set on every push to main. Threshold: 100%. Hits deployed Render instance.

**Remaining 9% scenario gap**: Agent calls extra tools on ambiguous queries (thorough, not wrong). Write-operation approval is now handled by native `needsApproval` gates (bypassed in evals via `SKIP_APPROVAL=true`).

## Observability Setup

| Capability           | Implementation                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Trace logging**    | Structured JSON: `chat_start`, `step_finish` (tool names, token usage), `verification`, `chat_complete`                         |
| **Latency tracking** | Total `latencyMs` per request, persisted to Postgres                                                                            |
| **Token usage**      | prompt/completion/total per request, averaged in metrics summary                                                                |
| **Cost tracking**    | Model-specific pricing (Sonnet $3/$15, Haiku $1/$5, Opus $15/$75 per MTok), `cost.totalUsd` and `cost.avgPerChatUsd` in metrics |
| **Error tracking**   | Errors recorded with sanitized messages (DB URLs, API keys redacted)                                                            |
| **User feedback**    | Thumbs up/down per message, unique per (requestId, userId), satisfaction rate in metrics                                        |
| **Metrics endpoint** | `GET /agent/metrics?since=1h` — summary, feedback, recent chats                                                                 |

**Key insight**: Avg $0.015/chat with Sonnet 4.6, ~5.9s latency, ~1.9 steps per query. Portfolio analysis and market data are the most-used tools.

## Open Source Contribution

**Eval dataset**: 86-case structured JSON dataset (`evals/dataset.json`) covering tool routing, multi-tool chaining, write operations, adversarial inputs, and edge cases for a financial AI agent. Each case includes input query, expected tools, expected behavioral assertions, and category labels. Published in the repository for reuse by other Ghostfolio agent implementations.
