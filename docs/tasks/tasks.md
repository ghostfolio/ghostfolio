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
| T-009 | Open source eval framework contribution | Ready for Publish | `@ghostfolio/finance-agent-evals` package scaffold + dataset export + smoke/pack checks | `thoughts/shared/plans/open-source-eval-framework.md` |

## Notes

- Canonical project requirements live in `docs/requirements.md`.
- Architecture decisions live in `docs/adr/`.
- Root tracker mirror lives in `Tasks.md`.
- Requirement closure (2026-02-24): 53-case eval suite and LangSmith tracing integrated in AI chat + eval runner.
- Performance gate (2026-02-24): `npm run test:ai:performance` added for single-tool and multi-step latency regression checks.
- Live latency gate (2026-02-24): `npm run test:ai:live-latency:strict` passing with p95 ~3.5s for single-tool and multi-step prompts.
- Reply quality gate (2026-02-24): `npm run test:ai:quality` added with deterministic anti-disclaimer and actionability checks.
- Eval quality metrics (2026-02-24): hallucination-rate (`<=5%`) and verification-accuracy (`>=90%`) tracked and asserted in MVP eval suite.
- Open-source package scaffold (2026-02-24): `tools/evals/finance-agent-evals/` with dataset export, runner, smoke test, and pack dry-run.
- Condensed architecture doc (2026-02-24): `docs/ARCHITECTURE-CONDENSED.md`.

## MVP Local Runbook

1. Install dependencies and infra:
   - `npm install`
   - `cp .env.dev .env`
   - `docker compose -f docker/docker-compose.dev.yml up -d`
   - `npm run database:setup`
2. Start API:
   - `npm run start:server`
3. Authenticate and call AI chat endpoint:
   - Obtain Bearer token using the existing Ghostfolio auth flow.
   - Call `POST http://localhost:3333/api/v1/ai/chat` with JSON body:
     - `{"query":"Analyze my portfolio concentration risk","sessionId":"mvp-session-1"}`
4. Optional LLM output:
   - Preferred for MVP: set `z_ai_glm_api_key` (`glm-5`) and `minimax_api_key` (`MiniMax-M2.5`) in `.env`.
   - Fallback path: `API_KEY_OPENROUTER` and `OPENROUTER_MODEL` in properties store.
   - Without provider keys, endpoint returns deterministic fallback summaries and still keeps tool and verification metadata.
5. Hostinger infra check:
   - `npm run hostinger:check`

## Verification Snapshot (2026-02-23)

- `nx run api:lint` passed.
- Full `nx test api` fails in existing portfolio calculator tests unrelated to AI endpoint changes.
- Focused AI endpoint test command passed:
  - `npm run test:ai`
  - `npm run test:mvp-eval`
