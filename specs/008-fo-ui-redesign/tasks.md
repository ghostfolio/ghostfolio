# Tasks: Family Office UI Redesign

**Input**: Design documents from `/specs/008-fo-ui-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/navigation.md, contracts/analysis-page.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **API**: `apps/api/src/`
- **Client**: `apps/client/src/app/`
- **Common lib**: `libs/common/src/lib/`
- **UI lib**: `libs/ui/src/lib/`

---

## Phase 1: Setup

**Purpose**: No project initialization needed — this feature works entirely within the existing codebase. Phase 1 is minimal: verify the dev environment and existing API endpoints respond correctly.

- [X] T001 Verify dev environment starts cleanly: `docker compose -f docker/docker-compose.dev.yml up -d`, `npx nx serve api`, `npx nx serve client`
- [X] T002 Verify family office API endpoints return data: `GET /api/v1/family-office/dashboard`, `GET /api/v1/family-office/portfolio-summary`, `GET /api/v1/family-office/asset-class-summary`, `GET /api/v1/family-office/activity`

---

## Phase 2: Foundational (Shared UI Components)

**Purpose**: Create reusable UI components in `libs/ui` that will be consumed by multiple user stories (US1 and US3 both use performance metrics and K1 income summary).

**⚠️ CRITICAL**: US1 and US3 depend on these components being available.

- [X] T003 [P] Create K1 income summary component in libs/ui/src/lib/k1-income-summary/k1-income-summary.component.ts — standalone Angular component accepting `IActivityRow[]` input, aggregates and displays: Total Ordinary Income (interest + dividends + remainingK1IncomeDed), Total Capital Gains, Total Distributions, Total Other Adjustments as a Material card with labeled dollar amounts. Zero values display as $0 per FR-001/SC-007.
- [X] T004 [P] SKIPPED — Reusing existing `gf-performance-metrics` component at libs/ui/src/lib/performance-metrics/ which already displays IRR, TVPI, DPI, RVPI as individual mat-cards with proper formatting.
- [X] T005 [P] Create nav menu group component in libs/ui/src/lib/nav-menu-group/nav-menu-group.component.ts — standalone Angular component with a `mat-button` trigger and `mat-menu` dropdown. Inputs: `label: string`, `menuItems: { label: string, routerLink: string }[]`, `isActive: boolean`. Outputs: renders a toolbar button that opens a dropdown with `routerLink` items. Used for Partnerships, K-1 Center, and Admin nav groups.
- [X] T006 Export two new components from libs/ui/src/lib/ barrel files (index.ts) — k1-income-summary and nav-menu-group importable via `@ghostfolio/ui/k1-income-summary` and `@ghostfolio/ui/nav-menu-group`

**Checkpoint**: Three reusable components ready for consumption by US1, US2, US3.

---

## Phase 3: User Story 1 — Portfolio Analysis Integrates K1 Data (Priority: P1) 🎯 MVP

**Goal**: Wire existing family office API data into the portfolio analysis page so parsed K1 data appears instead of an empty portfolio.

**Independent Test**: Navigate to `/portfolio` → Analysis tab. Page shows FO performance metrics (IRR/TVPI/DPI/RVPI), per-entity breakdown table, K1 income summary card, and asset class breakdown. If no FO data, shows empty state with link to K-1 Import.

### Implementation for User Story 1

- [X] T007 [US1] Inject `FamilyOfficeDataService` into apps/client/src/app/pages/portfolio/analysis/analysis-page.component.ts — add import, inject via constructor or `inject()`, add properties for `portfolioSummary: IPortfolioSummary`, `assetClassSummary: IAssetClassSummary`, `activityDetail: IActivityDetail`, and a `hasFamilyOfficeData: boolean` flag
- [X] T008 [US1] Add data fetching in analysis-page.component.ts `ngOnInit` — call `FamilyOfficeDataService.fetchPortfolioSummary()`, `fetchAssetClassSummary()`, and `fetchActivity()`. Subscribe and assign results. Set `hasFamilyOfficeData = true` when any data is non-empty. Use `takeUntilDestroyed` for cleanup.
- [X] T009 [US1] Add FO performance metrics section to analysis page template in apps/client/src/app/pages/portfolio/analysis/analysis-page.component.html — insert after the benchmark comparator section: `<gf-performance-metrics-card>` bound to `portfolioSummary?.totals`, gated by `hasFamilyOfficeData`
- [X] T010 [US1] Add entity breakdown table to analysis page template — after the performance metrics card: a Material table showing each entity from `portfolioSummary.entities` with columns: Entity Name, Original Commitment, % Called, Unfunded, Paid-In, Distributions, IRR, TVPI, DPI. Gated by `portfolioSummary?.entities?.length > 0`.
- [X] T011 [US1] Add K1 income summary section to analysis page template — insert `<gf-k1-income-summary>` bound to `activityDetail?.rows`, positioned after the entity table per contracts/analysis-page.md section ordering
- [X] T012 [US1] Add asset class breakdown table to analysis page template — after the performance breakdown section: a Material table showing each asset class from `assetClassSummary.assetClasses` with columns: Asset Class, Original Commitment, Paid-In, Distributions, IRR, TVPI, DPI. Hidden if no data.
- [X] T013 [US1] Add empty state card to analysis page template — when `!hasFamilyOfficeData && !isLoading`: show a `mat-card` with message "No K-1 data available. Import a K-1 to get started." and a `routerLink` button to `/k1-import` per FR-004

**Checkpoint**: Portfolio analysis page shows K1 data from parsed documents. US1 independently verifiable.

---

## Phase 4: User Story 2 — Family Office Navigation Structure (Priority: P2)

**Goal**: Restructure the primary navigation from 11+ flat items to 5 grouped top-level items per contracts/navigation.md.

**Independent Test**: Log in → header shows Dashboard, Partnerships (dropdown), K-1 Center (dropdown), Analysis, Admin (dropdown). Legacy pages accessible via Admin > Legacy. All existing URLs still work.

### Implementation for User Story 2

- [X] T014 [US2] Refactor desktop navigation in apps/client/src/app/components/header/header.component.html — replace the 11+ `<li>` nav items in the desktop toolbar `<ul>` with 5 items: (1) Dashboard direct link to `/family-office`, (2) Partnerships `<gf-nav-menu-group>` with items for Entities, Partnerships, Distributions, Portfolio Views, (3) K-1 Center `<gf-nav-menu-group>` with items for K-1 Import, K-1 Documents, Cell Mapping, (4) Analysis direct link to existing portfolio route, (5) Admin `<gf-nav-menu-group>` (conditional on `hasPermissionToAccessAdminControl`) with items for Admin Control, Accounts, Resources, Pricing (conditional), and a Legacy sub-section with Overview, Holdings, Summary, Markets, Watchlist, FIRE, X-Ray
- [X] T015 [US2] Update header.component.ts in apps/client/src/app/components/header/header.component.ts — add imports for `GfNavMenuGroupComponent`, define nav group data structures as properties (partnershipsMenuItems, k1CenterMenuItems, adminMenuItems with routes per contracts/navigation.md), add `isActiveRoute()` helper to highlight the correct nav group based on current URL
- [X] T016 [US2] Refactor mobile navigation in header.component.html — update the `d-flex d-sm-none` section in the account `mat-menu` to mirror the 5-group structure with flat sub-items. Group items under dividers/headers labeled "Partnerships", "K-1 Center", "Admin", "Legacy" instead of listing all 11+ flat items.

**Checkpoint**: Navigation shows 5 grouped items. All existing URLs still work (no route changes). US2 independently verifiable.

---

## Phase 5: User Story 3 — Unified Family Office Dashboard (Priority: P3)

**Goal**: Enhance the existing family dashboard page to include portfolio performance metrics and K1 income summary, and make it the default landing page.

**Independent Test**: Navigate to `/` → redirects to `/family-office`. Dashboard shows AUM, allocations, performance metrics (IRR/TVPI/DPI/RVPI), K1 income summary, recent distributions, K1 filing status. If no data, shows onboarding guide.

### Implementation for User Story 3

- [X] T017 [US3] Add portfolio summary data fetching to dashboard in apps/client/src/app/pages/family-dashboard/dashboard-page.component.ts — inject additional calls to `FamilyOfficeDataService.fetchPortfolioSummary()` and `fetchActivity()` alongside the existing `fetchDashboard()`. Store results in new component properties.
- [X] T018 [US3] Add performance metrics section to dashboard template — insert `<gf-performance-metrics-card>` bound to `portfolioSummary?.totals` between the allocation charts section and the recent distributions section
- [X] T019 [US3] Add K1 income summary section to dashboard template — insert `<gf-k1-income-summary>` bound to `activityDetail?.rows` after the performance metrics card, displaying current tax year K1 income breakdown
- [X] T020 [US3] Add onboarding guide to dashboard template — when `dashboard?.entitiesCount === 0 && dashboard?.partnershipsCount === 0`: display a `mat-card` with 3 steps: (1) Create an Entity → link to `/entities`, (2) Add a Partnership → link to `/partnerships`, (3) Import a K-1 → link to `/k1-import`. Per FR-016.
- [X] T021 [US3] Change default route to family-office dashboard in apps/client/src/app/app.routes.ts — update the wildcard redirect from `redirectTo: 'home'` to `redirectTo: 'family-office'` per contracts/navigation.md

**Checkpoint**: Dashboard is the landing page with full FO data. US3 independently verifiable.

---

## Phase 6: User Story 4 — Deprioritize Legacy Ghostfolio Pages (Priority: P4)

**Goal**: Ensure legacy Ghostfolio pages (Holdings, Summary, Watchlist, Markets, FIRE, X-Ray) remain accessible from a secondary location without cluttering the primary navigation.

**Independent Test**: Navigate to Admin > Legacy in the nav dropdown → all 7 legacy pages are listed and clickable. Direct URL access (e.g., `/home/holdings`, `/portfolio/fire`) still works. No 404s introduced.

### Implementation for User Story 4

- [X] T022 [US4] Verify all legacy routes remain in apps/client/src/app/app.routes.ts — confirm no routes were removed during US2 navigation refactor. All paths must remain: `home`, `home/holdings`, `home/summary`, `home/markets`, `home/watchlist`, `portfolio/fire`, `portfolio/x-ray`. This is a verification task, no code change expected if US2 was done correctly per FR-010/SC-004.
- [X] T023 [US4] Verify legacy pages render correctly — manually navigate to each of the 7 legacy URLs and confirm they load with original functionality intact per spec acceptance scenario 1 for US4

**Checkpoint**: All legacy pages accessible and functional. US4 independently verifiable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T024 [P] Add SCSS styling for new K1 income summary and performance metrics card components — ensure consistent spacing, typography, and responsive behavior matching existing `libs/ui` component patterns
- [X] T025 [P] Add responsive/mobile styling for nav-menu-group component — ensure grouped navigation works correctly on mobile viewports, including proper touch targets and menu positioning
- [X] T026 Run full quickstart.md verification workflow — execute all 4 verification sections (P1-P4) from specs/008-fo-ui-redesign/quickstart.md, documenting any issues
- [X] T027 Verify SC-001 performance: analysis page with K1 data loads within 3 seconds
- [X] T028 Verify SC-003 click count: login → Dashboard → K-1 Center → K-1 Import → Upload achievable in ≤4 clicks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — verify existing environment
- **Foundational (Phase 2)**: No code dependencies on Phase 1 — creates reusable UI components
- **User Story 1 (Phase 3)**: Depends on Phase 2 (T003 k1-income-summary, T004 performance-metrics-card)
- **User Story 2 (Phase 4)**: Depends on Phase 2 (T005 nav-menu-group)
- **User Story 3 (Phase 5)**: Depends on Phase 2 (T003, T004) — ALSO benefits from US2 nav being done but is independently testable
- **User Story 4 (Phase 6)**: Depends on US2 (verifies nav refactor didn't break routes)
- **Polish (Phase 7)**: Depends on all prior phases

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 3 (P3)**: Can start after Phase 2 — no dependencies on other stories (US2 nav is nice-to-have but not required)
- **User Story 4 (P4)**: Depends on US2 being complete (verifies its work)

### Within Each User Story

- Component injection and data fetching before template changes
- Empty state handling after main data display is working
- Core implementation before integration

### Parallel Opportunities

- All Phase 2 tasks (T003, T004, T005) can run in parallel — different component directories
- US1 and US2 can start in parallel after Phase 2 — different files entirely
- US3 can start in parallel with US1/US2 after Phase 2 — different page component
- T024 and T025 can run in parallel — different component styles

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all three component creation tasks simultaneously:
Task T003: "Create K1 income summary component in libs/ui/src/lib/k1-income-summary/"
Task T004: "Create performance metrics card component in libs/ui/src/lib/performance-metrics-card/"
Task T005: "Create nav menu group component in libs/ui/src/lib/nav-menu-group/"
```

