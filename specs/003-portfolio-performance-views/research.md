# Research: Portfolio Performance Views

**Feature**: 003-portfolio-performance-views
**Date**: 2026-03-16

## Decision Log

### R-001: XIRR Aggregation Strategy

**Decision**: Reuse existing `FamilyOfficePerformanceCalculator.computeXIRR()` with concatenated cash flows for entity-level and asset-class-level aggregation.

**Rationale**: The `CashFlow` interface is `{ amount: number, date: Date }` with no partnership identifier — cash flows from multiple partnerships can be freely merged into a single array. The calculator already handles sorting by date and Newton-Raphson iteration. For entity-level XIRR, collect all cash flows across the entity's partnerships (scaled by `ownershipPercent`), add a terminal NAV entry, and pass to `computeXIRR()`. For asset-class-level XIRR, group partnerships by their dominant `FamilyOfficeAssetType` and do the same.

**Alternatives considered**:
- Weighted average of per-partnership IRRs — rejected because IRR is not linearly composable; time-weighting doesn't produce a correct aggregate.
- New calculator class — rejected because the existing one handles the computation correctly with no modification needed.

### R-002: Asset Class Determination for Partnerships

**Decision**: Determine a partnership's asset class from the majority `FamilyOfficeAssetType` of its `PartnershipAsset` records. If no assets exist, default to `OTHER`.

**Rationale**: The `PartnershipAsset.assetType` field is already populated per the existing data model. Most partnerships have a dominant asset type. The spec's asset class categories (Real Estate, Venture Capital, Private Equity, Hedge Fund, Credit, Co-Investment, Infrastructure, Natural Resources, Other) map to `FamilyOfficeAssetType` enum values.

**Mapping from spec categories to existing enum**:

| Spec Category | FamilyOfficeAssetType | Notes |
|---|---|---|
| Real Estate | `REAL_ESTATE` | Direct match |
| Venture Capital | `VENTURE_CAPITAL` | Direct match |
| Private Equity | `PRIVATE_EQUITY` | Direct match |
| Hedge Fund | `HEDGE_FUND` | Direct match |
| Credit | `FIXED_INCOME` | Closest existing match |
| Co-Investment | `PRIVATE_EQUITY` | Co-investments are typically PE deals |
| Infrastructure | `OTHER` | No dedicated enum value; consider adding `INFRASTRUCTURE` |
| Natural Resources | `COMMODITY` | Closest existing match |
| Other | `OTHER` | Direct match |

**Alternatives considered**:
- Adding new enum values (INFRASTRUCTURE, CO_INVESTMENT, CREDIT, NATURAL_RESOURCES) — viable but requires Prisma migration and enum update; can be a Phase 2 enhancement.
- Using `Partnership.type` instead of asset-level classification — rejected because `PartnershipType` (LP, GP, LLC, etc.) is structure-based, not asset-class-based.

### R-003: Tax Basis & Activity Data Architecture

**Decision**: Extend `KDocument.data` JSON schema with additional fields for tax basis tracking, and compute derived fields at query time.

**Rationale**: The existing `K1Data` interface stores K-1 box values (interest, dividends, capital gains, deductions, distributions) but lacks tax basis and GL balance fields. The Activity view needs: Beginning Basis, Ending Tax Basis, Ending GL Balance Per Books, K-1 Capital Account, and Other Adjustments. These are typically manually entered from K-1 Schedule L and the firm's general ledger — they are not derivable from existing data.

