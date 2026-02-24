# Critical Requirements Status

Date: 2026-02-24  
Scope: `docs/requirements.md` + `docs/PRESEARCH.md` critical gates

## 1) Core Technical Requirements

| Requirement | Status | Evidence |
| --- | --- | --- |
| Agent responds to natural-language finance queries | Complete | `POST /api/v1/ai/chat` in `apps/api/src/app/endpoints/ai/ai.controller.ts` |
| 5+ functional tools | Complete | `portfolio_analysis`, `risk_assessment`, `market_data_lookup`, `rebalance_plan`, `stress_test` in `ai.service.ts` and helper modules |
| Tool calls return structured results | Complete | `AiAgentChatResponse` shape with `toolCalls`, `citations`, `verification`, `confidence` |
| Conversation memory across turns | Complete | Redis-backed memory in `ai-agent.chat.helpers.ts` (`AI_AGENT_MEMORY_MAX_TURNS`, TTL) |
| Graceful error handling | Complete | Tool-level catch and fallback response in `ai.service.ts` / `buildAnswer()` |
| 3+ verification checks | Complete | `numerical_consistency`, `market_data_coverage`, `tool_execution`, `citation_coverage`, `output_completeness`, `response_quality`, `rebalance_coverage`, `stress_test_coherence` |
| Eval dataset 50+ with required category distribution | Complete | 53 total in `apps/api/src/app/endpoints/ai/evals/dataset/*` with category gate in `mvp-eval.runner.spec.ts` |
| Observability (trace + latency + token + errors + eval traces) | Complete | `ai-observability.service.ts` + eval tracing in `mvp-eval.runner.ts` (LangSmith env-gated) |
| User feedback mechanism | Complete | `POST /api/v1/ai/chat/feedback`, `AiFeedbackService`, UI feedback buttons in `ai-chat-panel` |

## 2) Performance Evidence

### Service-level latency regression gate (deterministic, mocked providers)

Command:

```bash
npm run test:ai:performance
```

Observed p95 (2026-02-24):

- Single-tool query p95: `0.64ms` (target `<5000ms`)
- Multi-step query p95: `0.22ms` (target `<15000ms`)

Notes:

- This benchmark validates application orchestration performance and guards future refactors.
- It uses mocked providers and isolates app-side overhead.

### Live model/network latency gate (env-backed, strict target mode)

Commands:

```bash
npm run test:ai:live-latency
npm run test:ai:live-latency:strict
```

Observed strict p95 (2026-02-24):

- Single-tool query p95: `3514ms` (target `<5000ms`)
- Multi-step query p95: `3505ms` (target `<15000ms`)

Notes:

- Uses real provider keys from `.env` (`z_ai_glm_api_key` / `minimax_api_key`).
- Guardrail `AI_AGENT_LLM_TIMEOUT_IN_MS` (default `3500`) bounds tail latency and triggers deterministic fallback when provider response exceeds budget.

### Required command gate (current)

```bash
npm run test:ai
npm run test:mvp-eval
npm run test:ai:quality
npm run test:ai:performance
npm run test:ai:live-latency:strict
npx nx run api:lint
```

All pass locally.

### Eval quality target tracking

- Hallucination-rate heuristic is tracked in `mvp-eval.runner.ts` and asserted in `mvp-eval.runner.spec.ts` with threshold `<= 0.05`.
- Verification-accuracy metric is tracked in `mvp-eval.runner.ts` and asserted in `mvp-eval.runner.spec.ts` with threshold `>= 0.9`.

## 3) File Size Constraint (~500 LOC)

Current AI endpoint surface stays within the target:

- `ai.service.ts`: 470 LOC
- `ai-agent.chat.helpers.ts`: 436 LOC
- `ai-agent.verification.helpers.ts`: 102 LOC
- `mvp-eval.runner.ts`: 450 LOC
- `ai-observability.service.ts`: 443 LOC

Refactor requirement now:

- No mandatory refactor required to satisfy the file-size rule.

## 4) Remaining Final Submission Items

These are still outstanding at submission level:

- Demo video (3-5 min)
- Social post with `@GauntletAI`
- Open-source release link (local scaffold complete at `tools/evals/finance-agent-evals/`, external publish/PR link still pending)

Open-source scaffold verification commands:

```bash
npm run evals:package:check
npm run evals:package:pack
```

## 5) AI Reply Quality

Current state:

- Deterministic response-quality heuristics are implemented (`response_quality` verification check).
- Generic disclaimer answers and low-information answers are filtered by reliability gating in `buildAnswer()`.
- Quality eval slice is active via `apps/api/src/app/endpoints/ai/evals/ai-quality-eval.spec.ts`.

Recommendation:

- Keep adding real failing prompts into quality eval cases and tune prompt policy in `buildAnswer()` with deterministic assertions.
