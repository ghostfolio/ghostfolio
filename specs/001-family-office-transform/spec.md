# Feature Specification: Single Family Office Platform Transformation

**Feature Branch**: `001-family-office-transform`
**Created**: 2026-03-15
**Status**: Draft
**Input**: User description: "Transform portfolio management into single family office platform with entity management, partnership and ownership tracking with percentages, K-1/K-3 document management, distribution tracking, asset and partnership performance (monthly/quarterly/yearly), benchmark comparison against S&P 500/housing market/CPI, and periodic reporting"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Entity & Ownership Structure Management (Priority: P1)

A family office administrator creates and manages the legal entity hierarchy that represents the family's wealth structure. They create entities (trusts, LLCs, LPs, individuals, corporations, foundations) and define which entities own which accounts or assets, along with ownership percentages. For example, "Smith Family Trust" owns 60% of "Smith Capital Partners LP" and 100% of a brokerage account. The administrator can view the full ownership tree and see how value rolls up through the structure.

**Why this priority**: Without entities and ownership relationships, all other family office features (distributions, K-1s, performance by entity) have no foundation. This is the core data model shift from single-user portfolios to multi-entity family structures.

**Independent Test**: Can be fully tested by creating entities, defining ownership relationships with percentages, and verifying the ownership tree displays correctly with rolled-up values. Delivers a consolidated family wealth view.

**Acceptance Scenarios**:

1. **Given** a logged-in family office administrator, **When** they create a new entity with a name, type (Trust), and optional tax ID, **Then** the entity is saved and appears in the entity list.
2. **Given** an existing entity "Smith Family Trust" and an existing account "Schwab Brokerage", **When** the administrator assigns 100% ownership of the account to the trust, **Then** the account appears under the trust in the ownership view with 100% allocation.
3. **Given** two entities each owning a percentage of an account (e.g., Trust A at 60%, LLC B at 40%), **When** the administrator views the ownership summary, **Then** total ownership equals 100% and each entity's allocated value is correctly calculated.
4. **Given** an entity with multiple ownership stakes across accounts and partnerships, **When** the administrator views that entity's consolidated portfolio, **Then** the total value reflects the sum of all ownership-weighted positions.
5. **Given** an ownership assignment, **When** the administrator changes the ownership percentage or end-dates it, **Then** the historical record is preserved and current allocations update accordingly.

---

### User Story 2 - Partnership Tracking & Valuation (Priority: P1)

The administrator creates partnership records (LPs, LLCs, joint ventures, funds) and records which entities are members, with their capital commitments, contributions, and ownership class (GP Interest, Class A LP, etc.). They manually enter periodic NAV (Net Asset Value) statements as they receive them from fund administrators. They can also record partnership-level assets (real estate, private equity, hedge fund positions) with periodic appraisals.

**Why this priority**: Partnerships are the primary vehicle through which family offices hold alternative investments. Tracking NAV, capital commitments, and member allocations is essential before performance can be calculated.

**Independent Test**: Can be fully tested by creating a partnership, adding members with ownership percentages and capital data, recording NAV valuations, and verifying that each member's allocated NAV is correctly computed.

**Acceptance Scenarios**:

1. **Given** a logged-in administrator, **When** they create a partnership with name, type (LP), inception date, and fiscal year end, **Then** the partnership record is saved and appears in the partnerships list.
2. **Given** an existing partnership, **When** the administrator adds a member entity with 25% ownership, $500K capital commitment, and "Class A LP" designation, **Then** the membership appears with correct attributes and the partnership's total commitment updates.
3. **Given** a partnership with members, **When** the administrator records a NAV statement (date, value, source), **Then** each member's allocated value updates based on their ownership percentage.
4. **Given** a partnership, **When** the administrator adds an underlying asset (e.g., "123 Main St" of type Real Estate, acquired for $2M), **Then** the asset appears under the partnership with acquisition details.
5. **Given** a partnership asset, **When** the administrator records a new appraisal value, **Then** the asset's current value updates and the valuation history is preserved.
6. **Given** a member whose ownership percentage changes over time, **When** the administrator records a new effective date with a different percentage, **Then** both historical and current allocations are correctly tracked.

