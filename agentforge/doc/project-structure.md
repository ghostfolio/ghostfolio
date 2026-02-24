# AgentForge Project Structure

This document records options and decisions for organizing AgentForge work within the Ghostfolio fork, including where to locate planning documents and how to structure code. It summarizes discussions held before implementation began.

---

## Context

- **Repository:** Nx monorepo with `apps/api` (NestJS), `apps/client` (Angular), `libs/common`, `libs/ui`.
- **AgentForge:** Domain-specific AI agent for personal finance; wraps Ghostfolio services as tools; uses LangChain JS + LangSmith; five tools, verification layer, eval framework (see `project-definition.md` and `pre-search-checklist.md`).
- **Current state:** Planning docs live in `agentforge/doc/` (this folder). No AgentForge code yet; extension point is existing `apps/api/src/app/endpoints/ai/` (prompt-only AI).

---

## Options for Organizing AgentForge Work

### Option 1: Keep `agentforge/` as the “AgentForge home” (minimal change)

- **Docs:** Leave `agentforge/doc/` as-is.
- **Code:** Put all AgentForge backend code inside the API app, e.g. a new NestJS module at `apps/api/src/app/endpoints/agent/` (or `agentforge/`) implementing the agent (orchestrator, tools, verification) and mounting routes.
- **Pros:** Clear “AgentForge” folder for docs; code lives with the rest of the API; no Nx/tsconfig changes.
- **Cons:** `agentforge/` is doc-only; the “AgentForge” surface is split between `agentforge/doc/` and `apps/api/...`.

**Doc location:** `agentforge/doc/` (unchanged).

---

### Option 2: Treat AgentForge as a first-class Nx library

- **Add** `libs/agentforge/` as an Nx library containing agent logic, tool definitions (schemas), verification, and shared types. The API app has a thin layer (e.g. `apps/api/src/app/endpoints/agent/`) that imports this lib and exposes HTTP + implements tools by calling Ghostfolio services.
- **Docs:** Either **(A)** move `agentforge/doc/` → `libs/agentforge/doc/`, or **(B)** keep planning docs at repo root (e.g. `docs/agentforge/`) and add `libs/agentforge/README.md` for dev/architecture.
- **Pros:** Reusable agent core; clear boundary; fits Nx “libs own domain” pattern; testable in isolation.
- **Cons:** More structure to set up; need to decide what lives in the lib vs the API.

**Doc location:** `libs/agentforge/doc/` (2A) or root `docs/agentforge/` + `libs/agentforge/README.md` (2B).

---

### Option 3: Single `docs/` at repo root (Ghostfolio-style)

- **Docs:** Create root `docs/` and move AgentForge planning there, e.g. `docs/agentforge/project-definition.md`, `pre-search-checklist.md`, `pre-search-investigation-plan.md`.
- **Code:** Same as Option 1 — all agent code in `apps/api/src/app/endpoints/agent/` (or a dedicated `agentforge/` module).
- **Pros:** One place for all project docs; easy to add architecture, runbooks, eval docs later.
- **Cons:** Removes the dedicated `agentforge/` product path unless you keep `docs/agentforge/`.

**Doc location:** `docs/agentforge/`.

---

### Option 4: Co-locate docs with the API feature

- **Docs:** Move planning docs next to the agent API, e.g. `apps/api/src/app/endpoints/agent/doc/` or `apps/api/docs/agentforge/`.
- **Code:** Agent module at `apps/api/src/app/endpoints/agent/`.
- **Pros:** “Everything for the agent” in one tree.
- **Cons:** Long paths; docs inside `src/` can be awkward; less visible for product/planning.

**Doc location:** `apps/api/.../endpoints/agent/doc/` or `apps/api/docs/agentforge/`.

---

### Option 5: Hybrid — root docs + small agentforge “brand” folder

- **Docs:** Single source of truth in `docs/agentforge/` (as in Option 3). Replace current `agentforge/doc/` with a single `agentforge/README.md` that points to `docs/agentforge/` and briefly describes the feature.
- **Code:** In API as in Option 1 or 2.
- **Pros:** Clean docs location plus a clear “AgentForge” entry point at `agentforge/`; good for open-source submission.

**Doc location:** `docs/agentforge/`; `agentforge/README.md` → “See docs/agentforge/”.

---

## Recommendation (from discussion)

- **Minimal churn:** Use **Option 1** — leave `agentforge/doc/` where it is and put all new agent code under `apps/api/src/app/endpoints/agent/`. Update `CLAUDE.md` to state that the AgentForge backend lives under `apps/api/src/app/endpoints/agent/`.
- **Scalable / reusable:** Use **Option 2** for code and **Option 3** for docs — add `libs/agentforge/` for the agent core and move the three planning files to `docs/agentforge/`, then update `CLAUDE.md` to point to both `docs/agentforge/` and `libs/agentforge/`.

---

## Option 2 in more detail

Option 2 was expanded as follows for implementation guidance.

### Principle

- **Library** (`libs/agentforge/`) = agent domain only: orchestration, tool contracts (schemas), verification, types. No NestJS, no Ghostfolio services.
- **API** = NestJS, HTTP, auth, and tool _implementations_ that call `PortfolioService`, `OrderService`, etc., and satisfy the library’s tool contracts.

### What lives where

