# Condensed Architecture (AI MVP)

Date: 2026-02-24  
Source: `docs/MVP-VERIFICATION.md` (condensed to 1-2 pages)

## 1) System Overview

Ghostfolio AI MVP is a finance-domain assistant embedded in the existing Ghostfolio API and portfolio UI.

Primary goals:

- Answer natural-language finance queries.
- Execute domain tools with structured outputs.
- Preserve memory across turns.
- Emit verifiable responses (citations, confidence, checks).
- Stay observable and testable under refactors.

## 2) Runtime Flow

```text
Client (analysis page chat panel)
  -> POST /api/v1/ai/chat
  -> ai.controller.ts
  -> ai.service.ts (orchestrator)
     -> determineToolPlan(query, symbols)
     -> tool execution (portfolio/risk/market/rebalance/stress)
     -> verification checks
     -> buildAnswer() with provider + deterministic fallback
     -> confidence scoring + observability snapshot
  -> JSON response (answer + metadata)
```

## 3) Core Components

- Controller: [apps/api/src/app/endpoints/ai/ai.controller.ts](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/apps/api/src/app/endpoints/ai/ai.controller.ts)
- Orchestrator: [apps/api/src/app/endpoints/ai/ai.service.ts](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/apps/api/src/app/endpoints/ai/ai.service.ts)
- Tool helpers: [apps/api/src/app/endpoints/ai/ai-agent.chat.helpers.ts](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/apps/api/src/app/endpoints/ai/ai-agent.chat.helpers.ts)
- Verification helpers: [apps/api/src/app/endpoints/ai/ai-agent.verification.helpers.ts](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/apps/api/src/app/endpoints/ai/ai-agent.verification.helpers.ts)
- Tool planning and confidence: [apps/api/src/app/endpoints/ai/ai-agent.utils.ts](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/apps/api/src/app/endpoints/ai/ai-agent.utils.ts)
- Observability: [apps/api/src/app/endpoints/ai/ai-observability.service.ts](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/apps/api/src/app/endpoints/ai/ai-observability.service.ts)
- Eval runner: [apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.ts](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.ts)

## 4) Tooling Model

Implemented tools:

- `portfolio_analysis`
- `risk_assessment`
- `market_data_lookup`
- `rebalance_plan`
- `stress_test`

Selection policy:

- Intent and keyword based.
- Conservative fallback to `portfolio_analysis` + `risk_assessment` when intent is ambiguous.
- Symbol extraction uses uppercase + stop-word filtering to reduce false positives.

## 5) Memory Model

- Backend: Redis
- Key: `ai-agent-memory-{userId}-{sessionId}`
- TTL: 24h
- Retention: last 10 turns
- Stored turn fields: query, answer, timestamp, tool statuses

## 6) Verification and Guardrails

Checks currently emitted in response:

- `numerical_consistency`
- `market_data_coverage`
- `tool_execution`
- `output_completeness`
- `citation_coverage`
- `response_quality`
- `rebalance_coverage` (when applicable)
- `stress_test_coherence` (when applicable)

Quality guardrail:

- Filters weak generated responses (generic disclaimers, low-information output, missing actionability for invest/rebalance prompts).
- Falls back to deterministic synthesis when generated output quality is below threshold.

## 7) Observability

Per-chat capture:

- Total latency
- LLM / memory / tool breakdown
- Token estimate
- Error traces
- Optional LangSmith trace linkage

Per-eval capture:

- Category pass summaries
- Suite pass rate
- Hallucination-rate heuristic
- Verification-accuracy metric

## 8) Performance Strategy

Two layers:

- Service-level deterministic gate (`test:ai:performance`)
- Live model/network gate (`test:ai:live-latency:strict`)

Latency control:

- `AI_AGENT_LLM_TIMEOUT_IN_MS` (default `3500`)
- Timeout triggers deterministic fallback so tail latency remains bounded.

## 9) Testing and Evals

Primary AI gates:

- `npm run test:ai`
- `npm run test:mvp-eval`
- `npm run test:ai:quality`
- `npm run test:ai:performance`
- `npm run test:ai:live-latency:strict`

Dataset:

- 53 total eval cases
- Category minimums satisfied (`happy_path`, `edge_case`, `adversarial`, `multi_step`)

## 10) Open Source Path

Prepared package scaffold:

- [tools/evals/finance-agent-evals/package.json](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/tools/evals/finance-agent-evals/package.json)
- [tools/evals/finance-agent-evals/index.mjs](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/tools/evals/finance-agent-evals/index.mjs)
- [tools/evals/finance-agent-evals/datasets/ghostfolio-finance-agent-evals.v1.json](/Users/maxpetrusenko/Desktop/Gauntlet/ghostfolio/tools/evals/finance-agent-evals/datasets/ghostfolio-finance-agent-evals.v1.json)

This package is ready for dry-run packing and publication workflow.