## Parallel Example: User Stories 1 + 2 (after Phase 2)

```bash
# Developer A: User Story 1 (portfolio analysis)
Task T007: "Inject FamilyOfficeDataService into analysis-page.component.ts"
Task T008: "Add data fetching in analysis-page.component.ts"

# Developer B: User Story 2 (navigation), simultaneously
Task T014: "Refactor desktop navigation in header.component.html"
Task T015: "Update header.component.ts with nav group data"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup verification (T001-T002)
2. Complete Phase 2: Create k1-income-summary and performance-metrics-card (T003-T004, T006)
3. Complete Phase 3: User Story 1 — wire FO data into analysis page (T007-T013)
4. **STOP and VALIDATE**: Verify analysis page shows K1 data → this is the MVP
5. Deploy/demo if ready — users can immediately see parsed K1 data in portfolio analysis

### Incremental Delivery

1. **Foundation** (T001-T006): Setup + 3 reusable components → ready
2. **US1** (T007-T013): Portfolio analysis shows K1 data → **MVP deployed**
3. **US2** (T014-T016): Navigation restructured to 5 groups → better daily UX
4. **US3** (T017-T021): Dashboard enhanced + set as landing page → complete FO experience
5. **US4** (T022-T023): Legacy page verification → confidence check
6. **Polish** (T024-T028): Styling, performance, full verification

### Key Insight

This feature is primarily a **wiring exercise** — 4 API endpoints and their client HTTP methods already exist but have zero UI consumers. The main work is Angular template and component changes on 3 pages (analysis, dashboard, header) plus 3 new small `libs/ui` components.

---

## Notes

- No backend code changes required — all API endpoints already exist and return correct data
- No Prisma schema changes — all data models already exist
- No new routes — only the wildcard redirect changes from `home` to `family-office`
- All existing URLs must continue to work (SC-004) — route table in app.routes.ts is only additive
- `FamilyOfficeDataService` already has all HTTP methods wired — just import and call them
- Existing `performance-metrics/` component in libs/ui may be reusable — check if T004 can extend it instead of creating a new one
- Commit after each task or logical group
