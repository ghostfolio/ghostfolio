# Todo

Updated: 2026-02-23

- [x] Verify current repository state and missing required files
- [x] Create `docs/adr/` for architecture decisions
- [x] Save `Tasks.md` at repository root
- [x] Populate `docs/tasks/tasks.md`
- [x] Create `tasks/improvements.md`
- [x] Create `tasks/lessons.md`
- [x] Confirm files exist on disk
- [x] Kick off MVP slice after Presearch refresh (this session)

# Tasks

Last updated: 2026-02-23

## Active Tickets

| ID | Feature | Status | Tests | PR / Commit |
| --- | --- | --- | --- | --- |
| T-001 | Presearch package and architecture direction | Complete | Doc review checklist | Local docs update |
| T-002 | ADR foundation in `docs/adr/` | Complete | ADR template and first ADR review | Local docs update |
| T-003 | Agent MVP tool 1: `portfolio_analysis` | Complete | `apps/api/src/app/endpoints/ai/ai.service.spec.ts` | Planned |
| T-004 | Agent memory and response formatter | Complete | `apps/api/src/app/endpoints/ai/ai.service.spec.ts` | Planned |
| T-005 | Eval dataset baseline (MVP 5-10) | Complete | `apps/api/src/app/endpoints/ai/evals/mvp-eval.runner.spec.ts` | Planned |
| T-006 | Full eval dataset (50+) | Planned | Dataset validation and regression run | Planned |
| T-007 | Observability wiring (LangSmith traces and metrics) | Planned | Trace assertions and latency checks | Planned |
| T-008 | Deployment and submission bundle | Complete | `npm run test:ai` + Railway healthcheck + submission docs checklist | `2b6506de8` |

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

## Session Plan (2026-02-23, Railway Latency + Redis Auth Fix)

- [x] Reproduce production slowness and capture health endpoint latency
- [x] Identify Redis AUTH error spam source from cache URL construction
- [x] Fix Redis cache URL to avoid credentials when password is empty
- [x] Correct `railway.toml` start command for Docker runtime (`node main.js`)
- [x] Redeploy and verify logs + latency improvements in production

## Session Plan (2026-02-23, Core Features Expansion)

- [x] Run focused AI verification gate before feature work (`npm run test:ai`, `nx run api:lint`)
- [ ] Expand agent toolset from 3 to 5 meaningful finance tools
- [ ] Add deterministic tests for new tool planning and orchestration
- [ ] Extend MVP eval dataset with coverage for new tools
- [ ] Run focused AI regression suite and push to `origin/main`

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
  - `npm run test:ai` (all 4 suites passed)
- Railway latency + Redis auth fix verification (production):
  - `railway up --service ghostfolio-api --detach` produced successful deployment `d7f73e4a-0a11-4c06-b066-3cbe58368094`
  - `railway logs -s ghostfolio-api -d d7f73e4a-0a11-4c06-b066-3cbe58368094 -n 800 | rg "ERR AUTH|Redis health check failed"` returned no matches
  - `curl` probes improved from ~1.8-2.2s TTFB to ~0.16-0.47s on `/api/v1/health`
  - `/en/accounts` now serves in ~0.27-0.42s TTFB in repeated probes
