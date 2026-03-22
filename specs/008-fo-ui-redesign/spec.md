# Feature Specification: Family Office UI Redesign

**Feature Branch**: `008-fo-ui-redesign`
**Created**: 2025-07-15
**Status**: Draft
**Input**: User description: "Reorganize and redesign the UI for a family office focused view"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Portfolio Analysis Integrates K1 Data (Priority: P1)

As a family office administrator, I want the portfolio analysis view to display income, gains, deductions, and distributions derived from parsed K1 documents so that I can see my complete financial picture in one place instead of an empty portfolio page.

Currently, the portfolio analysis page shows nothing even though two K1 documents have been successfully parsed. This is because the core portfolio data pipeline pulls only from the traditional Orders/Activities/Accounts model and has no connection to the K1 and partnership data managed by the family office services. This story bridges that gap so parsed K1 data flows into portfolio analysis.

**Why this priority**: This is the single highest-value fix. The user has already done the work of importing and parsing K1s, yet the portfolio remains empty. Without this, the entire application feels broken for a family office use case.

**Independent Test**: Import and parse a K1 document, then navigate to Portfolio Analysis. The page must display partnership-level income, capital gains, and distributions from the parsed K1 rather than showing an empty state.

**Acceptance Scenarios**:

1. **Given** at least one K1 document has been parsed for a partnership, **When** the user navigates to the Portfolio Analysis page, **Then** the page displays a summary of ordinary income, capital gains (short-term and long-term), deductions, and distributions sourced from K1 data.
2. **Given** multiple K1 documents exist for different partnerships, **When** the user views Portfolio Analysis, **Then** each partnership is listed with its own financial breakdown and a total aggregation across all partnerships.
3. **Given** a K1 document has been parsed but contains zero values for some categories, **When** the user views the analysis, **Then** zero-value categories are displayed as $0 (not hidden) to confirm the data was parsed.
4. **Given** no K1 documents have been parsed, **When** the user views Portfolio Analysis, **Then** the page shows an informational empty state that guides the user to import a K1.

---

### User Story 2 - Family Office Navigation Structure (Priority: P2)

As a family office administrator, I want the primary navigation to prioritize family office workflows (Dashboard, Partnerships, K-1 Center, Analysis) so that I can access the tools I use daily without scrolling through irrelevant stock-trading features.

The current navigation has 14+ top-level items, most inherited from the original Ghostfolio individual investor UI. For a family office user, Entities, Partnerships, Distributions, K-1 Documents, K-1 Import, and Portfolio Views are the important pages, while Markets, Watchlist, FIRE calculator, and X-Ray are rarely or never used.

**Why this priority**: Navigation structure determines the day-to-day usability of the application. Fixing the data (P1) is more critical, but reorganizing navigation makes every subsequent task faster and makes the application feel purpose-built.

**Independent Test**: Log in and verify the primary navigation shows five grouped items — Dashboard, Partnerships, K-1 Center, Analysis, Admin — and that legacy Ghostfolio pages are accessible from a secondary location but not in the main navigation.

**Acceptance Scenarios**:

1. **Given** a user logs in, **When** the header navigation renders, **Then** the primary navigation shows exactly these top-level items: Dashboard, Partnerships, K-1 Center, Analysis, Admin.
2. **Given** the user clicks "K-1 Center", **When** the submenu expands, **Then** it shows links to K-1 Import, K-1 Documents, and Cell Mapping (box definitions).
3. **Given** the user clicks "Partnerships", **When** the submenu expands, **Then** it shows links to Entities, Partnerships list, Distributions, and Portfolio Views.
4. **Given** the user wants to access legacy pages (Holdings, Watchlist, Markets, FIRE, X-Ray), **When** they look for these pages, **Then** they are available under a secondary "Legacy" or "More" section in the navigation but are not shown in the primary header.

---

### User Story 3 - Unified Family Office Dashboard (Priority: P3)