---

### User Story 3 - Distribution Tracking (Priority: P1)

The administrator records distributions received from partnerships and direct investments. Each distribution is categorized by type (income, return of capital, capital gain, guaranteed payment, dividend, interest) and linked to both a partnership and a receiving entity. The system tracks distributions over time and provides summaries by period, type, partnership, and entity.

**Why this priority**: Distribution tracking is critical for cash flow management, tax reporting, and performance calculation. Distributions directly feed into K-1 data and performance metrics (DPI, TVPI).

**Independent Test**: Can be fully tested by recording distributions of various types, then viewing distribution summaries grouped by time period, type, partnership, and entity. Delivers cash flow visibility.

**Acceptance Scenarios**:

1. **Given** an existing partnership and member entity, **When** the administrator records a distribution of $50K categorized as "Return of Capital" dated 2026-03-01, **Then** the distribution appears in both the partnership's and entity's distribution history.
2. **Given** multiple distributions recorded over several quarters, **When** the administrator views the distribution summary, **Then** totals are correctly grouped by monthly, quarterly, and yearly periods.
3. **Given** distributions of different types from the same partnership, **When** the administrator views distributions by type, **Then** each category (income, capital gain, return of capital, etc.) shows the correct subtotal.
4. **Given** a distribution with tax withheld, **When** the administrator records it with a $5K withholding amount, **Then** both the gross distribution and net-of-withholding amounts are tracked.
5. **Given** an entity that receives distributions from multiple partnerships, **When** the administrator views the entity's distribution summary, **Then** distributions are shown per partnership with grand totals.

---

### User Story 4 - K-1/K-3 Document Management (Priority: P2)

The administrator manually enters K-1 (Schedule K-1 Form 1065) data for each partnership by tax year. The system stores structured K-1 box data (ordinary income, rental income, guaranteed payments, capital gains, Section 179 deductions, foreign taxes paid, etc.) and automatically allocates amounts based on each member's ownership percentage. K-3 (international tax) data can also be recorded. The administrator can track document status (draft/estimated/final) as K-1s are received and finalized.

**Why this priority**: K-1 management is a major pain point for family offices. Manual entry with structured data and automatic allocation eliminates spreadsheet-based tracking and reduces tax-season errors.

**Independent Test**: Can be fully tested by entering K-1 data for a partnership tax year, verifying allocated amounts per member match ownership percentages, and tracking status transitions from estimated to final.

**Acceptance Scenarios**:

1. **Given** an existing partnership with two members (60%/40%), **When** the administrator enters K-1 data with $100K ordinary income for tax year 2025, **Then** the system stores the data and shows allocated amounts of $60K and $40K respectively.
2. **Given** a K-1 entry with status "Estimated", **When** the administrator updates it to "Final" with revised figures, **Then** the status changes and allocated amounts recalculate based on the final data.
3. **Given** an entity that is a member of three partnerships, **When** the administrator views that entity's K-1 summary for tax year 2025, **Then** all three K-1s are listed with their allocated amounts and filing status.
4. **Given** K-1 data entry, **When** the administrator fills in Box 1 (ordinary income) through Box 19 (distributions), **Then** all standard IRS K-1 boxes are captured and stored.
5. **Given** a K-1 with a linked PDF document, **When** the administrator uploads the PDF, **Then** the document is associated with the K-1 record and retrievable.

---

### User Story 5 - Partnership & Asset Performance Calculation (Priority: P2)

The administrator views performance metrics for partnerships and assets using industry-standard private market calculations: IRR (Internal Rate of Return via XIRR), TVPI (Total Value to Paid-In), DPI (Distributions to Paid-In), and RVPI (Residual Value to Paid-In). Performance is computed using NAV valuations, capital contributions, and distributions. The administrator selects a time period and periodicity (monthly, quarterly, yearly) to see returns broken down by period using the Modified Dietz method.

