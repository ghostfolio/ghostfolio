# Tasks: Single Family Office Platform Transformation

**Input**: Design documents from `/specs/001-family-office-transform/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story (US1-US8) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1-US8)
- Exact file paths included in all descriptions

## Path Conventions

- **API**: `apps/api/src/`
- **Client**: `apps/client/src/app/`
- **Common lib**: `libs/common/src/lib/`
- **UI lib**: `libs/ui/src/lib/`
- **Prisma**: `prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend Prisma schema with all family office models and generate migration

- [x] T001 Add 8 new enums (EntityType, PartnershipType, DistributionType, KDocumentType, KDocumentStatus, FamilyOfficeAssetType, ValuationSource, DocumentType) to prisma/schema.prisma per data-model.md
- [x] T002 Add 10 new models (Entity, Partnership, PartnershipMembership, Ownership, Distribution, KDocument, PartnershipAsset, AssetValuation, PartnershipValuation, Document) with all fields, relations, and unique constraints to prisma/schema.prisma per data-model.md
- [x] T003 Add back-references to existing User model (entities Entity[], partnerships Partnership[]) and Account model (ownerships Ownership[]) in prisma/schema.prisma
- [x] T004 Run `npx prisma migrate dev --name added_family_office_models` and `npx prisma generate` to apply migration and regenerate client

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, DTOs, permissions, and Angular data service that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Create family office TypeScript enums mirroring Prisma enums in libs/common/src/lib/enums/family-office.ts — export EntityType, PartnershipType, DistributionType, KDocumentType, KDocumentStatus, FamilyOfficeAssetType, ValuationSource, DocumentType
- [x] T006 [P] Create entity and ownership interfaces (IEntity, IEntityWithRelations, IOwnership) in libs/common/src/lib/interfaces/entity.interface.ts per entity-api.md response shapes
- [x] T007 [P] Create partnership interfaces (IPartnership, IPartnershipMembership, IPartnershipAsset, IPartnershipValuation) in libs/common/src/lib/interfaces/partnership.interface.ts per partnership-api.md response shapes
- [x] T008 [P] Create distribution interfaces (IDistribution, IDistributionSummary) in libs/common/src/lib/interfaces/distribution.interface.ts per distribution-kdocument-fo-api.md response shapes
- [x] T009 [P] Create K1Data (20-field IRS box interface) and k-document interfaces (IKDocument, IKDocumentAllocation) in libs/common/src/lib/interfaces/k-document.interface.ts per data-model.md K1Data definition
- [x] T010 [P] Create family office interfaces (IFamilyOfficeDashboard, IFamilyOfficeReport, IPerformanceMetrics) in libs/common/src/lib/interfaces/family-office.interface.ts per distribution-kdocument-fo-api.md dashboard/report response shapes
- [x] T011 [P] Create CreateEntityDto and UpdateEntityDto with class-validator decorators in libs/common/src/lib/dtos/create-entity.dto.ts and libs/common/src/lib/dtos/update-entity.dto.ts per entity-api.md request bodies
- [x] T012 [P] Create CreatePartnershipDto, UpdatePartnershipDto, CreatePartnershipMembershipDto, CreatePartnershipValuationDto, and CreatePartnershipAssetDto in libs/common/src/lib/dtos/partnership.dto.ts per partnership-api.md request bodies
- [x] T013 [P] Create CreateDistributionDto with class-validator decorators in libs/common/src/lib/dtos/create-distribution.dto.ts per distribution-kdocument-fo-api.md request body
- [x] T014 [P] Create CreateKDocumentDto, UpdateKDocumentDto, and CreateOwnershipDto in libs/common/src/lib/dtos/k-document.dto.ts and libs/common/src/lib/dtos/create-ownership.dto.ts per contract request bodies
- [x] T015 Add family office permissions (createEntity, readEntity, updateEntity, deleteEntity, createPartnership, readPartnership, updatePartnership, deletePartnership, createDistribution, readDistribution, deleteDistribution, createKDocument, readKDocument, updateKDocument, uploadDocument, readDocument, readFamilyOfficeDashboard, readFamilyOfficeReport) to libs/common/src/lib/permissions.ts
- [x] T016 [P] Create FamilyOfficeDataService Angular HTTP client with methods for all family office API endpoints in apps/client/src/app/services/family-office-data.service.ts

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Entity & Ownership Structure Management (Priority: P1) 🎯 MVP

