# Feature Specification: Portfolio Performance Views

**Feature Branch**: `003-portfolio-performance-views`
**Created**: 2026-03-16
**Status**: Draft
**Input**: User description: "I want to either repurpose the Overview page, or create a new page for the various views that I need to see, I need to see performance at an individual level, I need to see performance at the asset level as well. Here is the 3 CSV views we will need"

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Portfolio Summary View (Priority: P1)

As a family office manager, I want to see a consolidated portfolio summary that rolls up financial performance metrics by entity so I can quickly assess how each entity (trust, individual, LLC, etc.) is performing across all its partnership investments.

**Why this priority**: This is the primary performance view — every user session will start by scanning entity-level totals to identify which entities need attention. Without this, the user has no centralized place to evaluate their portfolio.

**Independent Test**: Can be fully tested by navigating to the Portfolio Summary view, verifying that each entity row shows the correct Original Commitment, % Called, Unfunded Commitment, Paid-In, Distributions, Residual, DPI, RVPI, TVPI, and IRR values, and that an "All Entities" totals row appears at the bottom.

**Acceptance Scenarios**:

1. **Given** the user has entities with partnership memberships and recorded contributions/distributions, **When** the user navigates to the Portfolio Summary view, **Then** a table displays one row per entity with columns: Entity, Original Commitment, % Called, Unfunded Commitment, Paid-In (ABS), Distributions, Residual Used, DPI, RVPI, TVPI, IRR (XIRR).
2. **Given** the user has multiple entities, **When** the table is rendered, **Then** a summary "All Entities" totals row appears at the bottom aggregating all entity rows.
3. **Given** an entity has no partnership activity, **When** the Portfolio Summary loads, **Then** the entity row displays zeros/dashes for all numeric columns.
4. **Given** the user selects a valuation year filter, **When** the view refreshes, **Then** all metrics recalculate based on data through the selected year-end.
5. **Given** the user clicks on an entity row, **When** navigated, **Then** the user is taken to that entity's detail page.

---

### User Story 2 — Asset Class Summary View (Priority: P2)

As a family office manager, I want to see portfolio performance broken down by asset class (Real Estate, Venture Capital, Private Equity, Hedge Fund, Credit, Co-Investment, Infrastructure, Natural Resources, Other) so I can evaluate allocation and returns by investment category.

**Why this priority**: Asset class analysis is the second most common lens for evaluating a portfolio — it complements the entity view by answering "how are we doing in private equity vs. real estate?" rather than "how is Trust A doing?"

**Independent Test**: Can be fully tested by navigating to the Asset Class Summary view and verifying that each asset class row shows the same financial metrics (Original Commitment through IRR), with an "All Asset Classes" totals row at the bottom.

**Acceptance Scenarios**:

1. **Given** partnerships have assigned asset types, **When** the user navigates to the Asset Class Summary view, **Then** a table displays one row per asset class with columns: Asset Class, Original Commitment, % Called, Unfunded Commitment, Paid-In (ABS), Distributions, Residual Used, DPI, RVPI, TVPI, IRR (XIRR).
2. **Given** the user has investments in multiple asset classes, **When** the table renders, **Then** an "All Asset Classes" totals row appears at the bottom aggregating all rows.
3. **Given** an asset class has no investments, **When** the view loads, **Then** the asset class row displays zeros/dashes for all metrics.
4. **Given** the user selects a valuation year filter, **When** the view refreshes, **Then** all metrics recalculate for data through that year-end.
5. **Given** the user clicks on an asset class row, **When** the row is activated, **Then** the view expands or drills down to show the individual partnerships within that asset class.

---

### User Story 3 — Activity Detail View (Priority: P3)

As a family office manager, I want to see a detailed activity ledger showing every financial transaction (contributions, income components, distributions, tax basis changes) across all entities and partnerships so I can reconcile K-1 data, track tax basis, and identify excess distributions or negative basis positions.

**Why this priority**: This is the most detailed analytical view — used for tax reconciliation and compliance. While essential, it is consulted less frequently than the summary views and is primarily used during tax season or during audits.

**Independent Test**: Can be fully tested by navigating to the Activity view and verifying each row shows Year, Entity, Partnership, Beginning Basis, Contributions, Interest, Dividends, Capital Gains, Remaining K-1 Income/Deductions, Total Income, Distributions, Other Adjustments, Ending Tax Basis, Ending GL Balance, Book-to-Tax Adjustment, Ending K-1 Capital Account, K-1 Capital vs Tax Basis Difference, Excess Distribution, Negative Basis flag, Change in Ending Basis, and Notes.

