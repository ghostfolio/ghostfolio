# Implementation Plan: FMV Portfolio View with Plaid Account Linking & Asset Drill-Down

**Branch**: `009-fmv-plaid-drilldown` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-fmv-plaid-drilldown/spec.md`

## Summary

Restore 7 admin-gated portfolio features (Overview, Holdings, Summary, Markets, Watchlist, FIRE, X-Ray) for all authenticated users by moving them out of the `accessAdminControl` nav gate. Add an FMV Dashboard page aggregating account values (reusing existing `getAccountsWithAggregations()` API). Wire account cards to the existing account-detail-dialog for asset drill-down. Integrate Plaid for automated brokerage account linking and ongoing investment sync via a new `PlaidItem` model, NestJS Plaid module, `@plaid/link-initialize` Angular client, and a BullMQ sync queue.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**: Angular 21+ (standalone components, signals), NestJS 11+ (module-based DI), Prisma ORM, `plaid` v41+ (Node SDK), `@plaid/link-initialize` (client), `@nestjs/bull` (BullMQ)  
**Storage**: PostgreSQL (Docker port 5434→5432), Redis (Docker port 6379→6379)  
**Testing**: Jest (unit + integration)  
**Target Platform**: Web application (server: Node.js, client: SPA)  
**Project Type**: Nx monorepo web-service + SPA (apps: `api`, `client`; libs: `common`, `ui`)  
**Performance Goals**: FMV Dashboard < 3s load, drill-down < 2 clicks, Plaid Link < 2 min, 50 holdings load < 5s  
**Constraints**: Plaid rate limit 100 req/min (production), access tokens encrypted at rest (AES-256-GCM)  
**Scale/Scope**: Single-tenant family office, ~5 accounts, ~50 holdings, 1 user

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|---|---|---|
| **I. Nx Monorepo Structure** | PASS | All changes within existing `api`, `client`, `common` projects. No new Nx projects. |
| **II. NestJS Module Pattern** | PASS | New `PlaidModule` follows module/controller/service pattern. Queue follows existing `DataGatheringModule` pattern. |
| **III. Prisma Data Layer** | PASS | New `PlaidItem` model + `Account` extension via Prisma migration. No direct SQL. |
| **IV. TypeScript Strict** | PASS | All code under strict mode, path aliases used. |
| **V. Simplicity First** | PASS | US1 is nav-only (no API changes). US2/US3 reuse existing API endpoints. US4/US5 add new module only where needed. Max 3 projects touched: `api`, `client`, `common`. |
| **VI. Interface-First Design** | PASS | Contracts defined in `contracts/` before implementation. Shared types in `@ghostfolio/common`. |
| **Max 3 Nx projects per feature** | PASS | `api` (Plaid module, migration), `client` (FMV page, nav changes), `common` (shared interfaces). No `ui` lib changes needed. |

**Post-Phase 1 Re-Check**: PASS — No violations introduced during design. PlaidItem model is minimal. Existing APIs reused for FMV/drill-down. One new NestJS module for Plaid.

## Project Structure

### Documentation (this feature)

```text
specs/009-fmv-plaid-drilldown/
├── plan.md              # This file
├── research.md          # Phase 0 output — 8 research decisions
├── data-model.md        # Phase 1 output — PlaidItem model, Account extensions
├── quickstart.md        # Phase 1 output — setup & verification steps
├── contracts/           # Phase 1 output — API contracts
│   ├── plaid-api.md     # 7 Plaid endpoints
│   └── navigation-fmv.md # Nav restructure + existing endpoint usage
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/api/src/
├── app/
│   ├── plaid/                          # NEW — NestJS Plaid module
│   │   ├── plaid.module.ts             # Module registering providers, imports
│   │   ├── plaid.controller.ts         # HTTP endpoints (link-token, exchange, sync, webhook)
│   │   ├── plaid.service.ts            # Business logic (Plaid API calls, token encryption)
│   │   └── interfaces/                 # Request/response DTOs
│   │       ├── create-link-token.interface.ts
│   │       └── exchange-token.interface.ts
│   └── ...existing modules unchanged
├── services/
│   ├── queues/
│   │   └── plaid-sync/                 # NEW — BullMQ queue for Plaid sync
│   │       ├── plaid-sync.module.ts
│   │       ├── plaid-sync.processor.ts # @Processor — handles SYNC_INVESTMENTS jobs
│   │       └── plaid-sync.service.ts   # Queue service — addJobToQueue
│   └── ...existing services unchanged

apps/client/src/
├── app/
│   ├── components/
│   │   └── header/
│   │       ├── header.component.html   # MODIFIED — nav restructure (move legacy items)
│   │       └── header.component.ts     # MODIFIED — new menu arrays
│   ├── pages/
│   │   └── fmv/                        # NEW — FMV Dashboard page
│   │       ├── fmv-page.component.ts   # Standalone component
│   │       ├── fmv-page.component.html # Hero total + account cards
│   │       └── fmv-page.routes.ts      # Route definitions
│   └── services/
│       └── plaid-link.service.ts       # NEW — Angular service wrapping @plaid/link-initialize

libs/common/src/lib/
├── interfaces/
│   └── plaid-item.interface.ts         # NEW — shared PlaidItem type
├── config.ts                           # MODIFIED — PLAID_SYNC_QUEUE constant
└── permissions.ts                      # UNCHANGED (no permission changes needed)

prisma/
├── schema.prisma                       # MODIFIED — PlaidItem model, Account extensions
└── migrations/
    └── YYYYMMDD_add_plaid_item/        # NEW — migration for PlaidItem + Account fields
```

**Structure Decision**: Follows existing Nx monorepo conventions. Changes span 3 projects (`api`, `client`, `common`) which is within the 3-project maximum. New `plaid/` module in API mirrors existing module structure (e.g., `account/`, `portfolio/`). New `plaid-sync/` queue mirrors existing `data-gathering/` queue. New `fmv/` page follows existing page pattern (e.g., `accounts/`, `home/`).

## Complexity Tracking

> No violations — all gates pass. Feature uses 3 Nx projects (maximum) and follows established patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| _(none)_ | — | — |