As a family office administrator, I want a unified dashboard as the landing page that shows total assets under management, partnership allocation breakdown, recent K1 income summaries, and recent distributions so that I get an immediate snapshot of the family office state upon login.

The current Overview page shows a traditional portfolio balance chart, holdings by market, and performance metrics sourced from the stock/ETF order model. For a family office, the landing page should instead surface partnership valuations, K1-derived income, and distribution history.

**Why this priority**: A purpose-built dashboard is the "front door" of the application and reinforces the family office identity. However, it depends on the data integration (P1) and navigation (P2) being in place first to be useful.

**Independent Test**: Log in and land on the Dashboard. Verify it displays total AUM across partnerships, a breakdown of allocations by partnership, a summary of K1 income for the current tax year, and the most recent distributions.

**Acceptance Scenarios**:

1. **Given** the user has partnerships with parsed K1 data, **When** they land on the Dashboard after login, **Then** they see total assets under management calculated from partnership valuations.
2. **Given** the user has three partnerships, **When** viewing the Dashboard, **Then** a visual breakdown (chart or table) shows each partnership's allocation as a percentage of total AUM.
3. **Given** K1 documents have been parsed for the current tax year, **When** viewing the Dashboard, **Then** a summary card shows total ordinary income, total capital gains, and total deductions for the year.
4. **Given** distributions have been recorded, **When** viewing the Dashboard, **Then** the five most recent distributions are listed with partnership name, date, and amount.
5. **Given** no partnerships or K1 data exist, **When** the user lands on the Dashboard, **Then** a guided onboarding state is displayed explaining the steps: create an entity, add a partnership, import a K1.

---

### User Story 4 - Deprioritize Legacy Ghostfolio Pages (Priority: P4)

As a family office administrator, I want stock-portfolio-oriented pages (Holdings, Summary, Watchlist, Markets, FIRE calculator, X-Ray) moved to a secondary "Legacy" or "More" section so they remain accessible for occasional use without cluttering my primary workflow.

**Why this priority**: These pages still function and may be useful occasionally, but they should not compete for attention with family office features. This is a low-effort navigation change that complements P2.

**Independent Test**: Navigate to the secondary "Legacy" section and verify all original Ghostfolio pages load correctly and function as before.

**Acceptance Scenarios**:

1. **Given** a user navigates to the secondary "Legacy" section, **When** they click any legacy page link, **Then** the page loads with all original functionality intact.
2. **Given** a user is on a legacy page, **When** they look at the navigation, **Then** the primary nav still shows the family office items and the legacy section is clearly marked as secondary.

---

### Edge Cases

- What happens when a K1 document is partially parsed (some boxes extracted, others failed)? The portfolio analysis should display available data with an indicator showing which fields are incomplete.
- What happens when a partnership has K1 data from multiple tax years? The analysis should default to the most recent tax year with an option to select prior years.
- What happens when a user has both traditional stock orders AND K1 partnerships? The dashboard should show the family office view by default, with a clearly labeled toggle or tab to view traditional portfolio data if needed.
- What happens when K1 aggregation rules produce conflicting data? The system should display the raw parsed values with a warning that aggregation may need review.
- What happens when the user has entities but no partnerships linked to them? The dashboard should show entities with a prompt to create partnerships.

## Requirements _(mandatory)_

### Functional Requirements

**Data Integration (Portfolio Analysis + K1)**

- **FR-001**: System MUST surface parsed K1 data (ordinary income, capital gains, deductions, credits, distributions) within the portfolio analysis view.
- **FR-002**: System MUST aggregate K1 data across all partnerships for a total portfolio summary while also allowing per-partnership drill-down.
- **FR-003**: System MUST display the tax year associated with each K1 data set and allow the user to filter or switch between tax years.
- **FR-004**: System MUST show a meaningful empty state on portfolio analysis when no K1 data has been parsed, guiding the user to import a K1.
- **FR-005**: System MUST include family office performance metrics (XIRR, TVPI, DPI, RVPI) alongside K1 income data in the portfolio analysis view.