**Why this priority**: Family offices need private-market-appropriate performance metrics, not just TWR used for public securities. IRR, TVPI, and DPI are the standard language of alternative investments.

**Independent Test**: Can be fully tested by creating a partnership with historical NAV entries, contributions, and distributions, then verifying IRR, TVPI, DPI, and periodic returns match expected calculations.

**Acceptance Scenarios**:

1. **Given** a partnership with capital contributions and NAV history, **When** the administrator views performance, **Then** the XIRR (annualized IRR) is calculated from the cash flow series and current NAV.
2. **Given** a partnership with $1M contributed, $400K distributed, and $900K current NAV, **When** the administrator views performance, **Then** TVPI shows 1.3x, DPI shows 0.4x, and RVPI shows 0.9x.
3. **Given** quarterly NAV valuations over 2 years, **When** the administrator selects "Quarterly" periodicity, **Then** 8 quarterly return periods are displayed using Modified Dietz calculations.
4. **Given** a partnership, **When** the administrator switches between monthly, quarterly, and yearly views, **Then** returns are correctly re-aggregated for each periodicity.
5. **Given** an entity with multiple partnership memberships, **When** the administrator views entity-level performance, **Then** a weighted aggregate performance across all partnerships is shown.

---

### User Story 6 - Benchmark Comparison (Priority: P2)

The administrator compares partnership or entity performance against standard market benchmarks such as S&P 500, US Aggregate Bond Index, Real Estate (REIT index), Housing Market, and CPI (inflation). The system overlays benchmark returns alongside portfolio/partnership returns on the same time axis and periodicity. The administrator can see excess return (alpha) over each benchmark and cumulative comparison charts.

**Why this priority**: Family offices must justify alternative investment allocations by demonstrating performance relative to passive alternatives. Benchmark comparison answers "did our private investments beat a simple index fund?"

**Independent Test**: Can be fully tested by selecting a partnership with known performance, choosing S&P 500 as a benchmark, and verifying the benchmark return series and excess return calculation are accurate.

**Acceptance Scenarios**:

1. **Given** a partnership with quarterly returns, **When** the administrator selects "S&P 500" as a comparison benchmark, **Then** the S&P 500 quarterly returns for the same periods are displayed alongside.
2. **Given** partnership performance of 12% annualized and S&P 500 of 10% annualized over the same period, **When** the administrator views the comparison, **Then** excess return shows +2%.
3. **Given** multiple benchmarks selected (S&P 500, Real Estate index, CPI), **When** the administrator views the comparison, **Then** all selected benchmarks appear with their respective returns and excess return calculations.
4. **Given** a benchmark comparison over 3 years, **When** displayed as a chart, **Then** cumulative return lines for both the partnership and each benchmark are plotted on the same time axis.
5. **Given** a real estate partnership, **When** the administrator compares against a housing market benchmark, **Then** the comparison uses property-relevant index data.

---

### User Story 7 - Periodic Performance Reporting (Priority: P3)

The administrator generates consolidated performance reports for a selected entity or the entire family office, over a chosen period (month, quarter, year). The report includes: total portfolio value, asset allocation breakdown, performance by asset class and partnership, distribution summary, and benchmark comparisons. Reports can be viewed on screen.

**Why this priority**: Periodic reporting is the primary deliverable of a family office to family members. However, it depends on all prior features (entities, partnerships, performance, benchmarks) being in place first.

**Independent Test**: Can be fully tested by selecting an entity and a quarter, generating the report, and verifying all sections contain accurate data drawn from the underlying entity, partnership, distribution, and performance data.

**Acceptance Scenarios**:

1. **Given** an entity with partnerships and direct holdings, **When** the administrator generates a Q4 2025 report, **Then** the report shows total portfolio value, change from prior quarter, and year-to-date performance.
2. **Given** a generated report, **When** the administrator reviews the asset allocation section, **Then** holdings are broken down by ownership structure (trust, LLC, LP) with percentages summing to 100%.
3. **Given** a generated report, **When** the administrator reviews the distribution section, **Then** quarterly distributions are listed by partnership and type with a total.
4. **Given** a generated report, **When** the administrator reviews the performance section, **Then** each partnership shows IRR, TVPI, and period return alongside selected benchmarks.

---

### User Story 8 - Consolidated Family Dashboard (Priority: P3)

The administrator views a dashboard that provides a single-pane view of the entire family office: total AUM (Assets Under Management), allocation by entity, allocation by asset class, recent distributions, upcoming capital calls, K-1 filing status by tax year, and top-level performance metrics. This replaces the current single-portfolio home view.

**Why this priority**: The dashboard is the entry point that ties all features together. It is lower priority because each underlying feature must work independently first.

**Independent Test**: Can be fully tested by navigating to the dashboard with multiple entities, partnerships, and distributions recorded, and verifying all summary widgets show correct aggregated data.

**Acceptance Scenarios**:

1. **Given** a family office with 3 entities and 5 partnerships, **When** the administrator opens the dashboard, **Then** total AUM is displayed as the sum of all entity-weighted holdings.
2. **Given** the dashboard, **When** the administrator views asset allocation, **Then** a breakdown by structure type (trust, LLC, direct) and by asset class (equity, real estate, private equity, etc.) is shown.
3. **Given** recent distributions recorded, **When** the dashboard loads, **Then** the last 5 distributions are listed with partnership name, amount, and date.
4. **Given** K-1 records for tax year 2025, **When** the dashboard loads, **Then** a K-1 status widget shows how many are draft, estimated, or final out of total expected.

---

### Edge Cases

- What happens when total ownership percentages for an account exceed 100%? The system must validate and reject assignments that would cause over-allocation.
- What happens when a partnership has zero NAV entries? Performance metrics should display as "insufficient data" rather than zero or error.
- How does the system handle a member whose ownership percentage changes mid-quarter? Period returns must use the ownership percentage in effect during each sub-period.
- What happens when a distribution is recorded for a date before the partnership's inception? The system must reject it with a clear error.
- What happens when K-1 data is entered for a tax year where the partnership did not yet exist? The system must validate against the partnership inception date.
- How does the system handle currency differences between a partnership's NAV currency and a member entity's reporting currency? Exchange rates must be applied at valuation dates.
- What happens when benchmark data is unavailable for the requested date range? The system should display available data with a note about the gap.
- What happens when an entity is deleted that has active ownership relationships? The system must prevent deletion or require reassignment first.

## Requirements _(mandatory)_

### Functional Requirements

**Entity Management**

- **FR-001**: System MUST allow creation of entities with a name, type (individual, trust, LLC, LP, corporation, foundation, estate), and optional tax identifier.
- **FR-002**: System MUST allow assigning ownership of existing accounts and partnership memberships to entities with a percentage (0-100%) and effective date.
- **FR-003**: System MUST validate that total ownership percentages for any single account or partnership do not exceed 100%.
- **FR-004**: System MUST maintain historical ownership records when percentages change, preserving both the previous and new effective dates.
- **FR-005**: System MUST display a consolidated portfolio view per entity that aggregates the entity's share of all owned accounts and partnership allocations.

**Partnership Management**

- **FR-006**: System MUST allow creation of partnerships with name, type (LP, GP, LLC, joint venture, fund), inception date, and fiscal year end month.
- **FR-007**: System MUST allow adding members to a partnership with ownership percentage, capital commitment, capital contributed, class type, and effective date.
- **FR-008**: System MUST allow recording NAV (Net Asset Value) statements for a partnership with date, value, and valuation source (appraisal, market, manual, NAV statement, fund administrator).
- **FR-009**: System MUST allow recording partnership-level assets with type (public equity, private equity, real estate, hedge fund, venture capital, fixed income, commodity, art/collectible, cryptocurrency, cash), name, acquisition details, and current value.
- **FR-010**: System MUST allow recording appraisal/valuation entries for individual partnership assets with date, value, and source.
- **FR-011**: System MUST compute each member's allocated NAV by multiplying the partnership's latest NAV by the member's ownership percentage.

