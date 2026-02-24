# Todo

Updated: 2026-02-24

- [x] Verify current repository state and missing required files
- [x] Create `docs/adr/` for architecture decisions
- [x] Save `Tasks.md` at repository root
- [x] Populate `docs/tasks/tasks.md`
- [x] Create `tasks/improvements.md`
- [x] Create `tasks/lessons.md`
- [x] Confirm files exist on disk
- [x] Kick off MVP slice after Presearch refresh (this session)

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

## Notes

- Canonical project requirements live in `docs/requirements.md`.
- Architecture decisions live in `docs/adr/`.
- Detailed task board mirror lives in `docs/tasks/tasks.md`.

## MVP Start (Finance Agent on Ghostfolio)

- [x] Inspect existing AI endpoint and integration points (`ai.controller.ts`, `ai.service.ts`, portfolio and data-provider services)
- [x] Add `POST /api/v1/ai/chat` endpoint with request validation
- [x] Implement 3 MVP tools in AI service
- [x] Add Redis-backed session memory for conversation continuity
- [x] Add verification checks and structured output formatter (citations, confidence, verification details)
- [x] Add targeted API unit tests for tool selection and response contract
- [x] Run lint and API tests
- [x] Share required and optional `.env` keys for local MVP run

## Session Plan (2026-02-23)

- [x] Refresh `docs/PRESEARCH.md` with source-backed framework and eval notes
- [x] Add root `Tasks.md` mirror for submission checklist compliance
- [x] Add AI chat service tests (tool execution, memory, verification, confidence)
- [x] Add MVP runbook snippet for local execution and API invocation
- [x] Execute focused verification (lint/test on touched surface)
- [x] Update ticket status and evidence links

## Session Plan (2026-02-23, UI + Deploy + Test Data)

- [x] Add client chat integration method for `POST /api/v1/ai/chat`
- [x] Build MVP chat interface in portfolio analysis page
- [x] Add focused frontend tests for chat request and response rendering
- [x] Verify AI test suite + eval suite after UI changes
- [x] Validate Railway API key and project visibility
- [x] Install/use Railway CLI and initialize or link project configuration
- [x] Add local data setup path and seed script command for MVP testing
- [x] Run final verification commands and capture evidence

## Session Plan (2026-02-23, Visibility + Test URL)

- [x] Diagnose why AI panel and activities are not visible in local UI
- [x] Remove analysis page visibility gate that hides AI panel for non-experimental users
- [x] Seed MVP activities for all local users to make testing deterministic
- [x] Update `docs/CODE-REVIEW.md` with exact local test URLs and validation steps
- [x] Run focused tests for touched files and record verification evidence
- [x] Capture lesson for UI discoverability and test-path communication

## Session Plan (2026-02-23, Publish via CLI)

- [x] Validate Railway CLI availability and auth path
- [x] Switch to supported Railway CLI version (`@railway/cli`)
- [x] Link current repository to configured Railway project/service
- [x] Trigger production deployment from local repository
- [x] Return deployed URL and post-deploy health check evidence

## Session Plan (2026-02-23, Seed Expansion)

- [x] Expand AI MVP seed dataset with more symbols and transactions
- [x] Add a second account per user for diversification scenarios
- [x] Run seeding command and verify row counts and sample orders
- [x] Share exact seeded coverage for local and deploy testing

## Session Plan (2026-02-23, Submission Bundle Completion)

- [x] Switch Railway service from source-build deploys to GHCR image deploys
- [x] Trigger redeploy and verify production health endpoint on image-based deploy
- [x] Create 1-page AI development log document for submission
- [x] Create AI cost analysis document with 100/1K/10K/100K projections
- [x] Push submission documents and deployment updates to `origin/main`

## Session Plan (2026-02-23, Railway Crash Recovery)

- [x] Reproduce Railway start-command failure locally
- [x] Correct Railway start command to built API entrypoint
- [x] Verify fixed command resolves module-not-found crash
- [x] Update task tracker evidence for deploy follow-up

## Session Plan (2026-02-23, AI Chat Intent Recovery)