**Storage approach**: Extend the `K1Data` interface with optional fields:
- `beginningBasis: number` (prior year ending basis, can be auto-populated from previous year's ending)
- `endingTaxBasis: number` (computed or manually entered)
- `endingGLBalance: number` (from GL, manually entered)
- `k1CapitalAccount: number` (from K-1 Schedule L, manually entered)
- `otherAdjustments: number` (IRS form Box 18c or similar adjustments)
- `notes: string` (e.g., "AJE Completed")

**Fields derived at query time** (no storage needed):
- `totalIncome` = interest + dividends + capitalGains + remainingK1IncomeDed
- `bookToTaxAdj` = endingGLBalance − endingTaxBasis
- `k1CapitalVsTaxBasisDiff` = k1CapitalAccount − endingTaxBasis
- `excessDistribution` = max(0, distributions − (beginningBasis + contributions + totalIncome))
- `negativeBasis` = endingTaxBasis < 0
- `deltaEndingBasis` = endingTaxBasis − beginningBasis (from prior year)

**Alternatives considered**:
- New `TaxBasisRecord` model — rejected to avoid schema migration complexity; the JSON column is already flexible and the data is naturally part of the K-1 document context.
- Pure computation from existing data — rejected because GL balance and K-1 capital account are external inputs not derivable from existing fields.

### R-004: Page Architecture — New Page vs. Repurpose

**Decision**: Create a new `/portfolio-views` page with three Material tabs, accessible from main navigation.

**Rationale**: The existing pages serve different purposes:
- `/home` — Ghostfolio's original portfolio overview (public market holdings)
- `/family-office` — High-level dashboard (AUM, allocations, recent distributions)
- `/reports` — Period-specific reporting with benchmarks
- `/portfolio` — Ghostfolio analysis (allocations, FIRE, X-Ray)

None of these naturally accommodate three wide data tables. The new page provides a dedicated analytical workspace matching the CSV-based views the user needs. Tab-based navigation between the three views keeps them co-located.

**Alternatives considered**:
- Repurpose `/family-office` dashboard — rejected because the dashboard serves a different purpose (at-a-glance summary) and would become cluttered.
- Add tabs to `/reports` — rejected because reports are period/benchmark-focused while these views are standing data tables.
- Repurpose `/home` overview — rejected because `/home` is the original Ghostfolio functionality.

### R-005: Accounting Number Format

**Decision**: Use a shared Angular pipe for accounting-format numbers: comma separators, parentheses for negatives, dashes for zero.

**Rationale**: The CSV attachments show consistent formatting: `"1,000,000"` for positive, `"(355,885)"` for negative, `"-"` for zero. A custom pipe (or extending an existing one) keeps formatting consistent across all three views and is reusable for future features.

**Alternatives considered**:
- Inline formatting in each component — rejected due to duplication.
- Using Angular's built-in `CurrencyPipe` — rejected because it uses minus signs (not parentheses) and doesn't support the dash-for-zero convention.

### R-006: Valuation Year Filter

**Decision**: Implement as a year dropdown at the page level, defaulting to current year. Filters data for Portfolio Summary and Asset Class Summary to valuations/distributions through year-end. Activity view uses year as a row filter.

**Rationale**: The CSV references "Valuation Year from IRR Helper!B2" — this is a single global parameter that controls which year-end data the summaries use. Implementing at the page level means one filter controls all three tabs, matching the spreadsheet behavior.

**Alternatives considered**:
- Per-tab year filters — rejected for complexity and divergence from the spreadsheet model.
- No year filter (always latest) — rejected because the spec explicitly requires it (FR-006).

### R-007: Activity View Data Source

**Decision**: Build activity rows by joining `PartnershipMembership`, `Distribution`, and `KDocument` data per entity-partnership-year combination.

**Rationale**: The Activity CSV has one row per entity-partnership-year with data from three sources:
1. **Contributions** from `PartnershipMembership.capitalContributed` (need year attribution — may need to track per-year contributions)
2. **Income components** from `KDocument.data` (K1Data fields, keyed by `partnershipId + taxYear`)
3. **Distributions** from `Distribution` model (summed per entity-partnership-year)
4. **Tax basis fields** from extended `KDocument.data` (R-003)

The join key is `(entityId, partnershipId, taxYear)` — entities derive from memberships, partnerships from the membership relation, and years from K-documents and distributions.

**Alternatives considered**:
- Separate `ActivityRecord` model — rejected as it would duplicate data already stored across existing models.
- Client-side aggregation — rejected because the data volume and computation complexity are better handled server-side.

### R-008: Contribution Year Attribution

**Decision**: Use Distribution records of type contributions (capital calls) for year-attributed contributions. Fall back to `PartnershipMembership.capitalContributed` as the total when per-year breakdown is unavailable.

**Rationale**: The Activity CSV shows contributions per year (e.g., $1,000,000 in year 1, $131,566 in a later year). `PartnershipMembership.capitalContributed` stores only the cumulative total. The `Distribution` model already supports negative-amount (or capital-call type) records with dates. If per-year data exists, use it; otherwise attribute the full `capitalContributed` to the membership's `effectiveDate` year.

**Alternatives considered**:
- New CapitalCall model — rejected; the Distribution model can represent both inflows and outflows with type differentiation.
- Manually entered per-year breakdown — possible but adds user burden; better to derive from existing dated records.