**Distribution Tracking**

- **FR-012**: System MUST allow recording distributions linked to a partnership and a receiving entity, with type (income, return of capital, capital gain, guaranteed payment, dividend, interest), amount, date, currency, optional tax withheld, and notes.
- **FR-013**: System MUST provide distribution summaries grouped by monthly, quarterly, and yearly periods.
- **FR-014**: System MUST provide distribution summaries grouped by type, partnership, and entity.
- **FR-015**: System MUST track both gross distribution amount and net-of-withholding amount.

**K-1/K-3 Document Management**

- **FR-016**: System MUST allow manual entry of structured K-1 data per partnership per tax year, covering standard IRS Schedule K-1 (Form 1065) boxes: ordinary income (Box 1), net rental income (Box 2), guaranteed payments (Box 4), interest income (Box 5), dividends (Box 6a/6b), capital gains (Box 8/9), Section 179 deductions (Box 12), other deductions (Box 13), self-employment earnings (Box 14), foreign taxes paid (Box 16), and distributions (Box 19).
- **FR-017**: System MUST automatically allocate K-1 line items to each partnership member based on their ownership percentage.
- **FR-018**: System MUST track K-1 document status as draft, estimated, or final, with the ability to update status and revise figures.
- **FR-019**: System MUST support K-3 (Schedule K-3) data entry for international tax information.
- **FR-020**: System MUST allow associating an uploaded document file (PDF) with a K-1/K-3 record.

**Performance Calculation**

- **FR-021**: System MUST calculate XIRR (extended internal rate of return) for partnerships using the cash flow series of capital contributions, distributions, and terminal NAV.
- **FR-022**: System MUST calculate TVPI (Total Value to Paid-In), DPI (Distributions to Paid-In), and RVPI (Residual Value to Paid-In) for partnerships.
- **FR-023**: System MUST calculate periodic returns (monthly, quarterly, yearly) using the Modified Dietz method based on NAV valuations and cash flows.
- **FR-024**: System MUST allow the user to switch between monthly, quarterly, and yearly periodicity for performance display.
- **FR-025**: System MUST calculate entity-level aggregate performance as a weighted composite of the entity's partnership and direct holding returns.

**Benchmark Comparison**

- **FR-026**: System MUST provide pre-configured benchmarks including: S&P 500, US Aggregate Bond, Real Estate (REIT), and CPI (inflation).
- **FR-027**: System MUST allow the user to select one or more benchmarks for comparison against a partnership or entity's performance.
- **FR-028**: System MUST compute benchmark returns over the same time periods and periodicity as the partnership/entity being compared.
- **FR-029**: System MUST calculate excess return (alpha) as the difference between the portfolio/partnership return and each benchmark's return.
- **FR-030**: System MUST display cumulative return comparison charts with the partnership and selected benchmarks on the same time axis.

**Periodic Reporting**

- **FR-031**: System MUST generate on-screen consolidated reports for a selected entity or family-wide, for a chosen period (month, quarter, year).
- **FR-032**: Reports MUST include: total portfolio value, period-over-period change, asset allocation by structure and asset class, distribution summary, and performance with benchmark comparisons.

**Data Integrity**

- **FR-033**: System MUST prevent deletion of entities that have active ownership relationships or partnership memberships.
- **FR-034**: System MUST validate distribution dates against partnership inception dates.
- **FR-035**: System MUST apply exchange rate conversions when a partnership's NAV currency differs from the reporting entity's base currency.

### Key Entities