- [x] Diagnose why allocation/invest prompts return memory-only fallback
- [x] Expand tool-intent routing for invest/allocate/rebalance prompts
- [x] Improve deterministic fallback answer content for allocation guidance
- [x] Normalize risk concentration math for leveraged/liability portfolios
- [x] Run focused AI test suite and eval regression checks

## Session Plan (2026-02-24, LangSmith Relevance Gate)

- [x] Add deterministic investment-relevance expectations to MVP eval dataset
- [x] Add direct eval case for the prompt "Where should I invest?"
- [x] Add runnable LangSmith eval script for full suite + investment subset summary
- [x] Run LangSmith eval command and capture pass/fail evidence

## Session Plan (2026-02-23, Railway Latency + Redis Auth Fix)

- [x] Reproduce production slowness and capture health endpoint latency
- [x] Identify Redis AUTH error spam source from cache URL construction
- [x] Fix Redis cache URL to avoid credentials when password is empty
- [x] Correct `railway.toml` start command for Docker runtime (`node main.js`)
- [x] Redeploy and verify logs + latency improvements in production

## Session Plan (2026-02-23, Core Features Expansion)

- [x] Run focused AI verification gate before feature work (`npm run test:ai`, `nx run api:lint`)
- [x] Expand agent toolset from 3 to 5 meaningful finance tools
- [x] Add deterministic tests for new tool planning and orchestration
- [x] Extend MVP eval dataset with coverage for new tools
- [x] Run focused AI regression suite and push to `origin/main`

## Session Plan (2026-02-23, Full Requirements Closure - Local)

- [x] Expand eval dataset to 50+ cases with required category coverage (happy/edge/adversarial/multi-step)
- [x] Add LangSmith observability integration for AI chat traces and key metrics
- [x] Add/adjust tests to validate observability payload and expanded eval pass gate
- [x] Update submission docs to reflect 5-tool architecture and 50+ eval status
- [x] Run local verification (`npm run test:ai`, `npm run test:mvp-eval`, `nx run api:lint`) without pushing

## Session Plan (2026-02-24, Requirement Closure Execution)

- [x] Expand eval dataset to at least 50 deterministic test cases with explicit category tags and category-level assertions.
- [x] Wire `AiObservabilityService` into `AiService.chat` and capture total latency, tool latency, LLM latency, error traces, and token estimates.
- [x] Integrate optional LangSmith eval run upload path in eval runner with environment-based gating.
- [x] Update AI endpoint tests for observability payload and updated eval thresholds.
- [x] Update `.env.example`, `docs/LOCAL-TESTING.md`, `Tasks.md`, and `docs/tasks/tasks.md` to reflect LangSmith setup and new eval baseline.
- [x] Run focused verification and record outcomes.

## Session Plan (2026-02-24, Quality Lift to 9+)

- [x] Fix AI service typing regression and ensure extended AI quality/performance suites compile and pass.
- [x] Make observability non-blocking on the request path and harden env defaults to prevent accidental tracing overhead.
- [x] Improve chat panel quality for theming consistency, i18n coverage, and accessibility semantics.
- [x] Expand AI verification gate scripts to include quality/performance/feedback suites.
- [x] Re-run verification (`test:ai`, `test:mvp-eval`, `api:lint`, targeted client tests) and record outcomes.
- [x] Add deterministic performance regression test gate for single-tool and multi-step latency targets.

## Session Plan (2026-02-24, Live Latency + Reply Quality Hardening)

- [x] Add environment-gated live latency benchmark test that exercises real LLM network calls and records p95 for single-tool and multi-step prompts.
- [x] Add deterministic reply-quality eval checks (clarity/actionability/anti-disclaimer guardrails) on representative prompts.
- [x] Add npm script(s) for the new benchmark/eval paths and document how to run locally.
- [x] Run focused verification (`test:ai`, `test:mvp-eval`, new quality and live latency commands) and capture evidence.
- [x] Update critical requirements and presearch docs with latest evidence and any remaining gaps.

## Session Plan (2026-02-24, Remaining Gap Closure)

