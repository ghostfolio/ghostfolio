# Tasks

Last updated: 2026-02-24

## Active Tickets

| ID | Feature | Status | Tests | PR / Commit |
| --- | --- | --- | --- | --- |
| T-001 | Presearch package and architecture direction | Complete | Doc review checklist | Local docs update |
| T-002 | ADR foundation in `docs/adr/` | Complete | ADR template and first ADR review | Local docs update |
| T-003 | Agent MVP tool 1: `portfolio_analysis` | Complete | `apps/api/src/app/endpoints/ai/ai.service.spec.ts` | Planned |
| T-004 | Agent memory and response formatter | Complete | `apps/api/src/app/endpoints/ai/ai.service.spec.ts` | Planned |
| T-005 | Eval dataset baseline (MVP 5-10) | Complete | `apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.spec.ts` | Planned |
| T-006 | Full eval dataset (50+) | Complete | `apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.spec.ts` | Local implementation |
| T-007 | Observability wiring (LangSmith traces and metrics) | Complete | `apps/api/src/app/endpoints/ai/ai.service.spec.ts`, `apps/api/src/app/endpoints/ai/ai-feedback.service.spec.ts`, `apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.spec.ts` | Local implementation |
| T-008 | Deployment and submission bundle | Complete | `npm run test:ai` + Railway healthcheck + submission docs checklist | `2b6506de8` |
| T-009 | Open source eval framework contribution | In Review | `@ghostfolio/finance-agent-evals` package scaffold + dataset export + smoke/pack checks | openai/evals PR #1625 + langchain PR #35421 |
| T-010 | Chat history persistence and simple direct-query handling | Complete | `apps/client/src/app/pages/portfolio/analysis/ai-chat-panel/ai-chat-panel.component.spec.ts`, `apps/api/src/app/endpoints/ai/ai-agent.utils.spec.ts`, `apps/api/src/app/endpoints/ai/ai.service.spec.ts` | Local implementation |
| T-011 | Per-LLM LangSmith invocation tracing + production tracing env enablement | Complete | `apps/api/src/app/endpoints/ai/ai-observability.service.spec.ts`, `apps/api/src/app/endpoints/ai/ai.service.spec.ts`, `apps/api/src/app/endpoints/ai/ai-performance.spec.ts`, `apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.spec.ts`, `apps/api/src/app/endpoints/ai/evals/ai-quality-eval.spec.ts` | Local implementation + Railway variable update |
| T-012 | LangChain wrapper enforcement for provider calls + arithmetic direct-response correction | Complete | `apps/api/src/app/endpoints/ai/ai.service.spec.ts`, `apps/api/src/app/endpoints/ai/ai-agent.utils.spec.ts`, `npm run test:ai` | Local implementation |
| T-013 | Cross-session user preference memory (persisted by user, independent of chat session) | Complete | `apps/api/src/app/endpoints/ai/ai-agent.chat.helpers.spec.ts`, `apps/api/src/app/endpoints/ai/ai.service.spec.ts`, `npm run test:ai`, `npx nx run api:lint` | Local implementation |

## Notes

- Canonical project requirements: `docs/requirements.md`
- ADR location: `docs/adr/`
- Detailed execution tracker: `tasks/tasks.md`
- Requirement closure (2026-02-24): 53-case eval suite and LangSmith tracing integrated in AI chat + eval runner.
- Performance gate (2026-02-24): `npm run test:ai:performance` added for single-tool and multi-step latency regression checks.
- Live latency gate (2026-02-24): `npm run test:ai:live-latency:strict` passing with p95 ~3.5s for single-tool and multi-step prompts.
- Reply quality gate (2026-02-24): `npm run test:ai:quality` added with deterministic anti-disclaimer and actionability checks.
- Eval quality metrics (2026-02-24): hallucination-rate (`<=5%`) and verification-accuracy (`>=90%`) tracked and asserted in MVP eval suite.
- Open-source package scaffold (2026-02-24): `tools/evals/finance-agent-evals/` with dataset export, runner, smoke test, and pack dry-run.
- External OSS PRs (2026-02-24):
  - https://github.com/openai/evals/pull/1625
  - https://github.com/langchain-ai/langchain/pull/35421
- Condensed architecture doc (2026-02-24): `docs/ARCHITECTURE-CONDENSED.md`.
- Railway crash recovery (2026-02-23): `railway.toml` start command corrected to `node dist/apps/api/main.js`, deployed to Railway (`4f26063a-97e5-43dd-b2dd-360e9e12a951`), and validated with production health check.
- Tool gating hardening (2026-02-24): planner unknown-intent fallback changed to no-tools, executor policy gate added (`direct|tools|clarify`), and policy metrics emitted via verification and observability logs.
- Chat persistence + simple direct-query handling (2026-02-24): client chat panel now restores/persists session + bounded message history via localStorage and policy no-tool prompts now return assistant capability guidance for queries like "Who are you?".
- Per-LLM LangSmith invocation tracing (2026-02-24): each provider call now records an explicit LangSmith `llm` run (provider/model/query/session/response metadata), and production Railway env now has tracing variables enabled.
- Direct arithmetic no-tool behavior fix (2026-02-24): simple arithmetic prompts now return computed answers (for example `2+2 = 4`) instead of generic capability guidance.
- Cross-session preference memory (2026-02-24): AI now persists explicit user response-style preferences in Redis by `userId`, recalls them across different `sessionId`s, and applies them to later AI responses.
