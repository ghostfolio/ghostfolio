# Tasks: Portfolio Performance Views

**Input**: Design documents from `/specs/003-portfolio-performance-views/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-contracts.md, quickstart.md

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared interfaces, types, pipes, and route scaffolding that all views depend on

- [x] T001 [P] Add IPerformanceRow, IEntityPerformanceRow, IPortfolioSummary interfaces in libs/common/src/lib/interfaces/family-office.interface.ts
- [x] T002 [P] Add IAssetClassPerformanceRow, IAssetClassSummary interfaces in libs/common/src/lib/interfaces/family-office.interface.ts
- [x] T003 [P] Add IActivityRow, IActivityDetail interfaces in libs/common/src/lib/interfaces/family-office.interface.ts
- [x] T004 [P] Extend K1Data interface with beginningTaxBasis, endingTaxBasis, endingGLBalance, k1CapitalAccount, otherAdjustments, activityNotes fields in libs/common/src/lib/interfaces/k-document.interface.ts
- [x] T005 [P] Add FamilyOfficeAssetType-to-display-label mapping utility in libs/common/src/lib/utils/ or libs/common/src/lib/helper.ts
- [x] T006 [P] Create accounting number format pipe (comma separators, parentheses for negatives, dash for zero) in apps/client/src/app/pipes/accounting-number.pipe.ts
- [x] T007 Create portfolio-views page scaffold with route config in apps/client/src/app/pages/portfolio-views/portfolio-views-page.routes.ts
- [x] T008 Register portfolio-views lazy route in apps/client/src/app/app.routes.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend service helper methods reused across all three endpoints

**⚠️ CRITICAL**: No user story endpoint work can begin until this phase is complete

- [x] T009 Implement helper method to determine partnership asset class from majority PartnershipAsset.assetType in apps/api/src/app/family-office/family-office.service.ts
- [x] T010 Implement helper method to build entity-level aggregated cash flows (contributions, distributions, terminal NAV) for XIRR in apps/api/src/app/family-office/family-office.service.ts
- [x] T011 Implement helper method to compute IPerformanceRow (Original Commitment, Paid-In, Unfunded, Distributions, Residual, DPI, RVPI, TVPI, IRR) from aggregated membership/distribution/valuation data in apps/api/src/app/family-office/family-office.service.ts
- [x] T012 [P] Implement helper method to map K1Data fields to Activity row income components (capitalGains, remainingK1IncomeDed, totalIncome) in apps/api/src/app/family-office/family-office.service.ts
- [x] T013 [P] Implement helper method to compute Activity row derived fields (bookToTaxAdj, k1CapitalVsTaxBasisDiff, excessDistribution, negativeBasis, deltaEndingBasis) in apps/api/src/app/family-office/family-office.service.ts

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Portfolio Summary View (Priority: P1) 🎯 MVP

**Goal**: Entity-level rollup table showing Original Commitment, % Called, Unfunded, Paid-In, Distributions, Residual, DPI, RVPI, TVPI, IRR per entity with "All Entities" totals row

**Independent Test**: Navigate to /portfolio-views, verify Portfolio Summary tab shows one row per entity with correct metrics and a totals row

### Implementation for User Story 1

- [x] T014 [US1] Add GET /family-office/portfolio-summary endpoint with valuationYear query param and JWT + readEntity guard in apps/api/src/app/family-office/family-office.controller.ts
- [x] T015 [US1] Implement getPortfolioSummary(userId, valuationYear) method in apps/api/src/app/family-office/family-office.service.ts — load entities, active memberships, distributions ≤ year-end, latest valuations ≤ year-end; compute IPerformanceRow per entity; compute totals row; return IPortfolioSummary
- [x] T016 [US1] Add fetchPortfolioSummary(params?) method in apps/client/src/app/services/family-office-data.service.ts
- [x] T017 [US1] Build Portfolio Summary tab in portfolio-views page — mat-table with columns: Entity, Original Commitment, % Called, Unfunded Commitment, Paid-In, Distributions, Residual Used, DPI, RVPI, TVPI, IRR in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T018 [US1] Add valuation year dropdown filter at page level (default: current year) that triggers data reload in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T019 [US1] Add "All Entities" sticky totals row at table bottom with bold styling in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T020 [US1] Apply accounting number pipe to all monetary columns, percent pipe to % Called, decimal pipe to DPI/RVPI/TVPI, percent pipe or "N/A" to IRR in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T021 [US1] Add row click handler to navigate to /entities/:id detail page in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T022 [US1] Style Portfolio Summary table — zero/dash display for empty entities, loading spinner during fetch in apps/client/src/app/pages/portfolio-views/portfolio-views-page.scss

**Checkpoint**: Portfolio Summary tab is fully functional — entity rows display correct metrics, totals row aggregates, entity click navigates to detail page, valuation year filter recalculates metrics

---

## Phase 4: User Story 2 — Asset Class Summary View (Priority: P2)

**Goal**: Asset-class-level rollup table showing the same financial metrics grouped by FamilyOfficeAssetType with "All Asset Classes" totals row

**Independent Test**: Navigate to /portfolio-views, switch to Asset Class Summary tab, verify one row per asset class with correct metrics and totals row

### Implementation for User Story 2

- [x] T023 [US2] Add GET /family-office/asset-class-summary endpoint with valuationYear query param and JWT + readEntity guard in apps/api/src/app/family-office/family-office.controller.ts
- [x] T024 [US2] Implement getAssetClassSummary(userId, valuationYear) method in apps/api/src/app/family-office/family-office.service.ts — load partnerships with assets + memberships + distributions + valuations; determine asset class per partnership via helper (T009); group by asset class; compute IPerformanceRow per class; compute totals row; return IAssetClassSummary
- [x] T025 [US2] Add fetchAssetClassSummary(params?) method in apps/client/src/app/services/family-office-data.service.ts
- [x] T026 [US2] Build Asset Class Summary tab in portfolio-views page — mat-table with columns: Asset Class, Original Commitment, % Called, Unfunded Commitment, Paid-In, Distributions, Residual Used, DPI, RVPI, TVPI, IRR in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T027 [US2] Add "All Asset Classes" sticky totals row with bold styling in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T028 [US2] Apply accounting number pipe and display label mapping (FamilyOfficeAssetType → display name) to all columns in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T029 [US2] Display zeros/dashes for asset classes with no investments in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T030 [US2] Add row click handler to expand or drill down into partnerships within the selected asset class in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts

**Checkpoint**: Asset Class Summary tab is fully functional — asset class rows display correct metrics, unassigned partnerships fall to "Other", totals row aggregates, drill-down shows partnerships

---

## Phase 5: User Story 3 — Activity Detail View (Priority: P3)

**Goal**: Full transaction-level ledger showing per year/entity/partnership K-1 income components, tax basis, distributions, derived flags (negative basis, excess distributions), with entity/partnership/year filtering and pagination

**Independent Test**: Navigate to /portfolio-views, switch to Activity tab, verify rows show all financial columns, filter by entity/partnership/year, check negative basis rows are highlighted

### Implementation for User Story 3

- [x] T031 [US3] Add GET /family-office/activity endpoint with entityId, partnershipId, year, skip, take query params and JWT + readEntity guard in apps/api/src/app/family-office/family-office.controller.ts
- [x] T032 [US3] Implement getActivity(userId, filters) method in apps/api/src/app/family-office/family-office.service.ts — join PartnershipMembership + KDocument + Distribution per (entity, partnership, year); map K1Data to income columns using helper (T012); compute derived fields using helper (T013); apply filters; paginate; return IActivityDetail with filter option lists
- [x] T033 [US3] Add fetchActivity(params?) method in apps/client/src/app/services/family-office-data.service.ts
- [x] T034 [US3] Build Activity Detail tab in portfolio-views page — mat-table with columns: Year, Entity, Partnership, Beg Basis, Contributions, Interest, Dividends, Cap Gains, Remaining K-1 Income/Ded, Total Income, Distributions, Other Adj, Ending Tax Basis, Ending GL Balance, Book-to-Tax Adj, Ending K-1 Capital Account, K-1 Capital vs Tax Basis Diff, Excess Distribution, Negative Basis?, Δ Ending Basis, Notes in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T035 [US3] Add entity dropdown filter populated from IActivityDetail.filters.entities in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T036 [US3] Add partnership dropdown filter populated from IActivityDetail.filters.partnerships in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T037 [US3] Add year dropdown filter populated from IActivityDetail.filters.years in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T038 [US3] Implement pagination (mat-paginator) with skip/take params synced to API in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T039 [US3] Add conditional row highlighting — red/warning background for rows where negativeBasis is true in apps/client/src/app/pages/portfolio-views/portfolio-views-page.scss
- [x] T040 [US3] Add visual flag for excess distribution values > 0 (bold text or icon indicator) in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T041 [US3] Apply accounting number pipe to all monetary columns, display "YES"/"" for negativeBasis boolean in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T042 [US3] Enable horizontal scroll for wide table on smaller viewports in apps/client/src/app/pages/portfolio-views/portfolio-views-page.scss

**Checkpoint**: Activity Detail tab is fully functional — all K-1 columns display, filters work, pagination works, negative basis and excess distribution rows are visually flagged

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [x] T043 [P] Add navigation link to /portfolio-views in the application sidebar/navigation menu
- [x] T044 [P] Add loading spinners for all three tabs during data fetch in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T045 [P] Add empty state messaging when valuation year has no data in apps/client/src/app/pages/portfolio-views/portfolio-views-page.html
- [x] T046 Verify all three tabs share the page-level valuation year filter correctly in apps/client/src/app/pages/portfolio-views/portfolio-views-page.component.ts
- [x] T047 Run quickstart.md validation — verify all data flows work end-to-end

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001–T004 (interfaces); T009–T013 BLOCK all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **User Story 2 (P2)**: Can start after Phase 2 — no dependencies on US1 (shares same page component file but different tab section)
- **User Story 3 (P3)**: Can start after Phase 2 — no dependencies on US1/US2 (different tab, different API endpoint)

### Within Each User Story

- Backend endpoint + service (T014–T015, T023–T024, T031–T032) before client data service method (T016, T025, T033)
- Client data service method before UI implementation (T017+, T026+, T034+)
- Core table rendering before styling, formatting, and interaction (click handlers, filters, pagination)

### Parallel Opportunities

- T001–T006 (Setup) — all marked [P], can run in parallel
- T009–T013 (Foundational) — T012 and T013 can run in parallel with each other; T009–T011 are sequential
- T014 + T023 + T031 (controller endpoints) — in different sections of same file, can be parallelized carefully
- T016 + T025 + T033 (client service methods) — in different sections of same file, can be parallelized carefully

---

## Parallel Example: User Story 1

```text
# Launch interface + pipe work in parallel:
Task T001: "Add IPerformanceRow, IEntityPerformanceRow, IPortfolioSummary interfaces"
Task T006: "Create accounting number format pipe"