- **Entity**: A legal person or structure (individual, trust, LLC, LP, corporation, foundation, estate) that can own assets or be a member of partnerships. Key attributes: name, type, tax identifier. An entity belongs to a user (the family office administrator).
- **Partnership**: An investment vehicle or legal structure (LP, GP, LLC, joint venture, fund) that holds assets and has members. Key attributes: name, type, inception date, fiscal year end. A partnership has members (entities), assets, NAV valuations, distributions, and K-documents.
- **Partnership Membership**: The relationship between an entity and a partnership. Key attributes: ownership percentage, capital commitment, capital contributed, class type (GP interest, Class A LP, etc.), effective date, optional end date.
- **Ownership**: The relationship between an entity and a directly-owned account or asset. Key attributes: ownership percentage, acquisition date, cost basis, effective date, optional end date.
- **Distribution**: A cash flow from a partnership or investment to a receiving entity. Key attributes: type (income, return of capital, capital gain, etc.), amount, date, currency, tax withheld.
- **K-Document**: Structured tax document data (K-1 or K-3) for a partnership and tax year. Key attributes: document type, tax year, filing status (draft/estimated/final), structured box data (ordinary income, capital gains, deductions, etc.).
- **Partnership Asset**: An underlying asset held within a partnership. Key attributes: asset type (real estate, private equity, etc.), name, acquisition cost, current value. Has periodic valuations.
- **Asset Valuation**: A point-in-time value assessment of a partnership asset. Key attributes: date, value, source (appraisal, market, manual, NAV statement).
- **Partnership Valuation**: A point-in-time NAV for an entire partnership. Key attributes: date, NAV, source.
- **Document**: A file (PDF, etc.) associated with an entity, partnership, or K-document. Key attributes: type, name, file path, optional tax year.

## Assumptions

- The system is used by a single family office (one administrative user or a small team), not a multi-tenant platform serving multiple unrelated family offices.
- K-1 data is always entered manually; there is no automated OCR or import from tax software in this initial version.
- Partnership NAV values are entered manually as received from fund administrators; there is no automated feed from fund admin systems.
- The existing Ghostfolio portfolio tracking for public securities (stocks, ETFs, bonds) remains functional and is used for liquid/marketable holdings within the family office structure.
- Exchange rates for multi-currency conversions use the existing Ghostfolio exchange rate data service.
- Document storage uses local file system storage; cloud storage integration is not in initial scope.
- Benchmark data for S&P 500, bond indices, and REIT indices is available through the existing data provider services (Yahoo Finance, etc.). CPI data will use a proxy such as a TIPS ETF or inflation-tracking fund.
- Performance calculations use standard financial formulas: Newton-Raphson method for XIRR, Modified Dietz for periodic returns.
- A maximum of 3 [NEEDS CLARIFICATION] markers are allowed; all other architectural decisions use reasonable industry defaults.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Administrator can create an entity, assign ownership of an account with a percentage, and view the entity's allocated value within 3 minutes of starting the workflow.
- **SC-002**: Administrator can record a partnership NAV statement and see updated allocated values for all members within 1 minute.
- **SC-003**: For a partnership with at least 4 quarterly NAV entries and associated cash flows, XIRR calculation completes and displays within 5 seconds.
- **SC-004**: TVPI, DPI, and RVPI metrics are accurate to within 0.01x of manual spreadsheet calculations for equivalent inputs.
- **SC-005**: Benchmark comparison displays partnership returns alongside at least 3 benchmarks for the same time period, with excess returns calculated, within 10 seconds of selection.
- **SC-006**: Distribution summary correctly aggregates amounts by period (monthly, quarterly, yearly) with totals matching the sum of individual distribution records to the cent.
- **SC-007**: K-1 allocated amounts for each entity match the partnership-level totals multiplied by their ownership percentage, verified for all standard K-1 boxes.
- **SC-008**: Periodic performance report for a quarter generates within 15 seconds and includes all required sections (value, allocation, performance, distributions, benchmarks).
- **SC-009**: Ownership percentage validation prevents any account or partnership from having members whose percentages sum to more than 100%.
- **SC-010**: Administrator can manage (create, view, update) the full family structure — entities, partnerships, memberships, distributions, K-1s — without leaving the application or using external spreadsheets.
