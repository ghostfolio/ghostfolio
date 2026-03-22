# Data Model: Family Office UI Redesign

**Feature**: 008-fo-ui-redesign
**Date**: 2026-03-22

## Overview

This feature requires **no new database models or schema changes**. All data entities already exist in the Prisma schema from the 001-family-office-transform feature. The "data model" for this feature is the **UI state model** — the shapes of data flowing from existing API endpoints to new/modified Angular components.

## Existing Entities (No Changes)

These Prisma models already exist and power the family office API endpoints:

| Entity | Prisma Model | Key Fields | Used By |
|---|---|---|---|
| Entity | `Entity` | id, name, type (INDIVIDUAL/TRUST/LLC/LP/CORPORATION), taxId | Dashboard allocations, Portfolio Summary |
| Partnership | `Partnership` | id, name, ein, entityId, currentValuation | Dashboard AUM, Performance metrics |
| Distribution | `Distribution` | id, partnershipId, entityId, amount, date, type | Dashboard recent distributions |
| K1 Document | `KDocument` | id, partnershipId, taxYear, filingStatus, normalizedData | K1 filing status, Activity ledger |
| K1 Box Definition | `K1BoxDefinition` | id, formType, boxNumber, description, dataType | K1 parsing, Cell Mapping page |
| Valuation | `Valuation` | id, partnershipId, value, quarter, year | AUM calculation |
| Partner Performance | `PartnerPerformance` | id, partnershipId, irr, tvpi, dpi, rvpi | Performance metrics |

## UI State Models (Data Flow)

These are the TypeScript interfaces already defined in `@ghostfolio/common` that flow from API to UI. No new interfaces are needed.

### Dashboard State

```
IFamilyOfficeDashboard (existing, from GET /family-office/dashboard)
├── totalAum: number
├── currency: string
├── entitiesCount: number
├── partnershipsCount: number
├── allocationByEntity[]: { entityId, entityName, value, percentage }
├── allocationByAssetClass[]: { assetClass, value, percentage }
├── allocationByStructure[]: { structureType, value, percentage }
├── recentDistributions[]: { id, partnershipName, amount, date, type }
└── kDocumentStatus: { taxYear, total, draft, estimated, final }
```

### Portfolio Summary State (currently unused by any component)

```
IPortfolioSummary (existing, from GET /family-office/portfolio-summary)
├── entities[]: IEntityPerformanceRow
│   ├── entityId, entityName
│   ├── originalCommitment, percentCalled, unfundedCommitment
│   ├── paidIn, distributions, residualUsed
│   └── dpi, rvpi, tvpi, irr
├── totals: IPerformanceRow (same fields without entity identifiers)
├── valuationYear: number
└── quarter?: number
```

### Asset Class Summary State (currently unused by any component)

```
IAssetClassSummary (existing, from GET /family-office/asset-class-summary)
├── assetClasses[]: IAssetClassPerformanceRow
│   ├── assetClass, assetClassLabel
│   ├── originalCommitment, percentCalled, unfundedCommitment
│   ├── paidIn, distributions, residualUsed
│   └── dpi, rvpi, tvpi, irr
├── totals: IPerformanceRow
├── valuationYear: number
└── quarter?: number
```

### Activity Ledger State (currently unused by any component)

```
IActivityDetail (existing, from GET /family-office/activity)
├── rows[]: IActivityRow
│   ├── year, entityId, entityName, partnershipId, partnershipName
│   ├── beginningBasis, contributions
│   ├── interest, dividends, capitalGains, remainingK1IncomeDed
│   ├── totalIncome, distributions
│   ├── otherAdjustments, endingTaxBasis
│   ├── endingGLBalance, bookToTaxAdj
│   ├── endingK1CapitalAccount, k1CapitalVsTaxBasisDiff
│   ├── excessDistribution, negativeBasis, deltaEndingBasis
│   └── notes
├── totalCount: number
└── filters: { entities[], partnerships[], years[] }
```

### Report State (currently unused by any component)

```
IFamilyOfficeReport (existing, from GET /family-office/report)
├── reportTitle: string
├── period: { start, end }
├── entity?: { id, name }
├── summary: { totalValueStart, totalValueEnd, periodChange, periodChangePercent, ytdChangePercent }
├── assetAllocation: Record<string, { value, percentage }>
├── partnershipPerformance[]: { partnershipId, partnershipName, periodReturn, irr, tvpi, dpi }
├── distributionSummary: { periodTotal, byType: Record<string, number> }
└── benchmarkComparisons?[]: { id, name, periodReturn, excessReturn?, ytdReturn? }
```

## State Transitions

### Navigation State

```
Current: 11+ flat nav items → Target: 5 grouped items
┌─────────────────────────────────────────────┐
│  Dashboard │ Partnerships ▼ │ K-1 Center ▼ │ Analysis │ Admin ▼ │
│            │  Entities      │  K-1 Import   │          │  Admin Ctrl │
│            │  Partnerships  │  K-1 Documents│          │  Accounts   │
│            │  Distributions │  Cell Mapping │          │  Resources  │
│            │  Portf. Views  │               │          │  Pricing    │
│            │                │               │          │  Legacy ▸   │
└─────────────────────────────────────────────┘
```

### Default Route State

```
Current: /** → /home → GfHomeOverviewComponent (stock portfolio overview)
Target:  /** → /family-office → Dashboard (FO dashboard with AUM + allocations)
```

### Portfolio Analysis Page State

```
Current data flow:
  DataService.fetchPortfolioPerformance() → performance cards
  DataService.fetchPortfolioHoldings() → top/bottom 3
  DataService.fetchDividends() → dividend chart
  DataService.fetchInvestments() → investment chart

Target data flow (additions):
  FamilyOfficeDataService.fetchPortfolioSummary() → entity performance table + totals
  FamilyOfficeDataService.fetchAssetClassSummary() → asset class breakdown
  FamilyOfficeDataService.fetchActivity() → K1 income summary card
```

## Validation Rules

No new validation rules for this feature. All validation is already handled by the existing API endpoints and DTOs.
