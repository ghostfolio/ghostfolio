# Tasks: K-1 Normalized Data Model

**Input**: Design documents from `/specs/006-k1-model-review/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Branch**: `006-k1-model-review`
**Migration Strategy**: Clean break — drop old tables, new schema only, re-import PDFs. No dual-write, no backfill.

**Tests**: Comparison test (SC-006) and E2E pipeline validation (SC-005) are explicitly required by the spec. No generic unit/integration tests unless requested separately.

**Organization**: Tasks grouped by user story. US1 and US2 are both P1 priority but US2 (K1BoxDefinition) must complete first because US1 (K1LineItem writes) depends on K1BoxDefinition FK and `autoCreateIfMissing()`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US5)
- All file paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Capture baseline for comparison test (SC-006) and create shared TypeScript interfaces before any schema changes.

- [ ] T001 Capture old pipeline comparison baseline — query current DB for a confirmed KDocument, export `{kDocumentId, data, partnership, taxYear}` JSON to test/import/k1-comparison-baseline.json (SC-006 requires this BEFORE any code changes)
- [ ] T002 [P] Create K1BoxDefinition, K1BoxOverride, K1BoxDefinitionResolved, K1BoxDataType, K1BoxSection interfaces in libs/common/src/lib/interfaces/k1-box-definition.interface.ts (from specs/006-k1-model-review/contracts/k1-box-definition.ts)
- [ ] T003 [P] Create K1LineItem, K1LineItemWithDefinition, CreateK1LineItemDto, K1SourceCoordinates, K1AggregationResult (updated), K1PartnershipYearSummary, K1SupersedeResult interfaces in libs/common/src/lib/interfaces/k1-line-item.interface.ts (from specs/006-k1-model-review/contracts/k1-line-item.ts — remove K1BackfillResult, update CreateK1LineItemDto doc comment to remove dual-write reference)
- [ ] T004 [P] Export new interfaces from libs/common/src/lib/interfaces/index.ts — add imports and re-exports for all types from k1-box-definition.interface.ts and k1-line-item.interface.ts (follow existing pattern: `import type` at top, add to `export {}` block)

---

## Phase 2: Foundational (Schema + Migration)

**Purpose**: Create all new Prisma models, modify existing models, generate and apply the migration with COMMENT ON annotations and partial unique index. This phase MUST complete before any user story implementation.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 Add K1BoxDefinition model to prisma/schema.prisma with all fields (boxKey PK, label, section, dataType, sortOrder, irsFormLine, description, isCustom), @@map("k1_box_definition"), @map on all columns, @@index([section]), @@index([sortOrder]), relations to K1LineItem[] and K1BoxOverride[] (see data-model.md and research.md §3 for exact schema)
- [ ] T006 Add K1BoxOverride model to prisma/schema.prisma with id (UUID PK), boxKey FK → K1BoxDefinition, partnershipId FK → Partnership, customLabel, isIgnored, @@unique([boxKey, partnershipId]), @@map("k1_box_override"), @@index([partnershipId]), CASCADE deletes (see data-model.md)
- [ ] T007 Add K1LineItem model to prisma/schema.prisma with id (UUID PK), kDocumentId FK → KDocument (CASCADE), boxKey FK → K1BoxDefinition, amount Decimal?(15,2), textValue, rawText, confidence Decimal?(3,2), sourcePage, sourceCoords Json?, isUserEdited, isSuperseded, @@map("k1_line_item"), indexes on [kDocumentId,boxKey], [kDocumentId], [boxKey], [isSuperseded] — NO @@unique (partial unique index in migration SQL per research.md §5)
- [ ] T008 Modify existing models in prisma/schema.prisma — (a) KDocument: remove previousData and previousFilingStatus fields, change `data Json` to `data Json?`, add `lineItems K1LineItem[]` relation; (b) K1ImportSession: remove verifiedData field; (c) Partnership: add `boxOverrides K1BoxOverride[]` relation
- [ ] T009 Generate Prisma migration with `npx prisma migrate dev --create-only --name add_k1_normalized_model`, then append to the generated .sql file: (a) COMMENT ON TABLE/COLUMN annotations for k1_box_definition, k1_box_override, k1_line_item (see research.md §1 for exact SQL), (b) partial unique index `CREATE UNIQUE INDEX "k1_line_item_active_unique" ON "k1_line_item" ("k_document_id", "box_key") WHERE "is_superseded" = false` (see research.md §5)
- [ ] T010 Add K1BoxDefinition seed data to migration SQL — INSERT statements for all ~80 IRS default entries extracted from IRS_DEFAULT_MAPPINGS array in apps/api/src/app/cell-mapping/cell-mapping.service.ts (L10-115). Map: boxNumber→box_key, label→label, description→description, cellType→data_type, sortOrder→sort_order. Derive section from sortOrder ranges (0-9→HEADER, 10-19→PART_I, 20-29→PART_II, 30-39→SECTION_J, 40-49→SECTION_K, 50-59→SECTION_L, 60-61→SECTION_M, 62-63→SECTION_N, 100+→PART_III). Set is_custom=false, irsFormLine from description pattern.
- [ ] T011 Apply migration with `npx prisma migrate dev` and verify: (a) Prisma Client regenerates without errors, (b) `npx prisma db push --force-reset` works for clean DB, (c) K1BoxDefinition has ~80 seed rows, (d) partial unique index exists in PostgreSQL

**Checkpoint**: Schema is ready — all 3 new tables exist, existing models modified, seed data populated. User story implementation can begin.

---

## Phase 3: User Story 2 — Validate K-1 Box Keys via Reference Table (Priority: P1)

**Goal**: Provide a K1BoxDefinition reference table with FK enforcement. Invalid boxKeys are rejected by constraint. New IRS form changes require row additions, not schema changes. Auto-create unknown keys during import (FR-017).

**Independent Test**: `INSERT INTO k1_line_item ... WHERE box_key = 'INVALID'` fails with FK violation. `INSERT ... WHERE box_key = '1'` succeeds. `SELECT COUNT(*) FROM k1_box_definition` returns ~80 seeded rows.

### Implementation for User Story 2

- [ ] T012 [P] [US2] Create K1BoxDefinitionModule in apps/api/src/app/k1-box-definition/k1-box-definition.module.ts — import PrismaModule, export K1BoxDefinitionService. Follow NestJS module pattern matching existing modules like cell-mapping.module.ts.
- [ ] T013 [US2] Create K1BoxDefinitionService in apps/api/src/app/k1-box-definition/k1-box-definition.service.ts with methods: (a) `getAll()` — list all definitions ordered by sortOrder, (b) `getByKey(boxKey)` — single definition lookup, (c) `resolve(partnershipId)` — merge global definitions with K1BoxOverride for a partnership (customLabel overrides label, isIgnored filters), (d) `autoCreateIfMissing(boxKey, label?)` — check if boxKey exists, if not create with isCustom=true (FR-017), (e) `seedDefaults()` — upsert all IRS defaults from a static array (extracted from IRS_DEFAULT_MAPPINGS). Inject PrismaService.
- [ ] T014 [US2] Create K1BoxDefinitionController in apps/api/src/app/k1-box-definition/k1-box-definition.controller.ts with endpoints: (a) GET /api/k1/box-definitions — list all (optionally filtered by section), (b) GET /api/k1/box-definitions/:boxKey — get by key, (c) GET /api/k1/box-definitions/resolved/:partnershipId — get resolved for partnership, (d) POST /api/k1/box-overrides — create/update a K1BoxOverride
- [ ] T015 [US2] Extract IRS_DEFAULT_MAPPINGS data into K1BoxDefinitionService static array (or constant file) — copy the 80+ entries from apps/api/src/app/cell-mapping/cell-mapping.service.ts (L10-115), transform to K1BoxDefinition shape (boxNumber→boxKey, cellType→dataType, add section from sortOrder ranges, add irsFormLine from description). This becomes the authoritative IRS box reference.
- [ ] T016 [US2] Register K1BoxDefinitionModule in apps/api/src/app/app.module.ts — add to imports array. Also register as a global export if K1ImportModule needs to inject K1BoxDefinitionService.

**Checkpoint**: K1BoxDefinition CRUD is functional. FK enforcement active on K1LineItem. `autoCreateIfMissing()` ready for use by US1 confirm() rewrite.

---

## Phase 4: User Story 1 — Query K-1 Financial Data via SQL (Priority: P1)

**Goal**: K1ImportService.confirm() writes K1LineItem rows as the sole authoritative data source. K1AggregationService uses SQL on K1LineItem instead of JSON iteration. CellMapping is fully removed.

**Independent Test**: After confirming a K-1 import, `SELECT SUM(amount) FROM k1_line_item WHERE box_key = '1' AND k_document_id IN (SELECT id FROM k_document WHERE tax_year = 2025)` returns the correct total ordinary income. Every populated Part III box has a K1LineItem row with amount, boxKey, and provenance metadata.

### Implementation for User Story 1

- [X] T017 [US1] Rewrite K1ImportService.confirm() in apps/api/src/app/k1-import/k1-import.service.ts — replace the JSON blob write path (L530-760) with: (a) for each verified field from rawExtraction, call K1BoxDefinitionService.autoCreateIfMissing(boxKey) to ensure FK target exists (FR-017), (b) handle isSuperseded: if KDocument already has active K1LineItems (ESTIMATED→FINAL), mark existing active rows `isSuperseded = true` in a transaction, then insert new rows (FR-016, research.md §5), (c) create K1LineItem rows via prisma.k1LineItem.createMany() with amount/textValue based on data type, rawText, confidence, sourcePage, sourceCoords, isUserEdited from verified fields, (d) write KDocument.data as optional Json? convenience snapshot (nullable, not authoritative, FR-009)
- [X] T018 [US1] Rewrite K1AggregationService in apps/api/src/app/k1-import/k1-aggregation.service.ts — replace `computeForKDocument()` (iterates Object.entries(data) JSON) with SQL queries on K1LineItem: (a) `computeForKDocument(kDocumentId)` — prisma.k1LineItem.findMany({where: {kDocumentId, isSuperseded: false}}) then sum by defined aggregation rules, (b) `computeForPartnership(partnershipId, taxYear)` — GROUP BY box_key across all KDocuments, (c) embed DEFAULT_AGGREGATION_RULES logic (Total Ordinary Income = SUM box 1, Total Capital Gains = SUM boxes 8+9a+9b+9c+10, Total Deductions = SUM boxes 12+13) as constants or configurable rules
- [X] T019 [P] [US1] Delete CellMapping module — remove all files in apps/api/src/app/cell-mapping/ (cell-mapping.module.ts, cell-mapping.controller.ts, cell-mapping.service.ts and any spec files). Remove CellMapping import from apps/api/src/app/app.module.ts. Remove any re-exports or references in libs/common/.
- [X] T020 [US1] Remove CellMapping and CellAggregationRule models from prisma/schema.prisma — delete both model blocks and any relations referencing them. Generate migration with `npx prisma migrate dev --create-only --name drop_cell_mapping`, apply with `npx prisma migrate dev`.
- [X] T021 [US1] Fix all remaining compile errors — search codebase for any references to CellMapping, CellAggregationRule, CellMappingService, cellMapping, cellAggregationRule, IRS_DEFAULT_MAPPINGS, DEFAULT_AGGREGATION_RULES. Update or remove all references. Verify `npx nx build api` compiles cleanly.
- [X] T022 [US1] Write and run comparison test in test/import/k1-comparison.test.ts — (a) load baseline from test/import/k1-comparison-baseline.json (captured in T001), (b) import the same K-1 PDF through the new pipeline (upload → extract → verify → confirm), (c) for each key in the baseline JSON, assert a K1LineItem exists with matching boxKey and exact numeric parity (amount matches JSON value for numbers, textValue matches for strings/booleans), (d) assert no K1LineItems exist that aren't in the baseline. Test MUST pass before any code is committed (SC-006).

**Checkpoint**: Entire K-1 import pipeline uses K1LineItem exclusively. CellMapping is fully removed. Comparison test validates 100% parsing accuracy. Code is ready for commit after SC-006 gate passes.

---

## Phase 5: User Story 5 — Cross-Entity Dashboard Queries (Priority: P2)

**Goal**: Materialized views enable efficient cross-partnership/cross-entity aggregation queries. Views refresh automatically on K-1 data changes. Backend API endpoints serve dashboard data.

**Independent Test**: A single SQL query `SELECT * FROM mv_k1_partnership_year_summary WHERE partnership_id = X AND tax_year = 2025` returns correct per-box totals. After confirming a new K-1, the view automatically refreshes.

### Implementation for User Story 5

- [X] T023 [US5] Create materialized view migration — generate empty migration with `npx prisma migrate dev --create-only --name add_k1_materialized_views`, write raw SQL to create `mv_k1_partnership_year_summary` (GROUP BY partnership_id, tax_year, box_key with SUM(amount), COUNT), unique index for CONCURRENTLY refresh, initial REFRESH (see research.md §2 for exact SQL — update column names to use snake_case @@map names: k_document_id, box_key, is_superseded, etc.)
- [X] T024 [US5] Create K1MaterializedViewService in apps/api/src/app/k1-import/k1-materialized-view.service.ts — (a) `@OnEvent('k-document.changed')` handler calls `refreshAll()`, (b) `refreshAll()` executes `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_k1_partnership_year_summary` via prisma.$executeRawUnsafe, (c) `getPartnershipYearSummary(partnershipId, taxYear)` queries the MV via prisma.$queryRaw<K1PartnershipYearSummary[]> (see research.md §2 for exact implementation)
- [X] T025 [US5] Emit 'k-document.changed' event from K1ImportService.confirm() in apps/api/src/app/k1-import/k1-import.service.ts — inject EventEmitter2 (already available via @nestjs/event-emitter, EventEmitterModule imported in app.module.ts), emit after successful K1LineItem creation with {kDocumentId, partnershipId} payload
- [X] T026 [US5] Register K1MaterializedViewService in K1ImportModule (apps/api/src/app/k1-import/k1-import.module.ts) and add API endpoint for partnership-year-summary in the K1 controller — GET /api/k1/summary/:partnershipId/:taxYear returning K1PartnershipYearSummary[]

**Checkpoint**: Materialized views auto-refresh on K-1 changes. Dashboard aggregation queries return correct totals via SQL in <50ms (SC-002).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finalize documentation, validate E2E pipeline, clean up dead code.

- [X] T027 [P] Update specs/006-k1-model-review/quickstart.md for clean-break workflow — remove references to dual-write, backfill, phased migration. Update migration order, key files table, testing commands, and architecture notes to reflect K1LineItem-only pipeline.
- [X] T028 Run end-to-end pipeline validation (SC-005) — start fresh: upload a K-1 PDF → extract → verify → confirm → query K1LineItem via SQL → query materialized view. Verify complete pipeline works. Document any issues found.
- [X] T029 [P] Final code cleanup — search for dead references: previousData, previousFilingStatus, verifiedData, CellMapping, CellAggregationRule, dual-write, backfill. Remove all dead code, unused imports, stale type references. Verify `npx nx build api` and `npx nx lint api` pass cleanly.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────────────────────► no dependencies
Phase 2: Foundational ───────────────► depends on Phase 1 (interfaces needed for type safety)
Phase 3: US2 (K1BoxDefinition) ──────► depends on Phase 2 (Prisma models + migration applied)
Phase 4: US1 (K1LineItem writes) ────► depends on Phase 3 (needs K1BoxDefinitionService.autoCreateIfMissing)
Phase 5: US5 (Dashboard MVs) ────────► depends on Phase 4 (needs K1LineItem data populated)
Phase 6: Polish ─────────────────────► depends on Phases 4 + 5
```