**Acceptance Scenarios**:

1. **Given** the user has K-1 data and activity records for entity-partnership pairs, **When** the user navigates to the Activity view, **Then** a table displays one row per year-entity-partnership combination with the full set of financial columns matching the Activity CSV structure.
2. **Given** the Activity view is loaded, **When** the user filters by Entity, **Then** only activity rows for that entity are displayed.
3. **Given** the Activity view is loaded, **When** the user filters by Partnership, **Then** only activity rows for that partnership are displayed.
4. **Given** the Activity view is loaded, **When** the user filters by Year, **Then** only rows for the selected year are displayed.
5. **Given** a row has a negative ending tax basis, **When** the table renders, **Then** the "Negative Basis?" column displays "YES" and the row is visually highlighted.
6. **Given** a row has an excess distribution value greater than zero, **When** the table renders, **Then** the "Excess Distribution" value is displayed and visually flagged.
7. **Given** a row has a Notes value (e.g., "AJE Completed"), **When** the table renders, **Then** the notes text is visible in the Notes column.

---

### Edge Cases

- What happens when an entity has no partnership memberships? — The Portfolio Summary row shows zeros/dashes for all financial columns.
- What happens when XIRR cannot be calculated (insufficient cash flow data)? — The IRR column displays "N/A" or a dash.
- What happens when a partnership has no asset type assigned? — It falls into the "Other" bucket in the Asset Class Summary.
- What happens when the selected valuation year has no data? — All metrics display zeros/dashes with an informational message.
- How are negative financial values displayed? — Parenthetical notation, e.g., "(355,885)" for negative numbers, matching standard accounting conventions.
- What happens with the very wide Activity table on mobile? — The table is horizontally scrollable.
- What happens when there are hundreds of activity rows? — Pagination or virtual scrolling is provided.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a Portfolio Summary view that aggregates financial metrics (Original Commitment, % Called, Unfunded Commitment, Paid-In, Distributions, Residual Used, DPI, RVPI, TVPI, IRR) rolled up by entity.
- **FR-002**: System MUST provide an Asset Class Summary view that aggregates the same financial metrics rolled up by asset class (Real Estate, Venture Capital, Private Equity, Hedge Fund, Credit, Co-Investment, Infrastructure, Natural Resources, Other).
- **FR-003**: System MUST provide an Activity Detail view showing per-year, per-entity, per-partnership transaction-level data including: Beginning Basis, Contributions, Interest, Dividends, Capital Gains, Remaining K-1 Income/Deductions, Total Income, Distributions, Other Adjustments, Ending Tax Basis, Ending GL Balance Per Books, Book-to-Tax Adjustment, Ending K-1 Capital Account, K-1 Capital vs Tax Basis Difference, Excess Distribution, Negative Basis flag, Change in Ending Basis, and Notes.
- **FR-004**: Each summary view MUST include an aggregated totals row at the bottom (e.g., "All Entities" or "All Asset Classes").
- **FR-005**: Users MUST be able to filter the Activity view by Entity, Partnership, and Year.
- **FR-006**: Users MUST be able to select a valuation year to control which year-end data the Portfolio Summary and Asset Class Summary metrics are computed through.
- **FR-007**: Monetary values MUST be displayed using standard accounting notation with comma separators and parentheses for negative numbers.
- **FR-008**: Ratio metrics (DPI, RVPI, TVPI) MUST be displayed as decimal multiples (e.g., "2.00").
- **FR-009**: Percentage metrics (% Called) MUST be displayed as percent values (e.g., "100%").
- **FR-010**: IRR (XIRR) values MUST be displayed as percentages when available, or "N/A" when insufficient data exists.
- **FR-011**: The Portfolio Summary view MUST allow the user to navigate to the entity detail page by clicking an entity row.
- **FR-012**: The Asset Class Summary view MUST allow the user to drill down into partnerships within a selected asset class.
- **FR-013**: Activity rows with negative ending tax basis MUST be visually flagged (highlighted and/or displaying "YES" in Negative Basis column).
- **FR-014**: Activity rows with excess distributions MUST be visually flagged.
- **FR-015**: All three views MUST be accessible via navigation in the application.
- **FR-016**: The views MUST be accessible from either a repurposed existing page or a new dedicated page with tab-based or segmented navigation between the three views.

