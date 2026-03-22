# Implementation Plan: Family Office UI Redesign

**Branch**: `008-fo-ui-redesign` | **Date**: 2026-03-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-fo-ui-redesign/spec.md`

## Summary

Redesign the UI to surface existing family office data (K1 income, partnership performance, distributions) in the portfolio analysis view and restructure navigation around five family office-focused top-level items. The backend APIs and data services already exist — `FamilyOfficeService` computes portfolio summaries, asset class breakdowns, activity ledgers, and periodic reports, and `FamilyOfficeDataService` on the client has HTTP wrappers for all five endpoints. However, **zero Angular components consume the four richest endpoints** (portfolio-summary, asset-class-summary, activity, report). The work is primarily frontend: wire existing client-side data methods into the portfolio analysis page, restructure the header navigation into grouped menus, and enhance the existing family dashboard to be the default landing page.

## Technical Context

**Language/Version**: TypeScript 5.9.2, Node.js ≥22.18.0
**Primary Dependencies**: NestJS 11.1.14 (API), Angular 21.1.1 + Angular Material 21.1.1 (client), Prisma 6.19.0 (ORM), Nx 22.5.3 (monorepo), chart.js 4.5.1, date-fns 4.1.0, Bull 4.16.5 (queues), Redis (caching), Ionic 8.8.1
**Storage**: PostgreSQL via Prisma ORM, Redis for caching
**Testing**: Jest 30.2.0 (via `@nx/jest`), jest-preset-angular 16.0.0 for client tests
**Target Platform**: Linux server (Docker/Railway), web browser (Angular SPA)
**Project Type**: Nx monorepo web application (API + Client + 2 shared libs)
**Performance Goals**: Dashboard load < 5s, portfolio analysis with K1 data < 3s (SC-001, SC-005)
**Constraints**: Preserve all existing Ghostfolio functionality; all legacy URLs must keep working (SC-004); no breaking API changes
**Scale/Scope**: Single family office (1-5 users), ~50 entities/partnerships, ~100 K1 documents, 5 primary nav items

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| # | Constitution Principle | Status | Notes |
|---|---|---|---|
| I | Nx Monorepo Structure | **PASS** | All changes in existing 4 projects (api, client, common, ui). No new Nx projects. |
| II | NestJS Module Pattern | **PASS** | No new backend modules needed. Existing `FamilyOfficeModule` already exposes all required endpoints. Minor additions only if new aggregation endpoints are needed. |
| III | Prisma Data Layer | **PASS** | No schema changes required. All data models already exist. |
| IV | TypeScript Strict Conventions | **PASS** | Standard — no dead code, path aliases. |
| V | Simplicity First / YAGNI | **PASS** | This feature wires existing unused APIs into existing UI pages. No new abstractions. Maximum reuse of `FamilyOfficeDataService` methods already built. |
| VI | Interface-First Design | **PASS** | All interfaces already defined in `@ghostfolio/common` (`IFamilyOfficeDashboard`, `IPortfolioSummary`, `IAssetClassSummary`, `IActivityDetail`, `IFamilyOfficeReport`). |

**Pre-Phase 0 Gate**: All 6 principles PASS. No violations.

**Post-Phase 1 Re-check**:

| # | Constitution Principle | Status | Notes |
|---|---|---|---|
| I | Nx Monorepo Structure | **PASS** | All changes within existing 4 projects. 3 new components in `libs/ui`, modifications to `apps/client` pages and header. No new Nx projects. |
| II | NestJS Module Pattern | **PASS** | No backend changes required. All API endpoints already exist in `FamilyOfficeModule`. |
| III | Prisma Data Layer | **PASS** | No schema changes. No new migrations. |
| IV | TypeScript Strict Conventions | **PASS** | All new code follows strict mode. Path aliases used consistently. |
| V | Simplicity First / YAGNI | **PASS** | Feature wires 4 existing unused API endpoints to UI components. 3 new small UI components (k1-income-summary, nav-menu-group, performance-metrics-card). No new abstractions or architectural layers. Maximum reuse of existing `FamilyOfficeDataService` and `libs/ui` components. |
| VI | Interface-First Design | **PASS** | All interfaces already defined in `@ghostfolio/common` (`IFamilyOfficeDashboard`, `IPortfolioSummary`, `IAssetClassSummary`, `IActivityDetail`, `IFamilyOfficeReport`). No new shared interfaces needed. |

**Post-Phase 1 Gate**: All 6 principles PASS. Design adds 3 new `libs/ui` components and modifies 6 existing files. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-fo-ui-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (navigation contract, analysis data shape)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/client/src/app/
├── components/
│   └── header/
│       ├── header.component.ts            # MODIFIED: Restructure nav to 5 grouped items
│       └── header.component.html          # MODIFIED: New nav template with submenus
├── pages/
│   ├── portfolio/
│   │   └── analysis/
│   │       ├── analysis-page.component.ts # MODIFIED: Add FO data integration
│   │       └── analysis-page.component.html # MODIFIED: Add K1 income sections
│   ├── family-dashboard/
│   │   ├── dashboard-page.component.ts    # MODIFIED: Add portfolio summary, K1 income cards
│   │   └── dashboard-page.component.html  # MODIFIED: Enhanced dashboard layout
│   └── home/
│       └── home-page.routes.ts            # MODIFIED: Default redirect to family-dashboard
├── services/
│   └── family-office-data.service.ts      # EXISTING: Already has all HTTP methods, no changes
└── app.routes.ts                          # MODIFIED: Update default route

libs/ui/src/lib/
├── k1-income-summary/                     # NEW: Reusable K1 income breakdown card
│   ├── k1-income-summary.component.ts
│   └── k1-income-summary.component.html
├── performance-metrics-card/              # NEW: Reusable IRR/TVPI/DPI/RVPI card
│   ├── performance-metrics-card.component.ts
│   └── performance-metrics-card.component.html
└── nav-menu-group/                        # NEW: Grouped nav item with expandable submenu
    ├── nav-menu-group.component.ts
    └── nav-menu-group.component.html
```

**Structure Decision**: Follows the existing Nx monorepo structure. This is primarily a frontend feature — modifying existing Angular pages (portfolio analysis, family dashboard, header) and adding 3 small reusable UI components in `libs/ui`. No new NestJS modules, no Prisma schema changes, no new Nx projects. All within the existing 4-project structure (api, client, common, ui).

## Complexity Tracking

No constitution violations to justify — all 6 principles pass.