### User Story Dependencies

- **US2 (K1BoxDefinition)**: Can start after Phase 2. No dependencies on other stories. MUST complete before US1.
- **US1 (K1LineItem)**: Depends on US2 — `K1ImportService.confirm()` calls `K1BoxDefinitionService.autoCreateIfMissing()` (FR-017). K1LineItem FK targets K1BoxDefinition.
- **US5 (Dashboard)**: Depends on US1 — materialized views query K1LineItem data. No K1LineItems = empty views.

### Within Each User Story

- Module creation → Service implementation → Controller endpoints
- Schema models before service code (Phase 2 before Phase 3+)
- CellMapping removal (T019–T021) after new code is functional (T017–T018)
- Comparison test (T022) gates all commits (SC-006)

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can all run in parallel (different files)
- **Phase 3**: T012 (module) can run in parallel with T015 (data extraction)
- **Phase 4**: T019 (delete CellMapping) can run in parallel with T018 (aggregation rewrite) since they touch different files
- **Phase 6**: T027 and T029 can run in parallel (docs vs code cleanup)

---

## Parallel Example: Phase 1 Setup

```
# All three interface tasks can run simultaneously:
Task T002: Create k1-box-definition.interface.ts in libs/common/
Task T003: Create k1-line-item.interface.ts in libs/common/
Task T004: Export new interfaces from index.ts barrel
```