**Navigation Restructure**

- **FR-006**: System MUST present primary navigation with five top-level items: Dashboard, Partnerships, K-1 Center, Analysis, and Admin.
- **FR-007**: The "K-1 Center" navigation item MUST expand to show sub-links for K-1 Import, K-1 Documents, and Cell Mapping (box definitions).
- **FR-008**: The "Partnerships" navigation item MUST expand to show sub-links for Entities, Partnerships list, Distributions, and Portfolio Views.
- **FR-009**: Legacy Ghostfolio pages (Holdings, Summary, Watchlist, Markets, FIRE, X-Ray) MUST remain accessible from a secondary "Legacy" or "More" section.
- **FR-010**: All existing URLs for legacy pages MUST continue to work (no broken bookmarks or links).

**Dashboard**

- **FR-011**: The default landing page after login MUST be the Family Office Dashboard.
- **FR-012**: The Dashboard MUST display total assets under management calculated from partnership valuations.
- **FR-013**: The Dashboard MUST display a visual allocation breakdown by partnership (percentage of total AUM).
- **FR-014**: The Dashboard MUST display a summary of K1 income for the selected tax year (ordinary income, capital gains, deductions).
- **FR-015**: The Dashboard MUST display the five most recent distributions with partnership name, date, and amount.
- **FR-016**: The Dashboard MUST display an onboarding guide when no entities, partnerships, or K1 data exist.

### Key Entities

- **Entity**: A legal entity (person, trust, LLC) that serves as a partner in one or more partnerships. Has a name, type, tax ID, and related partnerships.
- **Partnership**: An investment partnership that has partners (entities), receives K1 documents, holds valuations, and generates distributions. Key attributes: name, EIN, current valuation, partner entities.
- **K1 Document (KDocument)**: A parsed IRS Schedule K-1 form for a specific partnership and tax year. Contains normalized box values for income, gains, losses, deductions, and credits.
- **Distribution**: A cash or in-kind distribution from a partnership to a partner. Has a date, amount, partnership, and receiving entity.
- **K1 Box Definition**: A mapping of K1 form box numbers to their semantic meaning (e.g., Box 1 = Ordinary Business Income). Used for parsing and aggregation.
- **Portfolio View**: A configurable view combining family office performance metrics (XIRR, TVPI, DPI, RVPI) for selected partnerships.

## Assumptions

- The existing `FamilyOfficeService`, `FamilyOfficeDataService`, and `FamilyOfficePerformanceCalculator` already compute the correct K1-derived metrics — the work is in surfacing them in the right UI views, not recomputing them.
- The existing partnership valuation data is accurate and can serve as the basis for AUM calculations on the dashboard.
- The current authentication and authorization model does not change — all users with access can see all family office data.
- Legacy Ghostfolio pages will not be modified, only relocated in the navigation hierarchy.
- Mobile/responsive behavior should match the existing application's responsive patterns.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user with at least one parsed K1 document sees non-empty portfolio analysis data within 3 seconds of navigating to the Portfolio Analysis page.
- **SC-002**: The primary navigation contains no more than 5 top-level items, all relevant to family office workflows.
- **SC-003**: A new user can navigate from login to importing their first K1 document in under 4 clicks (Dashboard → K-1 Center → K-1 Import → Upload).
- **SC-004**: 100% of existing legacy page URLs continue to function (no 404 errors introduced).
- **SC-005**: The Dashboard landing page loads and displays AUM, partnership breakdown, and K1 summary within 5 seconds for a portfolio with up to 20 partnerships.
- **SC-006**: A user can access any legacy Ghostfolio page (Holdings, Markets, FIRE, X-Ray, Watchlist) from the secondary navigation section within 2 clicks.
- **SC-007**: All K1 income categories (ordinary income, rental income, capital gains short/long term, deductions, credits) are individually visible in the portfolio analysis view — no data is silently omitted.