### Key Entities

- **Entity**: The legal person (individual, trust, LLC, etc.) that holds partnership interests. The Portfolio Summary aggregates metrics per entity.
- **Partnership**: The investment vehicle an entity participates in. Partnerships have an asset type that feeds the Asset Class Summary.
- **PartnershipMembership**: The link between an entity and a partnership, recording ownership percentage, capital commitment, and capital contributed.
- **Distribution**: Cash or property distributed from a partnership to an entity, used in Paid-In, Distributions, and DPI/TVPI calculations.
- **KDocument**: K-1 tax data per partnership per year, providing the detailed income components (Interest, Dividends, Capital Gains, Remaining K-1 Income/Deductions) and tax basis figures shown in the Activity view.
- **PartnershipValuation**: Period-end NAV valuations used for "Residual Used" and RVPI calculations.
- **PartnershipAsset**: Individual holdings within a partnership, classified by FamilyOfficeAssetType, used to map partnerships to asset classes.

## Computed Metrics

The following metrics are derived from the stored data and should be computed by the system:

- **Original Commitment**: Sum of `capitalCommitment` from PartnershipMembership records for the entity or asset class.
- **% Called**: Paid-In ÷ Original Commitment, expressed as a percentage.
- **Unfunded Commitment**: Original Commitment − Paid-In.
- **Paid-In (ABS)**: Sum of contributions (absolute value of capital calls/contributions from Distribution or Activity records).
- **Distributions**: Sum of all distribution amounts received by the entity or within the asset class.
- **Residual Used**: Latest NAV from PartnershipValuation allocated by ownership percentage (used as proxy for current unrealized value).
- **DPI (Distributions to Paid-In)**: Distributions ÷ Paid-In.
- **RVPI (Residual Value to Paid-In)**: Residual Used ÷ Paid-In.
- **TVPI (Total Value to Paid-In)**: (Distributions + Residual Used) ÷ Paid-In.
- **IRR (XIRR)**: Internal rate of return calculated using the XIRR method on the time-series of cash flows (contributions as outflows, distributions + residual as inflow).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view the Portfolio Summary (entity rollups) within 3 seconds of navigating to the page.
- **SC-002**: Users can view the Asset Class Summary (asset class rollups) within 3 seconds of navigating to the page.
- **SC-003**: Users can filter the Activity Detail view by entity, partnership, or year and see results within 2 seconds.
- **SC-004**: All computed ratios (DPI, RVPI, TVPI) match manual spreadsheet calculations within a 0.01 tolerance.
- **SC-005**: The "All Entities" and "All Asset Classes" totals match the sum of individual rows.
- **SC-006**: 100% of negative basis and excess distribution rows are visually flagged without user intervention.
- **SC-007**: Users can navigate from the Portfolio Summary to an entity detail page in a single click.
- **SC-008**: Users completing quarterly portfolio review tasks can find the information they need from these three views without exporting to a spreadsheet.

## Assumptions

- The valuation year filter defaults to the current calendar year if not explicitly selected.
- Asset class mapping uses the `FamilyOfficeAssetType` enum already defined in the schema; partnerships without an explicit asset type are categorized as "Other".
- The asset class for a partnership is determined by the majority asset type of its `PartnershipAsset` records. If no assets exist, the partnership's own metadata is used; if neither exists, it falls into "Other".
- Accounting parenthetical notation "(1,000)" for negative numbers is the standard display format, matching the provided CSV format.
- The Activity view's "GL #4415 - Class #30" header reference is specific to the user's general ledger coding and does not need to be reproduced literally — the system will display the same data columns in a generalized format.
- IRR (XIRR) computation requires at least two dated cash flows; otherwise "N/A" is displayed.
- The "Key" and "PriorKey" columns from the Activity CSV are internal composite keys for lookups and do not need to be shown to the user as visible columns.
- The three views will be organized as tabs within a single page (either a new "Performance" page or a repurposed existing page) accessible from the main navigation.
- "Co-Investment" is mapped to `PRIVATE_EQUITY` or a new enum value; "Credit" maps to `FIXED_INCOME`; "Infrastructure" and "Natural Resources" map to `OTHER` unless new enum values are added.