## Parallel Example: User Story 1

```
# After T017 (confirm rewrite) and T018 (aggregation rewrite) complete:
Task T019: Delete CellMapping module files
Task T020: Remove CellMapping from Prisma schema (after T019)
Task T021: Fix remaining compile errors (after T019 + T020)
```

---

## Implementation Strategy

### MVP First (User Story 2 + User Story 1)

1. Complete Phase 1: Setup (capture baseline, create interfaces)
2. Complete Phase 2: Foundational (schema + migration)
3. Complete Phase 3: User Story 2 — K1BoxDefinition module
4. Complete Phase 4: User Story 1 — K1LineItem writes + comparison test
5. **STOP and VALIDATE**: Run comparison test (T022). SC-006 gate must pass.
6. **First potential commit point** — normalized model functional, CellMapping removed

### Incremental Delivery

1. Setup + Foundational → Schema ready, interfaces available
2. Add US2 (K1BoxDefinition) → Reference table with FK enforcement → validateable independently
3. Add US1 (K1LineItem) → Full normalized pipeline → comparison test passes → **commit**
4. Add US5 (Dashboard) → Materialized views + API → deploy
5. Each story adds value without breaking previous stories

### Critical Constraint (SC-006)

> **No code changes are committed until the comparison test passes for at least one real K-1 PDF.**

The comparison test (T022) is the quality gate. T001 captures the baseline before any changes. T022 validates the new pipeline produces identical results. All implementation between T001 and T022 is uncommitted work-in-progress.

---

## Summary

| Metric | Count |
|---|---|
| **Total tasks** | 29 |
| **Phase 1 (Setup)** | 4 tasks |
| **Phase 2 (Foundational)** | 7 tasks |
| **Phase 3 (US2 — K1BoxDefinition)** | 5 tasks |
| **Phase 4 (US1 — K1LineItem)** | 6 tasks |
| **Phase 5 (US5 — Dashboard)** | 4 tasks |
| **Phase 6 (Polish)** | 3 tasks |
| **Parallel opportunities** | 8 tasks marked [P] |
| **MVP scope** | Phases 1–4 (US2 + US1) = 22 tasks |
| **Comparison test gate** | T022 (blocks all commits) |
