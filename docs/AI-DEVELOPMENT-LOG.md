# AI Development Log

Date: 2026-02-23  
Project: Ghostfolio Finance Agent MVP  
Domain: Finance

## Tools and Workflow

The workflow for this sprint followed a strict loop:

1. Presearch and architecture alignment in `docs/PRESEARCH.md`.
2. Ticket and execution tracking in `tasks/tasks.md` and `Tasks.md`.
3. Implementation in the existing Ghostfolio backend and client surfaces.
4. Focused verification through AI unit tests and MVP eval tests.
5. Deployment through Railway with public health checks.

Technical stack used in this MVP:

- Backend: NestJS (existing Ghostfolio architecture)
- Agent design: custom orchestrator in `ai.service.ts` with helper modules for tool execution
- Memory: Redis with 24-hour TTL and max 10 turns
- Tools: `portfolio_analysis`, `risk_assessment`, `market_data_lookup`
- Models: `glm-5` via Z.AI primary path, `MiniMax-M2.5` fallback path, OpenRouter backup path
- Deployment: Railway (moved to GHCR image source for faster deploy cycles)

## MCP Usage

- Railway CLI and Railway GraphQL API:
  - linked project/service
  - switched service image source to `ghcr.io/maxpetrusenko/ghostfolio:main`
  - redeployed and verified production health
- Local shell tooling:
  - targeted test/eval runs
  - health checks and deployment diagnostics
- GitHub Actions:
  - GHCR publish workflow on `main` pushes

## Effective Prompts

The following user prompts drove the highest-impact delivery steps:

1. `use z_ai_glm_api_key glm-5 and minimax_api_key minimax m2.5 for mvp`
2. `ok 1 and 2 and add data to the app so we can test it`
3. `i dotn see activities and how to test and i dont see ai bot windows. where should i see it?`
4. `publish you have cli here`
5. `ok do 1 and 2 and then   3. AI development log (1 page) 4. AI cost analysis (100/1K/10K/100K users) 5. Submit to GitHub`

## Code Analysis

Rough authorship estimate for the MVP slice:

- AI-generated implementation and docs: ~70%
- Human-guided edits, review, and final acceptance decisions: ~30%

The largest human contribution focused on:

- model/provider routing decisions
- deploy-source migration on Railway
- quality gates and scope control

## Strengths and Limitations

Strengths observed:

- High velocity on brownfield integration with existing architecture
- Fast refactor support for file-size control and helper extraction
- Reliable generation of deterministic test scaffolding and eval cases
- Strong support for deployment automation and incident-style debugging

Limitations observed:

- CLI/API edge cases required manual schema introspection
- Runtime state and environment drift required explicit verification loops
- Exact token-cost accounting still needs production telemetry wiring

## Key Learnings

1. Clear, constraint-rich prompts produce fast and stable implementation output.
2. Deterministic eval cases are essential for regression control during rapid iteration.
3. Deploy speed improves materially when runtime builds move from source builds to prebuilt images.
4. Production readiness depends on traceability: citations, confidence scores, verification checks, and explicit assumptions in cost reporting.