- [x] Add explicit eval metrics for hallucination rate and verification accuracy.
- [x] Add open-source eval package scaffold with dataset artifact and framework-agnostic runner.
- [x] Add condensed architecture summary document derived from `docs/MVP-VERIFICATION.md`.
- [x] Re-run focused verification and capture updated evidence.

## Session Plan (2026-02-24, Tool Gating + Routing Hardening)

- [x] Replace planner unknown-intent fallback with no-tool route (`[]`) to prevent deterministic over-tooling.
- [x] Add deterministic policy gate at executor boundary to enforce route decisions (`direct|tools|clarify`) and tool allowlist filtering.
- [x] Emit policy metrics in runtime output (`blocked_by_policy`, `block_reason`, `forced_direct`) via verification checks and observability logging.
- [x] Add/adjust unit tests for planner fallback, policy enforcement, and no-tool execution path.
- [x] Run focused verification (`npm run test:ai`, `npm run test:mvp-eval`) and capture evidence.

## Session Plan (2026-02-24, OSS Publish + External PRs)

- [x] Confirm in-repo open-source tool package is committed and documented for direct repo consumption.
- [x] Create high-signal upstream PR in `openai/evals` fork with finance-agent eval dataset integration docs/template.
- [x] Create high-signal upstream PR in `langchain` fork with a focused docs contribution for finance-agent eval interoperability.
- [x] Push fork branches and open PRs against upstream repositories.
- [x] Update `Tasks.md` and plan artifact with PR links and current status.

## Session Plan (2026-02-24, Chat Persistence + Simple Query Handling)

- [x] Review current chat panel storage behavior and AI policy direct-route behavior.
- [x] Implement localStorage-backed chat session/message persistence with bounded history in `ai-chat-panel.component.ts`.
- [x] Extend direct no-tool query handling for simple assistant capability/help prompts in `ai-agent.policy.utils.ts`.
- [x] Add or update unit tests for chat persistence and policy simple-query routing.
- [x] Run focused verification on touched frontend/backend AI suites and update task tracking artifacts.

## Session Plan (2026-02-24, Per-LLM LangSmith Invocation Tracing)

- [x] Audit current AI provider call path and verify where LangSmith/LangChain tracing is missing.
- [x] Add explicit per-provider LLM invocation tracing hooks before/after each `generateText` provider call.
- [x] Thread query/session/user context into LLM invocation tracing payloads for easier LangSmith filtering.
- [x] Update AI and observability unit tests to assert LLM invocation trace behavior and keep provider fallback behavior stable.
- [x] Run focused verification for touched AI suites and update task tracking notes.

## Session Plan (2026-02-24, LangChain Wrapper + Arithmetic Direct Reply Correction)

- [x] Enforce provider invocation through LangChain runnable wrapper in `AiService.generateText`.
- [x] Fix no-tool arithmetic prompts to return computed deterministic replies instead of capability fallback text.
- [x] Add/update unit tests for arithmetic direct replies and provider tracing/fallback behavior.
- [x] Run focused verification (`test:ai` and `api:lint`) and update tracker notes.

## Session Plan (2026-02-24, Cross-Session User Preference Memory)

- [x] Add Redis-backed user preference storage keyed by `userId` (independent of `sessionId`).
- [x] Parse explicit preference update prompts and persist preference changes across sessions.
- [x] Apply persisted preference context to AI answer generation and direct-route responses where relevant.
- [x] Add/update AI unit tests to verify cross-session preference continuity and deterministic behavior.
- [x] Run focused verification (`test:ai`) and update tracker notes.

## Session Plan (2026-02-24, Chat Details Popover UX)

- [ ] Audit current AI chat response rendering and identify diagnostics shown inline.
- [ ] Move diagnostics (confidence, citations, verification, observability) behind an info-triggered popover per assistant message.
- [ ] Keep main assistant response focused on user-facing answer and retain feedback controls in primary view.
- [ ] Update chat panel tests to assert info-trigger behavior and diagnostics visibility expectations.
- [ ] Run focused frontend verification and update trackers (`Tasks.md`, `tasks/tasks.md`, `tasks/lessons.md`).

