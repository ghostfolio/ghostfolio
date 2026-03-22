# Analysis Page Data Contract: Family Office UI Redesign

**Feature**: 008-fo-ui-redesign
**Date**: 2026-03-22

## Overview

The portfolio analysis page (`/portfolio/analysis`) currently displays only traditional Ghostfolio portfolio data. This contract defines what family office data MUST be added to the page.

## Existing Data (Preserved)

These data sources remain unchanged — they power the existing analysis widgets:

| Data | Source | Widget |
|---|---|---|
| Portfolio performance | `DataService.fetchPortfolioPerformance()` | Summary cards, benchmark chart |
| Holdings top/bottom 3 | `DataService.fetchPortfolioHoldings()` | Top 3 / Bottom 3 cards |
| Dividends | `DataService.fetchDividends()` | Dividend timeline chart |
| Investments | `DataService.fetchInvestments()` | Investment timeline chart |
| Benchmark | `DataService.fetchBenchmarkForUser()` | Benchmark comparator |

## New Data (Family Office Integration)

These data sources MUST be added to the analysis page:

### 1. Portfolio Summary Metrics

**Source**: `FamilyOfficeDataService.fetchPortfolioSummary()`
**Returns**: `IPortfolioSummary`

**Display contract**:
- A summary card showing **totals**: IRR, TVPI, DPI, RVPI
- A table showing **per-entity** breakdown: entity name, original commitment, % called, unfunded, paid-in, distributions, IRR, TVPI, DPI

**Empty state**: If response has no entities or totals are all zero, show a card that says "No partnership data available. Import a K-1 to get started." with a link to `/k1-import`.

### 2. Asset Class Breakdown

**Source**: `FamilyOfficeDataService.fetchAssetClassSummary()`
**Returns**: `IAssetClassSummary`

**Display contract**:
- A table showing **per-asset-class** breakdown: asset class label, original commitment, paid-in, distributions, IRR, TVPI, DPI

**Empty state**: Hidden if no data (less critical than entity breakdown).

### 3. K1 Income Summary

**Source**: `FamilyOfficeDataService.fetchActivity()`
**Returns**: `IActivityDetail`

**Display contract**:
- A summary card aggregating across all activity rows for the most recent tax year:
  - Total Ordinary Income (interest + dividends + remainingK1IncomeDed)
  - Total Capital Gains (capitalGains field)
  - Total Distributions (distributions field)
  - Total Other Adjustments (otherAdjustments field)
- Each category shows the dollar amount
- Zero values displayed as $0 (not hidden), per spec acceptance scenario 3

**Empty state**: If no activity rows, show "No K-1 income data available. Import a K-1 to get started." with link to `/k1-import`.

## Section Ordering

The analysis page sections MUST appear in this order:

1. **(Existing)** Summary cards (total amount, change, performance %)
2. **(Existing)** Benchmark comparator
3. **NEW**: Family Office Performance Metrics (IRR/TVPI/DPI/RVPI totals + entity table)
4. **NEW**: K1 Income Summary (income categories card)
5. **(Existing)** Performance breakdown (asset/currency/net)
6. **NEW**: Asset Class Breakdown (table)
7. **(Existing)** Top 3 / Bottom 3 holdings
8. **(Existing)** Portfolio evolution chart
9. **(Existing)** Investment timeline chart
10. **(Existing)** Dividend timeline chart

## Conditional Rendering

All new sections (3, 4, 6) MUST be gated behind a check for family office data availability:
- If `IPortfolioSummary.entities` is empty AND `IActivityDetail.rows` is empty → show a single "Import K-1 data" guide card instead of the three empty sections
- If any one section has data, show it; hide only the specific sections with no data (except K1 Income which always shows $0 values)