**Goal**: Create and manage legal entities (trusts, LLCs, LPs, individuals) with ownership percentages over accounts, consolidated portfolio view per entity

**Independent Test**: Create entities, assign ownership of accounts with percentages, verify ownership tree and rolled-up values display correctly. Validate ownership % sum ≤ 100 per account.

### Implementation for User Story 1

- [x] T017 [P] [US1] Create EntityService with CRUD (create, findAll, findById, update, delete with active-relationship guard), ownership assignment with 100% validation, and consolidated portfolio aggregation in apps/api/src/app/entity/entity.service.ts
- [x] T018 [P] [US1] Create entity-card standalone component (entity name, type icon, total value, ownership/membership counts) in libs/ui/src/lib/entity-card/entity-card.component.ts
- [x] T019 [US1] Create EntityController with 9 endpoints (POST/GET/GET:id/PUT/DELETE entity, GET entity/:id/portfolio, POST entity/:id/ownership, GET entity/:id/distributions, GET entity/:id/k-documents) per entity-api.md in apps/api/src/app/entity/entity.controller.ts
- [x] T020 [US1] Create EntityModule importing PrismaModule, register EntityModule in AppModule imports array in apps/api/src/app/entity/entity.module.ts and apps/api/src/app/app.module.ts
- [x] T021 [US1] Create entities-page standalone component (entity list with type filter, entity-card grid, create dialog) in apps/client/src/app/pages/entities/entities-page.component.ts
- [x] T022 [US1] Create entity-detail-page standalone component (entity info, ownership table with % and allocated values, membership list, edit/delete actions) in apps/client/src/app/pages/entity-detail/entity-detail-page.component.ts
- [x] T023 [US1] Add lazy-loaded routes for /entities → EntitiesPageComponent and /entities/:id → EntityDetailPageComponent in apps/client/src/app/app.routes.ts

**Checkpoint**: Entity CRUD, ownership assignment with validation, and consolidated portfolio view are functional. MVP delivers family wealth structure visibility.

---

## Phase 4: User Story 2 — Partnership Tracking & Valuation (Priority: P1)

**Goal**: Create partnerships, manage members with ownership percentages and capital data, record NAV valuations, track partnership-level assets with appraisals

**Independent Test**: Create partnership, add member entities with %, record NAV statements, verify allocated NAV per member is correct. Add assets with valuations.

### Implementation for User Story 2

- [x] T024 [P] [US2] Create PartnershipService with CRUD, membership management (add/update with 100% validation), NAV valuation recording, asset management with appraisals, and allocated NAV computation in apps/api/src/app/partnership/partnership.service.ts
- [x] T025 [P] [US2] Create partnership-table standalone component (member rows with ownership %, capital commitment, contributed, allocated NAV, class type) in libs/ui/src/lib/partnership-table/partnership-table.component.ts
- [x] T026 [US2] Create PartnershipController with 11 endpoints (CRUD partnership, POST/PUT member, POST/GET valuations, POST asset, POST asset valuation, GET performance) per partnership-api.md in apps/api/src/app/partnership/partnership.controller.ts
- [x] T027 [US2] Create PartnershipModule importing PrismaModule, register PartnershipModule in AppModule imports array in apps/api/src/app/partnership/partnership.module.ts and apps/api/src/app/app.module.ts
- [x] T028 [US2] Create partnerships-page standalone component (partnership list with type/currency, latest NAV, member count, asset count, create dialog) in apps/client/src/app/pages/partnerships/partnerships-page.component.ts
- [x] T029 [US2] Create partnership-detail-page standalone component (partnership info, partnership-table for members, assets list with valuations, NAV history timeline, add member/valuation/asset dialogs) in apps/client/src/app/pages/partnership-detail/partnership-detail-page.component.ts
- [x] T030 [US2] Add lazy-loaded routes for /partnerships → PartnershipsPageComponent and /partnerships/:id → PartnershipDetailPageComponent in apps/client/src/app/app.routes.ts

**Checkpoint**: Partnership CRUD with members, NAV valuations, assets, and allocated values per member are functional.

---

## Phase 5: User Story 3 — Distribution Tracking (Priority: P1)

**Goal**: Record distributions from partnerships to entities with type categorization, provide summaries grouped by period, type, partnership, and entity

**Independent Test**: Record distributions of various types from partnerships to entities, view summaries grouped by monthly/quarterly/yearly. Verify totals match sum of individual records.

