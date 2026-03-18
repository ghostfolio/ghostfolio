# Implementation Plan: Portfolio Performance Views

**Branch**: `003-portfolio-performance-views` | **Date**: 2026-03-16 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-portfolio-performance-views/spec.md`

## Summary

Add three portfolio performance views — Portfolio Summary (entity rollups), Asset Class Summary, and Activity Detail — as a tabbed page accessible from main navigation. The backend extends the existing `FamilyOfficeService` with new aggregation endpoints; the frontend adds a new page with three tab views using Angular Material tables. Leverages the existing `FamilyOfficePerformanceCalculator` for XIRR/TVPI/DPI/RVPI computations and the existing `GfPerformanceMetricsComponent` display patterns.

## Technical Context

**Language/Version**: TypeScript 5.9.2, Node.js >= 22.18.0
**Primary Dependencies**: Angular 21.1.1, NestJS 11.1.14, Angular Material 21.1.1, Prisma 6.19.0, big.js, date-fns 4.1.0
**Storage**: PostgreSQL via Prisma ORM
**Testing**: Jest 30.2.0, ts-jest, jest-preset-angular
**Target Platform**: Web (NestJS serves Angular build), NX 22.5.3 monorepo
**Project Type**: Full-stack web application (Angular + NestJS)
**Performance Goals**: Summary views < 3s load, Activity filtering < 2s (per SC-001/002/003)
**Constraints**: Accounting-format numbers (parentheses for negatives, comma separators), ratios accurate to 0.01 tolerance
**Scale/Scope**: Family office with 4 entities, ~50+ partnerships, multi-year activity data (~200+ rows)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

No constitution file exists at `.specify/memory/constitution.md`. Gate is open — no constraints to evaluate. Will re-check after Phase 1 design if constitution is created.

## Project Structure

### Documentation (this feature)

```text
specs/003-portfolio-performance-views/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/api/src/app/
├── family-office/
│   ├── family-office.controller.ts    # MODIFY: add 3 new endpoints
│   ├── family-office.service.ts       # MODIFY: add aggregation methods
│   └── family-office.module.ts        # MODIFY: if new providers needed
├── portfolio/calculator/family-office/
│   └── performance-calculator.ts      # REUSE: existing XIRR/TVPI/DPI/RVPI

apps/client/src/app/
├── pages/
│   └── portfolio-performance/         # NEW: tabbed page
│       ├── portfolio-performance-page.component.ts
│       ├── portfolio-performance-page.html
│       ├── portfolio-performance-page.scss
│       └── portfolio-performance-page.routes.ts
├── services/
│   └── family-office-data.service.ts  # MODIFY: add 3 new fetch methods
└── app.routes.ts                      # MODIFY: add route

libs/common/src/lib/
├── interfaces/
│   └── family-office.interface.ts     # MODIFY: add 3 new response interfaces
└── enums/
    └── family-office.ts               # POTENTIALLY MODIFY: asset type mappings

libs/ui/src/lib/
├── performance-metrics/               # REUSE: existing component
└── (no new UI lib components expected — tables are page-specific)
```

**Structure Decision**: NX monorepo with `apps/api` (NestJS), `apps/client` (Angular), `libs/common` (shared interfaces/types), `libs/ui` (shared components). New page follows existing patterns from `family-dashboard`, `reports`, and `partnership-performance` pages. API extends existing `family-office` module.

## Complexity Tracking

> No constitution violations to track.
