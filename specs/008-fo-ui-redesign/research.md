# Research: Family Office UI Redesign

**Feature**: 008-fo-ui-redesign
**Date**: 2026-03-22

## Research Questions & Findings

### R-001: How does the current navigation work and what needs to change?

**Decision**: Restructure the flat 11+ nav items into 5 grouped top-level items using Angular Material `mat-menu` dropdowns.

**Rationale**: The header component (`header.component.html`, 587 lines) currently renders 11 top-level `<li>` items in a toolbar `<ul>` for desktop, then duplicates them all as `mat-menu-item` entries inside the account dropdown for mobile. There are no nested/grouped menu patterns anywhere in the app today. The mat-menu component (`@angular/material/menu`) is already imported and used for the assistant and account menus, so extending it to navigation groups requires no new dependencies.

**Current navigation items (authenticated desktop)**:
1. Overview → `['/']`
2. Portfolio → `internalRoutes.portfolio`
3. Accounts → `internalRoutes.accounts`
4. Entities → `/entities`
5. Partnerships → `/partnerships`
6. Distributions → `/distributions`
7. K-1 Documents → `/k-documents`
8. K-1 Import → `/k1-import`
9. Cell Mapping → `/cell-mapping`
10. Portfolio Views → `/portfolio-views`
11. Admin Control (conditional)

**Target navigation structure**:
1. **Dashboard** → `/family-office` (existing route, currently at bottom of app.routes.ts)
2. **Partnerships** (mat-menu dropdown) → Entities, Partnerships, Distributions, Portfolio Views
3. **K-1 Center** (mat-menu dropdown) → K-1 Import, K-1 Documents, Cell Mapping
4. **Analysis** → existing `/portfolio` (portfolio analysis, activities, allocations)
5. **Admin** (conditional) → Admin Control, Accounts, Resources, Pricing

**Legacy pages** (moved to "More" or accessible only via URL): Overview, Holdings, Summary, Markets, Watchlist, FIRE, X-Ray

**Alternatives considered**:
- Sidebar navigation: Rejected — would require major layout restructuring, inconsistent with Ghostfolio's toolbar approach
- Keep flat list, just reorder: Rejected — 11+ items is too many, doesn't communicate hierarchy

---

### R-002: What family office data is available but not surfaced in portfolio analysis?

**Decision**: The portfolio analysis page must be modified to call `FamilyOfficeDataService` methods that already exist but have zero UI consumers.

**Rationale**: Research reveals a complete parallel data system:

| Available Endpoint | Interface | Client Method | Current UI Consumer |
|---|---|---|---|
| `GET /family-office/dashboard` | `IFamilyOfficeDashboard` | `fetchDashboard()` | Family Dashboard page ONLY |
| `GET /family-office/portfolio-summary` | `IPortfolioSummary` | `fetchPortfolioSummary()` | **NONE** |
| `GET /family-office/asset-class-summary` | `IAssetClassSummary` | `fetchAssetClassSummary()` | **NONE** |
| `GET /family-office/activity` | `IActivityDetail` | `fetchActivity()` | **NONE** |
| `GET /family-office/report` | `IFamilyOfficeReport` | `fetchReport()` | **NONE** |

The four richest endpoints have complete backend implementations in `FamilyOfficeService` (1453 lines), HTTP client wrappers in `FamilyOfficeDataService`, and typed interfaces in `@ghostfolio/common` — but **no Angular component uses them**.

**Key data shapes unused**:
- `IPortfolioSummary`: Entity-level IRR, TVPI, DPI, RVPI, original commitment, unfunded, paid-in, distributions
- `IAssetClassSummary`: Same metrics broken down by asset class
- `IActivityDetail`: Full K1 ledger with basis tracking, income decomposition (interest, dividends, capital gains, deductions), excess distributions
- `IFamilyOfficeReport`: Period performance, partnership-level returns, distribution summaries, benchmark comparisons

**Alternatives considered**:
- Add new API endpoints: Rejected — the data is already computed and exposed, just not consumed
- Modify `PortfolioService.getDetails()` to include K1 data: Rejected — would couple two separate data domains; better to add FO data alongside the existing view

---

### R-003: How should K1 data integrate into the portfolio analysis page?

**Decision**: Add a new section to the analysis page using `FamilyOfficeDataService` alongside the existing `DataService`, displaying family office metrics in new cards below the existing Ghostfolio analysis content.