### Implementation for User Story 3

- [x] T031 [P] [US3] Create DistributionService with recording (date >= inception validation), deletion, listing with filters, and summary aggregation (byType, byPartnership, byPeriod with MONTHLY/QUARTERLY/YEARLY grouping, gross/net/taxWithheld totals) in apps/api/src/app/distribution/distribution.service.ts
- [x] T032 [P] [US3] Create distribution-chart standalone component (Chart.js bar chart showing distributions by period with type color coding) in libs/ui/src/lib/distribution-chart/distribution-chart.component.ts
- [x] T033 [US3] Create DistributionController with 3 endpoints (POST create, GET list with filters/grouping, DELETE) per distribution-kdocument-fo-api.md in apps/api/src/app/distribution/distribution.controller.ts
- [x] T034 [US3] Create DistributionModule importing PrismaModule, register DistributionModule in AppModule imports array in apps/api/src/app/distribution/distribution.module.ts and apps/api/src/app/app.module.ts
- [x] T035 [US3] Create distributions-page standalone component (distribution list with entity/partnership/type/date filters, summary cards for gross/net/tax, distribution-chart by period, record distribution dialog) in apps/client/src/app/pages/distributions/distributions-page.component.ts
- [x] T036 [US3] Add lazy-loaded route for /distributions → DistributionsPageComponent in apps/client/src/app/app.routes.ts

**Checkpoint**: Distribution recording, categorization, and period/type/entity summaries are functional.

---

## Phase 6: User Story 4 — K-1/K-3 Document Management (Priority: P2)

**Goal**: Enter structured K-1 data per partnership per tax year, auto-allocate to members by ownership %, track filing status, upload and link PDF documents

**Independent Test**: Enter K-1 data for a partnership, verify allocated amounts match ownership percentages per member. Update status from ESTIMATED to FINAL. Upload PDF and link to K-1 record.

**Depends on**: US2 (partnership membership percentages for allocation calculation)

### Implementation for User Story 4

- [x] T037 [P] [US4] Create UploadService with Multer local filesystem storage (configurable UPLOAD_DIR), file metadata persistence to Document model, and download stream serving in apps/api/src/app/upload/upload.service.ts
- [x] T038 [P] [US4] Create KDocumentService with CRUD (unique constraint on partnership+type+taxYear), auto-allocation computation (K-1 amounts × member ownership %), status transitions (DRAFT→ESTIMATED→FINAL), partial data merge on update, and document linking in apps/api/src/app/k-document/k-document.service.ts
- [x] T039 [P] [US4] Create k-document-form standalone component (Angular Material form with 20 K-1 box fields: ordinary income, net rental, guaranteed payments, interest, dividends, qualified dividends, royalties, short-term CG, long-term CG, Section 1250, Section 1231, other income, Section 179, other deductions, SE earnings, foreign taxes, AMT items, cash distributions, property distributions; plus filing status selector) in libs/ui/src/lib/k-document-form/k-document-form.component.ts
- [x] T040 [US4] Create UploadController with POST /upload (multipart/form-data with FileInterceptor) and GET /upload/:id/download endpoints in apps/api/src/app/upload/upload.controller.ts
- [x] T041 [US4] Create UploadModule with MulterModule.register configuration, register in AppModule in apps/api/src/app/upload/upload.module.ts and apps/api/src/app/app.module.ts
- [x] T042 [US4] Create KDocumentController with 5 endpoints (POST create, GET list with filters, PUT update data/status, POST link-document) per distribution-kdocument-fo-api.md in apps/api/src/app/k-document/k-document.controller.ts
- [x] T043 [US4] Create KDocumentModule importing PrismaModule and UploadModule, register in AppModule in apps/api/src/app/k-document/k-document.module.ts and apps/api/src/app/app.module.ts
- [x] T044 [US4] Create k-documents-page standalone component (K-document list with partnership/year/status filters, k-document-form for data entry, allocation preview table showing member amounts, status badge, PDF upload/link action) in apps/client/src/app/pages/k-documents/k-documents-page.component.ts
- [x] T045 [US4] Add lazy-loaded route for /k-documents → KDocumentsPageComponent in apps/client/src/app/app.routes.ts

**Checkpoint**: K-1 data entry, auto-allocation, status tracking, and PDF upload/linking are functional.

---

