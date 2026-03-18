# Implementation Plan: Single Family Office Platform Transformation

**Branch**: `001-family-office-transform` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-family-office-transform/spec.md`

## Summary

Transform the Ghostfolio portfolio management platform from a single-user investment tracker into a single family office platform. This adds entity management (trusts, LLCs, LPs, individuals), partnership tracking with ownership percentages and NAV valuations, distribution tracking with tax categorization, K-1/K-3 structured document management, private-market performance calculations (XIRR, TVPI, DPI, Modified Dietz), benchmark comparison overlays (S&P 500, bonds, real estate, CPI), and periodic consolidated reporting. The existing public-market portfolio tracking (accounts, orders, market data) is preserved and extended — entities become the new ownership layer above accounts and partnerships.

## Technical Context

**Language/Version**: TypeScript 5.9.2, Node.js ≥22.18.0
**Primary Dependencies**: NestJS 11.1.14 (API), Angular 21.1.1 + Angular Material 21.1.1 (client), Prisma 6.19.0 (ORM), Nx 22.5.3 (monorepo), big.js (decimal math), date-fns 4.1.0, chart.js 4.5.1, Bull 4.16.5 (job queues), Redis (caching), yahoo-finance2 3.13.2
**Storage**: PostgreSQL via Prisma ORM, Redis for caching, local filesystem for document uploads
**Testing**: Jest (via `@nx/jest`), jest-preset-angular for client tests, existing calculator specs in `apps/api/src/app/portfolio/calculator/roai/` (21 spec files)
**Target Platform**: Linux server (Docker), web browser (Angular SPA)
**Project Type**: Nx monorepo web application (API + Client + 2 shared libs)
**Performance Goals**: XIRR calculation < 5s for 4+ quarters, report generation < 15s, benchmark comparison < 10s
**Constraints**: Preserve all existing Ghostfolio functionality (accounts, orders, market data, public portfolio tracking); no breaking changes to existing API contracts
**Scale/Scope**: Single family office (1-5 admin users), ~50 entities/partnerships, ~500 distributions/year, ~100 K-1 documents

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**No constitution file exists** (`.specify/memory/constitution.md` not found). No gates to evaluate. Design proceeds with these self-imposed constraints derived from existing codebase patterns:

1. **Follow existing NestJS module pattern**: Controller + Service + Module per domain area, DTOs in `libs/common`, `PrismaService` for DB access (no repository pattern)
2. **Follow existing Angular standalone component pattern**: Standalone components with lazy-loaded routes, Angular Material, Ionicons, `takeUntilDestroyed` cleanup
3. **Use existing auth/guard stack**: `AuthGuard('jwt')` + `HasPermissionGuard` + `@HasPermission()` decorator
4. **Use existing exchange rate service**: `ExchangeRateDataService` for all currency conversions
5. **Use existing data provider service**: `DataProviderService` for benchmark market data
6. **Use Prisma migrations**: New models via `prisma migrate dev` with standard migration naming
7. **Shared types in `libs/common`**: All interfaces, DTOs, enums shared between API and client live in `@ghostfolio/common`
8. **Use `big.js` for financial math**: Consistent with existing calculator precision approach

**Post-Phase-1 Re-check**: Design adds 9 new Prisma models, 8 new enums, 5 new NestJS modules, 9 new Angular pages, 6 new UI components. All follow existing patterns. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-family-office-transform/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (REST API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                          # Extended with 9 new models, 8 new enums
└── migrations/
    └── YYYYMMDDHHMMSS_family_office_models/  # Single migration for all new models

apps/api/src/app/
├── entity/                                # NEW: Entity management module
│   ├── entity.controller.ts
│   ├── entity.service.ts
│   ├── entity.module.ts
│   └── interfaces/
├── partnership/                           # NEW: Partnership management module
│   ├── partnership.controller.ts
│   ├── partnership.service.ts
│   ├── partnership.module.ts
│   └── interfaces/
├── distribution/                          # NEW: Distribution tracking module
│   ├── distribution.controller.ts
│   ├── distribution.service.ts
│   ├── distribution.module.ts
│   └── interfaces/
├── k-document/                            # NEW: K-1/K-3 document module
│   ├── k-document.controller.ts
│   ├── k-document.service.ts
│   ├── k-document.module.ts
│   └── interfaces/
├── family-office/                         # NEW: Consolidated FO operations
│   ├── family-office.controller.ts
│   ├── family-office.service.ts
│   └── family-office.module.ts
├── portfolio/
│   └── calculator/
│       └── family-office/                 # NEW: Private market calculators
│           ├── performance-calculator.ts
│           └── performance-calculator.spec.ts
└── upload/                                # NEW: File upload module
    ├── upload.controller.ts
    ├── upload.service.ts
    └── upload.module.ts

apps/api/src/services/
└── benchmark/
    └── family-office-benchmark.service.ts # NEW: Benchmark comparison overlay

libs/common/src/lib/
├── dtos/                                  # NEW DTOs for all family office entities
├── interfaces/                            # NEW interfaces for FO domain
├── enums/                                 # NEW enums mirroring Prisma enums
└── permissions.ts                         # MODIFIED: Add FO permissions

apps/client/src/app/
├── pages/
│   ├── entities/                          # NEW: Entity list page
│   ├── entity-detail/                     # NEW: Entity detail + ownership view
│   ├── partnerships/                      # NEW: Partnership list page
│   ├── partnership-detail/                # NEW: Partnership detail + members/assets
│   ├── partnership-performance/           # NEW: Performance + benchmark comparison
│   ├── distributions/                     # NEW: Distribution tracking page
│   ├── k-documents/                       # NEW: K-1/K-3 management page
│   ├── family-dashboard/                  # NEW: Consolidated FO dashboard
│   └── reports/                           # NEW: Periodic report generation
└── services/
    └── family-office-data.service.ts      # NEW: API client for FO endpoints

libs/ui/src/lib/
├── entity-card/                           # NEW: Entity summary card component
├── partnership-table/                     # NEW: Partnership members table
├── distribution-chart/                    # NEW: Distribution visualization
├── performance-metrics/                   # NEW: IRR/TVPI/DPI display component
├── benchmark-comparison-chart/            # NEW: Multi-benchmark overlay chart
└── k-document-form/                       # NEW: K-1 structured data entry form
```

**Structure Decision**: Follows the existing Nx monorepo structure. New NestJS modules in `apps/api/src/app/`, new Angular pages in `apps/client/src/app/pages/`, shared types/DTOs in `libs/common/src/lib/`, reusable UI components in `libs/ui/src/lib/`. No new Nx projects — all new code fits within the existing 4-project structure (api, client, common, ui).

## Complexity Tracking

No constitution violations to justify — no constitution exists.