**Rationale**: The current analysis page (`analysis-page.component.ts`, 296 lines) uses only `DataService` for standard Ghostfolio portfolio data. Rather than replacing this, add a conditional section that appears when family office data exists. This preserves backward compatibility and follows the spec requirement that legacy features remain functional.

**Integration approach**:
1. Inject `FamilyOfficeDataService` into the analysis page component
2. Call `fetchPortfolioSummary()` and `fetchAssetClassSummary()` on init
3. Add new template sections for: K1 income summary card, performance metrics (IRR/TVPI/DPI/RVPI), entity breakdown table, asset class breakdown table
4. Gate the new sections behind a check for non-empty family office data
5. Use existing `libs/ui` components where possible (`performance-metrics/` already exists)

**Alternatives considered**:
- Create a completely separate "Family Office Analysis" page: Rejected — spec says P1 is about the portfolio analysis page showing K1 data, not a new page
- Embed an iframe to the family dashboard: Rejected — terrible UX, not a real integration

---

### R-004: How should the default landing page change?

**Decision**: Change the default route from `home` (Overview page) to `family-office` (Family Dashboard).

**Rationale**: The current routing flow is:
- `/**` wildcard → redirects to `home`
- `home` → loads `home-page.routes`, default child renders `GfHomeOverviewComponent` (traditional portfolio overview)

The family dashboard at `/family-office` already exists and renders AUM, allocations, distributions, and K1 status. Making it the default landing page requires only a route redirect change in `app.routes.ts`.

**Alternatives considered**:
- Create a new `/dashboard` route: Rejected — `/family-office` already serves this purpose and has the data bindings
- Modify the home Overview component: Rejected — that component is deeply integrated with the Ghostfolio portfolio model

---

### R-005: What existing UI components can be reused?

**Decision**: Reuse `performance-metrics/`, `distribution-chart/`, `entity-card/`, and other existing `libs/ui` components. Create 2-3 new small components for K1 income summary and nav grouping.

**Rationale**: The `libs/ui` library already contains 35+ components including:
- `performance-metrics/` — displays IRR/TVPI/DPI (already exists, used somewhere)
- `distribution-chart/` — distribution visualization
- `entity-card/` — entity summary card
- `entity-logo/` — entity logo display
- `partnership-table/` — partnership members table
- `k-document-form/` — K1 data entry form
- `benchmark-comparison-chart/` — benchmark overlay
- `value/` — formatted value display with trend indicator
- `toggle/` — month/year toggle (used in analysis page)

**New components needed**:
- `k1-income-summary/` — card showing K1 income categories (ordinary, rental, capital gains, deductions, credits)
- `nav-menu-group/` — toolbar button that triggers a mat-menu dropdown with sub-links (reusable for Partnerships and K-1 Center groups)

**Alternatives considered**:
- Build everything from scratch: Rejected — violates Simplicity First principle
- Use third-party nav component library: Rejected — Angular Material mat-menu is sufficient

---

### R-006: What is the dashboard enhancement strategy?

**Decision**: Enhance the existing family dashboard page to also display portfolio summary metrics (from `fetchPortfolioSummary()`) and K1 income summary (from `fetchActivity()`), making it a comprehensive landing page.

**Rationale**: The current family dashboard only calls `fetchDashboard()` which provides AUM, allocations, distributions, and K1 filing status. But the richer portfolio summary (IRR, TVPI, DPI, RVPI, commitments) and K1 activity data (income decomposition) are available via separate endpoints that have zero consumers. Adding 2-3 more data fetch calls and template sections to the existing dashboard component transforms it from a basic status page into a comprehensive family office command center.

**Dashboard sections (target)**:
1. AUM hero card (existing)
2. Allocation charts (existing: by entity, asset class, structure)
3. **NEW**: Portfolio performance metrics (IRR, TVPI, DPI, RVPI from `fetchPortfolioSummary()`)
4. **NEW**: K1 income summary (current year from `fetchActivity()`)
5. Recent distributions (existing)
6. K-1 filing status (existing)
7. **NEW**: Onboarding guide when no data exists

**Alternatives considered**:
- Create a brand new dashboard component: Rejected — existing one already has most of the infrastructure
- Merge dashboard into home/overview: Rejected — home/overview is tightly coupled to Ghostfolio portfolio model