## Phase 7: User Story 5 — Partnership & Asset Performance Calculation (Priority: P2)

**Goal**: Calculate XIRR (IRR), TVPI, DPI, RVPI for partnerships. Compute periodic returns (monthly/quarterly/yearly) using Modified Dietz method. Entity-level aggregate performance.

**Independent Test**: Create partnership with historical NAV entries, contributions, and distributions. Verify XIRR, TVPI (1.3x for $1M contributed/$400K distributed/$900K NAV), DPI, RVPI, and quarterly Modified Dietz returns match expected calculations.

**Depends on**: US2 (partnership NAV and member data), US3 (distribution data for DPI calculation)

### Implementation for User Story 5

- [x] T046 [US5] Create FamilyOfficePerformanceCalculator standalone class with XIRR (Newton-Raphson iteration using big.js), TVPI (distributions+NAV/contributed), DPI (distributions/contributed), RVPI (NAV/contributed), and Modified Dietz periodic returns in apps/api/src/app/portfolio/calculator/family-office/performance-calculator.ts
- [x] T047 [US5] Integrate FamilyOfficePerformanceCalculator into PartnershipService performance endpoint — gather NAV history, contributions, distributions, compute metrics, support periodicity parameter (MONTHLY/QUARTERLY/YEARLY) in apps/api/src/app/partnership/partnership.service.ts
- [x] T048 [P] [US5] Create performance-metrics standalone component (display cards for IRR %, TVPI x, DPI x, RVPI x with color coding for positive/negative, period return chart) in libs/ui/src/lib/performance-metrics/performance-metrics.component.ts
- [x] T049 [US5] Create partnership-performance-page standalone component (performance-metrics display, period returns table with periodicity selector MONTHLY/QUARTERLY/YEARLY, cumulative return line chart using Chart.js) in apps/client/src/app/pages/partnership-performance/partnership-performance-page.component.ts
- [x] T050 [US5] Add lazy-loaded route for /partnerships/:id/performance → PartnershipPerformancePageComponent in apps/client/src/app/app.routes.ts

**Checkpoint**: Partnership performance metrics (XIRR, TVPI, DPI, RVPI) and periodic returns with selectable periodicity are functional.

---

## Phase 8: User Story 6 — Benchmark Comparison (Priority: P2)

**Goal**: Compare partnership returns against S&P 500, bonds, real estate, and CPI benchmarks. Display excess return (alpha) and cumulative comparison charts.

**Independent Test**: Select a partnership with known performance, choose S&P 500 benchmark, verify benchmark returns are period-aligned and excess return calculation is accurate.

**Depends on**: US5 (performance calculation provides the partnership return series to compare against)

### Implementation for User Story 6

- [x] T051 [US6] Create FamilyOfficeBenchmarkService composing existing BenchmarkService — configure pre-built benchmarks (SPY→S&P 500, AGG→US Agg Bond, VNQ→Real Estate, TIP→CPI proxy) in Property table, fetch historical data via DataProviderService, compute period-matched returns, excess return, and cumulative comparison data in apps/api/src/services/benchmark/family-office-benchmark.service.ts
- [x] T052 [US6] Integrate FamilyOfficeBenchmarkService into partnership performance endpoint — accept benchmarks query parameter (comma-separated IDs), return benchmarkComparisons array with period returns and excess return in apps/api/src/app/partnership/partnership.controller.ts
- [x] T053 [P] [US6] Create benchmark-comparison-chart standalone component (Chart.js multi-line chart with partnership + benchmark cumulative return lines on same time axis, legend, excess return annotation) in libs/ui/src/lib/benchmark-comparison-chart/benchmark-comparison-chart.component.ts
- [x] T054 [US6] Add benchmark multi-select dropdown and benchmark-comparison-chart to partnership-performance-page, wire benchmark IDs to performance API call in apps/client/src/app/pages/partnership-performance/partnership-performance-page.component.ts

**Checkpoint**: Benchmark comparison with S&P 500, bonds, real estate, CPI is functional with excess return display and cumulative charts.

---

## Phase 9: User Story 7 — Periodic Performance Reporting (Priority: P3)

**Goal**: Generate consolidated reports for an entity or family-wide, over a chosen period (month/quarter/year), including value, allocation, performance, distributions, and benchmarks

**Independent Test**: Select an entity and Q4 2025, generate report, verify all sections (value change, allocation, partnership performance, distribution summary, benchmarks) contain accurate data.