## Verification Notes

- `nx run api:lint` completed successfully (existing workspace warnings only).
- Full `nx test api` currently fails in pre-existing portfolio calculator suites unrelated to AI endpoint changes.
- Focused MVP verification passed:
  - `npm run test:ai`
  - `npm run test:mvp-eval`
  - `npm run hostinger:check`
  - `npx dotenv-cli -e .env.example -- npx jest apps/client/src/app/pages/portfolio/analysis/ai-chat-panel/ai-chat-panel.component.spec.ts --config apps/client/jest.config.ts`
  - `npm run railway:check`
  - `npm run railway:setup`
  - `npm run database:seed:ai-mvp`
  - `npx nx run client:build:development-en`
  - `npx nx run client:lint`
  - `npx dotenv-cli -e .env -- npx -y @railway/cli@latest up --detach`
  - `npx dotenv-cli -e .env -- npx -y @railway/cli@latest service status`
  - `curl -i https://ghostfolio-api-production.up.railway.app/api/v1/health`
- Railway crash recovery verification (local):
  - `node main.js` fails with `MODULE_NOT_FOUND` for `/ghostfolio/main.js` (old command)
  - `node dist/apps/api/main.js` starts successfully
  - `curl -fsS http://127.0.0.1:3333/api/v1/health` returns `{"status":"OK"}`
- Railway crash recovery verification (production):
  - `npx dotenv-cli -e .env -- npx -y @railway/cli@latest up --detach`
  - `npx dotenv-cli -e .env -- npx -y @railway/cli@latest service status` reached `Status: SUCCESS` on deployment `4f26063a-97e5-43dd-b2dd-360e9e12a951`
  - `curl -i https://ghostfolio-api-production.up.railway.app/api/v1/health` returned `HTTP/2 200` with `{"status":"OK"}`
- AI chat intent recovery verification:
  - `npx dotenv-cli -e .env.example -- npx jest apps/api/src/app/endpoints/ai/ai-agent.utils.spec.ts apps/api/src/app/endpoints/ai/ai.service.spec.ts --config apps/api/jest.config.ts`
  - `npm run test:ai` (passed)
- LangSmith relevance gate verification:
  - `npm run test:mvp-eval` (passes with the new investment relevance checks)
  - `npm run test:ai` (6/6 suites, 34/34 tests)
  - `npm run test:ai:langsmith` -> `Overall suite: 53/53 passed (100.0%)`, `Investment relevance subset: 25/25 passed (100.0%)`
- Full requirements closure verification (local, 2026-02-24):
  - `npm run test:mvp-eval` (passes with 50+ eval cases and category minimums)
  - `npm run test:ai` (7 suites passed, includes reply quality and timeout fallback assertions)
  - `npm run test:ai:performance` (service-level p95 regression gate for `<5s` / `<15s` targets)
  - `npm run test:ai:quality` (reply-quality eval slice passed)
  - `npm run test:ai:live-latency` (env-backed live benchmark passed with strict targets enabled)
  - `npm run test:ai:live-latency:strict` (single-tool p95 `3514ms`, multi-step p95 `3505ms`, both within thresholds)
  - `npx nx run api:lint` (passed with existing non-blocking workspace warnings)
- Remaining-gap closure verification (local, 2026-02-24):
  - `npm run test:ai` (9/9 suites, 40/40 tests)
  - `npm run test:mvp-eval` (includes hallucination-rate and verification-accuracy assertions)
  - `npm run test:ai:quality` (3/3 tests)
  - `npm run test:ai:performance` (p95 under service-level targets)
  - `npm run test:ai:live-latency:strict` (real model/network strict targets pass)
  - `(cd tools/evals/finance-agent-evals && npm run check)` (package scaffold smoke test pass)
  - `(cd tools/evals/finance-agent-evals && npm run pack:dry-run)` (packaging dry run pass)