# Once interfaces exist, launch backend + client service in parallel:
Task T014: "Add GET /portfolio-summary endpoint"  (depends on T001)
Task T015: "Implement getPortfolioSummary service" (depends on T001, T010, T011)
Task T016: "Add fetchPortfolioSummary client method" (depends on T001)

# Once service methods exist, build UI:
Task T017–T022: Sequential UI implementation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T008)
2. Complete Phase 2: Foundational (T009–T013)
3. Complete Phase 3: User Story 1 (T014–T022)
4. **STOP and VALIDATE**: Navigate to /portfolio-views, verify entity rollup table, totals row, year filter, entity click navigation
5. Deploy/demo if ready — user has the Portfolio Summary view working

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP: Portfolio Summary)
3. Add User Story 2 → Test independently → Deploy (+ Asset Class Summary)
4. Add User Story 3 → Test independently → Deploy (+ Activity Detail)
5. Polish → Navigation, loading states, empty states
6. Each story adds value without breaking previous stories

### Sequential Single-Developer Strategy

1. T001–T008 (Setup) → commit
2. T009–T013 (Foundational) → commit
3. T014–T022 (Portfolio Summary) → commit + validate
4. T023–T030 (Asset Class Summary) → commit + validate
5. T031–T042 (Activity Detail) → commit + validate
6. T043–T047 (Polish) → commit + validate

---

## Notes

- [P] tasks = different files, no dependencies on concurrent tasks
- [US1/US2/US3] label maps task to specific user story for traceability
- All three tabs live on the same page component — coordinate tab index and shared state (valuation year)
- The accounting number pipe is critical infrastructure — must be correct before UI work begins
- Existing `FamilyOfficePerformanceCalculator` handles XIRR/TVPI/DPI/RVPI — no changes needed
- K1Data JSON extension is backward-compatible (all new fields optional)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