**Depends on**: US1 (entities), US2 (partnerships), US3 (distributions), US5 (performance), US6 (benchmarks)

### Implementation for User Story 7

- [x] T055 [P] [US7] Create FamilyOfficeService with report generation method — aggregate entity/family-wide value at period start/end, compute period and YTD change, compile asset allocation, partnership performance (IRR/TVPI/DPI/period return), distribution summary by type, benchmark comparisons using ExchangeRateDataService for multi-currency in apps/api/src/app/family-office/family-office.service.ts
- [x] T056 [US7] Create FamilyOfficeController with GET /family-office/report endpoint accepting entityId, period (MONTHLY/QUARTERLY/YEARLY), year, periodNumber, benchmarks query params per distribution-kdocument-fo-api.md in apps/api/src/app/family-office/family-office.controller.ts
- [x] T057 [US7] Create FamilyOfficeModule importing PrismaModule and required service modules, register in AppModule in apps/api/src/app/family-office/family-office.module.ts and apps/api/src/app/app.module.ts
- [x] T058 [US7] Create report-page standalone component (period selector with type/year/number, optional entity dropdown, benchmark multi-select, report sections: summary cards, asset allocation pie chart, partnership performance table, distribution summary, benchmark comparison chart) in apps/client/src/app/pages/reports/report-page.component.ts
- [x] T059 [US7] Add lazy-loaded route for /reports → ReportPageComponent in apps/client/src/app/app.routes.ts

**Checkpoint**: Periodic reports with all sections (value, allocation, performance, distributions, benchmarks) generate correctly for entity-scoped and family-wide views.

---

## Phase 10: User Story 8 — Consolidated Family Dashboard (Priority: P3)

**Goal**: Single-pane dashboard showing total AUM, allocation by entity/asset class/structure, recent distributions, K-1 filing status

**Independent Test**: Navigate to dashboard with multiple entities, partnerships, and distributions recorded. Verify all widgets show correct aggregated data.

**Depends on**: US1 (entities), US2 (partnerships), US3 (distributions), US4 (K-1 status)

### Implementation for User Story 8

- [x] T060 [US8] Add dashboard aggregation methods to FamilyOfficeService — compute total AUM (sum of entity-weighted holdings), allocation breakdowns (by entity, asset class, structure type), fetch recent 5 distributions, fetch K-1 status counts (draft/estimated/final) for current tax year in apps/api/src/app/family-office/family-office.service.ts
- [x] T061 [US8] Add GET /family-office/dashboard endpoint to FamilyOfficeController returning IFamilyOfficeDashboard response per distribution-kdocument-fo-api.md in apps/api/src/app/family-office/family-office.controller.ts
- [x] T062 [US8] Create dashboard-page standalone component (total AUM hero card, allocation-by-entity pie chart, allocation-by-asset-class pie chart, allocation-by-structure donut chart, recent distributions table, K-1 status progress widget with draft/estimated/final counts) in apps/client/src/app/pages/family-dashboard/dashboard-page.component.ts
- [x] T063 [US8] Add lazy-loaded route for /family-office → DashboardPageComponent in apps/client/src/app/app.routes.ts

**Checkpoint**: Dashboard displays accurate aggregated family office data across all entities and partnerships.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Navigation, configuration, consistency, and validation across all user stories

- [x] T064 [P] Add family office navigation items (Entities, Partnerships, Distributions, K-Documents, Reports, Dashboard) to sidebar/header layout in apps/client/src/app/ layout component
- [x] T065 [P] Add UPLOAD_DIR and MAX_UPLOAD_SIZE environment variable configuration with defaults to apps/api/src/ environment config and docker/docker-compose.dev.yml
- [x] T066 Consistent error handling (409 Conflict for duplicates, 400 for validation, 403 for permissions) and validation messages across all 6 new API modules
- [x] T067 Run quickstart.md validation — execute full flow: create entity → create partnership → add membership → record NAV → record distribution → enter K-1 → view performance → compare benchmarks → generate report → view dashboard

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (Prisma client must be generated) — **BLOCKS all user stories**
- **User Stories (Phases 3-10)**: All depend on Phase 2 completion
  - **US1 (Phase 3)**: No dependencies on other stories — can start first
  - **US2 (Phase 4)**: No dependencies on other stories — can start in parallel with US1
  - **US3 (Phase 5)**: No dependencies on other stories — can start in parallel with US1/US2
  - **US4 (Phase 6)**: Depends on **US2** (partnership membership % for K-1 allocation)
  - **US5 (Phase 7)**: Depends on **US2** (NAV data) and **US3** (distribution data for DPI)
  - **US6 (Phase 8)**: Depends on **US5** (performance return series)
  - **US7 (Phase 9)**: Depends on **US1, US2, US3, US5, US6** (all data sources for report)
  - **US8 (Phase 10)**: Depends on **US1, US2, US3, US4** (all data sources for dashboard)
