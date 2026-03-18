# Quickstart: Portfolio Performance Views

**Feature**: 003-portfolio-performance-views
**Date**: 2026-03-16

## Overview

This feature adds three analytical views to the portfolio management application:

1. **Portfolio Summary** — Entity-level rollup of financial performance metrics
2. **Asset Class Summary** — Same metrics grouped by asset class
3. **Activity Detail** — Transaction-level ledger with tax basis tracking

All three views live on a single tabbed page at route `/portfolio-views`.

## Architecture

```
┌─────────────────────────────────┐
│  Angular Client                 │
│  /portfolio-views               │
│  ┌─────┐ ┌───────┐ ┌────────┐  │
│  │Tab 1│ │Tab 2  │ │Tab 3   │  │
│  │Port.│ │Asset  │ │Activity│  │
│  │Summ.│ │Class  │ │Detail  │  │
│  └──┬──┘ └──┬────┘ └──┬─────┘  │
│     │       │          │        │
│  FamilyOfficeDataService        │
│     │       │          │        │
└─────┼───────┼──────────┼────────┘
      │       │          │
      ▼       ▼          ▼
┌─────────────────────────────────┐
│  NestJS API                     │
│  FamilyOfficeController         │
│  GET /portfolio-summary         │
│  GET /asset-class-summary       │
│  GET /activity                  │
│     │                           │
│  FamilyOfficeService            │
│     │                           │
│  FamilyOfficePerformanceCalc    │
│  (existing XIRR/TVPI/DPI/RVPI) │
│     │                           │
│  PrismaService → PostgreSQL     │
└─────────────────────────────────┘
```

## Key Decisions

| # | Decision | See |
|---|---|---|
| R-001 | Reuse existing XIRR calculator with merged cash flows | [research.md](research.md#r-001) |
| R-002 | Asset class = majority PartnershipAsset.assetType | [research.md](research.md#r-002) |
| R-003 | Extend K1Data JSON with tax basis fields | [research.md](research.md#r-003) |
| R-004 | New `/portfolio-views` page with 3 Material tabs | [research.md](research.md#r-004) |
| R-005 | Custom Angular pipe for accounting number format | [research.md](research.md#r-005) |
| R-006 | Page-level valuation year filter | [research.md](research.md#r-006) |

## Data Flow

### Portfolio Summary / Asset Class Summary

```
1. Client selects valuation year (default: current year)
2. GET /family-office/portfolio-summary?valuationYear=2025
3. Backend:
   a. Load all user entities with active memberships
   b. For each entity, for each membership:
      - Sum capitalCommitment → Original Commitment
      - Sum capitalContributed → Paid-In
      - Load latest NAV ≤ year-end × ownershipPercent → Residual
      - Load distributions ≤ year-end → Distributions
      - Build dated cash flows (contributions, distributions, terminal NAV)
   c. Per entity: compute DPI, RVPI, TVPI, XIRR from aggregated flows
   d. Compute "All Entities" totals row
4. Return IPortfolioSummary
5. Client renders mat-table with accounting format pipe
```

Asset Class Summary follows the same flow but groups by partnership's dominant asset type instead of entity.

### Activity Detail

```
1. Client optionally selects entity, partnership, year filters
2. GET /family-office/activity?entityId=...&year=2024&skip=0&take=50
3. Backend:
   a. Find all (entity, partnership, year) combinations from:
      - PartnershipMembership (entity-partnership links)
      - KDocument (partnership-year income data)
      - Distribution (entity-partnership dated amounts)
   b. For each combination:
      - Pull K1Data fields → income components
      - Pull extended fields → tax basis
      - Sum distributions for that year
      - Compute derived fields (totalIncome, excessDistribution, etc.)
   c. Apply filters, paginate
4. Return IActivityDetail with filter options
5. Client renders mat-table with conditional row highlighting
```

## Files to Create/Modify

### New Files

| File | Purpose |
|---|---|
| `apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts` | Main tabbed page |
| `apps/client/src/app/pages/portfolio-views/portfolio-views-page.html` | Template with 3 tabs |
| `apps/client/src/app/pages/portfolio-views/portfolio-views-page.scss` | Styles |
| `apps/client/src/app/pages/portfolio-views/portfolio-views-page.routes.ts` | Route config |
| `apps/client/src/app/pipes/accounting-number.pipe.ts` | Custom number format pipe |

### Modified Files

| File | Changes |
|---|---|
| `apps/api/src/app/family-office/family-office.controller.ts` | Add 3 new GET endpoints |
| `apps/api/src/app/family-office/family-office.service.ts` | Add `getPortfolioSummary()`, `getAssetClassSummary()`, `getActivity()` |
| `apps/client/src/app/services/family-office-data.service.ts` | Add 3 new fetch methods |
| `apps/client/src/app/app.routes.ts` | Add `portfolio-views` route |
| `libs/common/src/lib/interfaces/family-office.interface.ts` | Add response interfaces |
| `libs/common/src/lib/interfaces/k-document.interface.ts` | Extend K1Data with tax basis fields |

### Reused (no changes)

| File | What's Reused |
|---|---|
| `apps/api/src/app/portfolio/calculator/family-office/performance-calculator.ts` | XIRR, TVPI, DPI, RVPI computations |
| `libs/ui/src/lib/performance-metrics/` | Metric display patterns (reference for styling) |

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit (API) | `getPortfolioSummary()` aggregation logic | Jest: mock Prisma, verify metric calculations match expected values |
| Unit (API) | `getAssetClassSummary()` grouping | Jest: verify partnerships correctly grouped by asset type |
| Unit (API) | `getActivity()` K1Data → Activity row mapping | Jest: verify all derived fields computed correctly |
| Unit (Client) | Accounting number pipe | Jest: verify "(1,000)", "1,000,000", "-" formatting |
| Integration | API endpoints return correct response shapes | Jest: hit endpoints with test data, verify IPortfolioSummary/etc. shapes |
| E2E | Tab navigation and data display | Manual or Playwright: navigate to /portfolio-views, switch tabs, verify data |

## Dependencies on Existing Code

- `FamilyOfficePerformanceCalculator` — Must remain stable (no breaking changes)
- `FamilyOfficeService.getUserPartnerships()` — Existing private method for scoping by user/entity
- `PrismaService` — All database access
- `AuthGuard` — Route protection
- `permissions.readEntity` — Endpoint authorization
- `FamilyOfficeAssetType` enum — Asset class categorization
- `K1Data` interface — Extended but backward-compatible