| In **libs/agentforge** (framework-agnostic)                               | In **apps/api** (NestJS + Ghostfolio)                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Tool **schemas** (names, descriptions, JSON Schema params)                | Tool **implementations** that call PortfolioService, OrderService, etc.                    |
| Orchestrator / agent loop (e.g. LangChain runnable or small custom loop)  | `AgentForgeController` + `AgentForgeModule` that instantiate the agent and expose REST     |
| Verification **logic** (value cross-check, output validation, confidence) | User/session resolution, rate limiting, invoking verification with real tool results       |
| Types: `AgentConfig`, `ToolResult`, `VerificationResult`, etc.            | NestJS DI, guards, interceptors                                                            |
| Optional: eval **runner** (run dataset, compare to expected)              | Eval **data** and wiring (test user, seeded DB); invoking the runner from a script or test |
| No NestJS imports; no PortfolioService                                    | All Ghostfolio service calls                                                               |

### Suggested folder layout

**Library (`libs/agentforge/`):**

```
libs/agentforge/
├── src/
│   └── lib/
│       ├── agent/                    # Orchestrator
│       │   ├── agent.runner.ts
│       │   └── types.ts
│       ├── tools/
│       │   ├── definitions/           # Schemas only (no Ghostfolio)
│       │   │   ├── portfolio-analysis.tool.ts
│       │   │   ├── transaction-list.tool.ts
│       │   │   ├── market-data.tool.ts
│       │   │   ├── account-summary.tool.ts
│       │   │   ├── portfolio-performance.tool.ts
│       │   │   └── index.ts
│       │   └── tool-registry.ts
│       ├── verification/
│       │   ├── value-cross-check.ts
│       │   ├── output-validation.ts
│       │   └── types.ts
│       ├── memory/
│       │   └── types.ts               # Interface; implementation in API (e.g. Redis)
│       └── index.ts
├── doc/                               # Option 2A: docs inside the lib
│   ├── project-definition.md
│   ├── pre-search-checklist.md
│   └── pre-search-investigation-plan.md
├── README.md
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
└── jest.config.ts
```

**API layer (`apps/api/src/app/endpoints/agent/`):**

```
apps/api/src/app/endpoints/agent/
├── agentforge.module.ts
├── agentforge.controller.ts            # e.g. POST /api/v1/agent
├── agentforge.service.ts              # Builds agent, injects tool implementations
├── tools/
│   ├── portfolio-analysis.handler.ts
│   ├── transaction-list.handler.ts
│   ├── market-data.handler.ts
│   ├── account-summary.handler.ts
│   ├── portfolio-performance.handler.ts
│   └── index.ts
└── memory/
    └── redis-agent-memory.service.ts   # Optional
```

### Path alias and Nx

- In `tsconfig.base.json`, add: `"@ghostfolio/agentforge/*": ["libs/agentforge/src/lib/*"]`.
- API and tests import e.g. `@ghostfolio/agentforge/tools/definitions`, `@ghostfolio/agentforge/verification/value-cross-check`, `@ghostfolio/agentforge/agent/agent.runner`.
- Add `libs/agentforge/project.json` with `projectType: "library"`, `sourceRoot: "libs/agentforge/src"`, and targets for `lint` and `test` (similar to `libs/common`).

### Dependency direction

- **libs/agentforge** may depend on: `@ghostfolio/common`, LangChain (or chosen stack), Node/TypeScript only.
- **libs/agentforge** must **not** depend on: `apps/api`, NestJS, or any Ghostfolio-specific service. The API passes in tool implementations (e.g. functions that take `userId` + params and return `ToolResult`); those implementations live in the API and call PortfolioService, etc.

### Doc placement for Option 2

- **2A — Docs inside the lib:** Move the three planning files into `libs/agentforge/doc/`. Single “AgentForge” box (code + design).
- **2B — Docs at repo root:** Keep planning in `docs/agentforge/` (or keep `agentforge/doc/` at root); add `libs/agentforge/README.md` with architecture and “see docs/agentforge for planning”.

### Steps to adopt Option 2

1. Create `libs/agentforge/` with `src/lib/` and the subfolders above; add `project.json`, tsconfigs, Jest config; add path alias in `tsconfig.base.json`.
2. Implement agent core in the lib: tool definitions (schemas + types), agent runner that accepts tool handlers, verification modules.
3. Implement API surface: `AgentForgeModule`, `AgentForgeController`, one handler per tool in `endpoints/agent/tools/`, service that builds the agent and runs verification.
4. Move or link docs (2A or 2B) and update `CLAUDE.md` accordingly.
5. Add tests: lib = unit tests for verification and agent with mocked handlers; API = integration tests against the agent endpoint with test user and seeded data.

---

## Summary: Where to put the planning docs

| Option            | Location                                    | Best when                                                              |
| ----------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| Keep as-is        | `agentforge/doc/`                           | You like the current layout and don’t want to move files.              |
| Root docs         | `docs/agentforge/`                          | You want one standard `docs/` tree for the whole repo.                 |
| With library (2A) | `libs/agentforge/doc/`                      | You add an AgentForge Nx lib and want docs owned by that lib.          |
| Hybrid (2B)       | `docs/agentforge/` + `agentforge/README.md` | You want both a clear docs tree and a visible AgentForge “front door.” |

---

## Related documents

- `agentforge/doc/project-definition.md` — Full Gauntlet project requirements (MVP, evals, observability, verification).
- `agentforge/doc/pre-search-checklist.md` — Filled-in pre-search (finance, 5 tools, LangChain JS + LangSmith, verification types).
- `agentforge/doc/pre-search-investigation-plan.md` — Architecture and planning assumptions.
- `CLAUDE.md` (repo root) — Development setup and monorepo structure; references AgentForge extension and `agentforge/doc/`.