- **Polish (Phase 11)**: Depends on all user stories being complete

### Within Each User Story

- API service before controller (controller imports service)
- Controller before module (module declares controller + service)
- Module registration before client pages (API must be available)
- UI components marked [P] can be built in parallel with API work
- Page components after both API and UI components are ready
- Route registration last (depends on page components)

### Parallel Opportunities

- All Phase 2 tasks marked [P] can run simultaneously (12 independent files)
- US1, US2, US3 can all start in parallel after Phase 2 (independent P1 stories)
- Within each story: API service [P] with UI component (different projects)
- US4 can start as soon as US2 is complete
- US5 can start as soon as US2 and US3 are complete
- US6 can start as soon as US5 is complete
- US7 and US8 can proceed in parallel once their dependencies are met

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Launch all interface files together:
Task T006: "Create entity interfaces in libs/common/src/lib/interfaces/entity.interface.ts"
Task T007: "Create partnership interfaces in libs/common/src/lib/interfaces/partnership.interface.ts"
Task T008: "Create distribution interfaces in libs/common/src/lib/interfaces/distribution.interface.ts"
Task T009: "Create K1Data interface in libs/common/src/lib/interfaces/k-document.interface.ts"
Task T010: "Create family office interfaces in libs/common/src/lib/interfaces/family-office.interface.ts"

# Launch all DTO files together:
Task T011: "Create entity DTOs in libs/common/src/lib/dtos/"
Task T012: "Create partnership DTOs in libs/common/src/lib/dtos/"
Task T013: "Create distribution DTO in libs/common/src/lib/dtos/"
Task T014: "Create k-document and ownership DTOs in libs/common/src/lib/dtos/"
```

## Parallel Example: User Story 1

```bash
# Launch API service and UI component together:
Task T017: "Create EntityService in apps/api/src/app/entity/entity.service.ts"
Task T018: "Create entity-card component in libs/ui/src/lib/entity-card/"

# Then sequentially:
Task T019: "Create EntityController"
Task T020: "Create EntityModule + register"
Task T021: "Create entities-page"
Task T022: "Create entity-detail-page"
Task T023: "Add routes"
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup (schema + migration)
2. Complete Phase 2: Foundational (interfaces, DTOs, permissions)
3. Complete Phase 3: User Story 1 — Entity & Ownership
4. **STOP and VALIDATE**: Test entity CRUD and ownership independently
5. Complete Phase 4: User Story 2 — Partnership Tracking
6. Complete Phase 5: User Story 3 — Distribution Tracking
7. **MVP COMPLETE**: Family structure, partnerships, and distributions are functional

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test entities independently → **MVP v1** (family structure)
3. Add US2 → Test partnerships independently → **MVP v2** (+ partnerships)
4. Add US3 → Test distributions independently → **MVP v3** (+ cash flow tracking)
5. Add US4 → Test K-1 independently → Tax season ready
6. Add US5 + US6 → Test performance + benchmarks → Performance analysis ready
7. Add US7 + US8 → Test reporting + dashboard → Full family office platform

### Parallel Team Strategy

With 2+ developers after Phase 2 completion:

- **Developer A**: US1 (entities) → US4 (K-1, needs US2) → US7 (reporting)
- **Developer B**: US2 (partnerships) → US3 (distributions) → US5 (performance) → US6 (benchmarks) → US8 (dashboard)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story is independently testable at its checkpoint
- No test tasks included — tests not explicitly requested in specification
- Commit after each task or logical group
- All new API endpoints follow existing pattern: `AuthGuard('jwt')` + `HasPermissionGuard` + `@HasPermission()` decorator
- All new Angular components are standalone (no NgModules), use `takeUntilDestroyed` for cleanup
- All financial math uses `big.js` for decimal precision (consistent with existing calculators)
- All currency conversions use existing `ExchangeRateDataService.toCurrencyAtDate()`