- Railway latency + Redis auth fix verification (production):
  - `railway up --service ghostfolio-api --detach` produced successful deployment `d7f73e4a-0a11-4c06-b066-3cbe58368094`
  - `railway logs -s ghostfolio-api -d d7f73e4a-0a11-4c06-b066-3cbe58368094 -n 800 | rg "ERR AUTH|Redis health check failed"` returned no matches
  - `curl` probes improved from ~1.8-2.2s TTFB to ~0.16-0.47s on `/api/v1/health`
  - `/en/accounts` now serves in ~0.27-0.42s TTFB in repeated probes
- Quality lift verification (local, 2026-02-24):
  - `npm run test:ai` (9 suites passed, includes new `ai-observability.service.spec.ts` and deterministic performance gate)
  - `npx dotenv-cli -e .env.example -- npx jest apps/client/src/app/pages/portfolio/analysis/ai-chat-panel/ai-chat-panel.component.spec.ts --config apps/client/jest.config.ts` (4/4 tests passed)
  - `npx nx run api:lint` (passes with existing workspace warnings)
  - `npx nx run client:lint` (passes with existing workspace warnings)
- Tool gating + routing hardening verification (local, 2026-02-24):
  - `npx jest apps/api/src/app/endpoints/ai/ai-agent.utils.spec.ts apps/api/src/app/endpoints/ai/ai.service.spec.ts --config apps/api/jest.config.ts` (passes after policy-gating assertion updates)
  - `npm run test:ai` (9/9 suites, 44/44 tests)
  - `npm run test:mvp-eval` (pass rate threshold test still passes)
  - `npx nx run api:lint` (passes with existing workspace warnings)
- Chat persistence + simple query handling verification (local, 2026-02-24):
  - `npx jest apps/client/src/app/pages/portfolio/analysis/ai-chat-panel/ai-chat-panel.component.spec.ts --config apps/client/jest.config.ts` (7/7 tests passed)
  - `npx jest apps/api/src/app/endpoints/ai/ai-agent.utils.spec.ts apps/api/src/app/endpoints/ai/ai.service.spec.ts --config apps/api/jest.config.ts` (31/31 tests passed)
  - `npx nx run api:lint` (passes with existing workspace warnings)
  - `npx nx run client:lint` (passes with existing workspace warnings)
- Per-LLM LangSmith invocation tracing verification (local + deploy config, 2026-02-24):
  - `npx jest apps/api/src/app/endpoints/ai/ai-observability.service.spec.ts apps/api/src/app/endpoints/ai/ai.service.spec.ts apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.spec.ts apps/api/src/app/endpoints/ai/ai-performance.spec.ts apps/api/src/app/endpoints/ai/evals/ai-quality-eval.spec.ts apps/api/src/app/endpoints/ai/evals/ai-live-latency.spec.ts --config apps/api/jest.config.ts` (5/5 suites passed, live-latency suite skipped by env gate)
  - `npx nx run api:lint` (passes with existing workspace warnings)
  - `railway variable set -s ghostfolio-api --skip-deploys LANGCHAIN_API_KEY=... LANGSMITH_API_KEY=... LANGCHAIN_TRACING_V2=true LANGSMITH_TRACING=true LANGSMITH_PROJECT=ghostfolio-ai-agent`
  - `railway variable list -s ghostfolio-api --kv` confirms: `LANGCHAIN_API_KEY`, `LANGSMITH_API_KEY`, `LANGCHAIN_TRACING_V2`, `LANGSMITH_TRACING`, `LANGSMITH_PROJECT`
- LangChain wrapper + arithmetic direct reply verification (local, 2026-02-24):
  - `npx jest apps/api/src/app/endpoints/ai/ai-agent.utils.spec.ts apps/api/src/app/endpoints/ai/ai.service.spec.ts apps/api/src/app/endpoints/ai/ai-observability.service.spec.ts --config apps/api/jest.config.ts` (36/36 tests passed)
  - `npm run test:ai` (9/9 suites passed, 49/49 tests)
  - `npx nx run api:lint --verbose` (passes with existing workspace warnings)
- Cross-session user preference memory verification (local, 2026-02-24):
  - `npm run test:ai` (9/9 suites passed, 54/54 tests)
  - `npx nx run api:lint` (passes with existing workspace warnings)
