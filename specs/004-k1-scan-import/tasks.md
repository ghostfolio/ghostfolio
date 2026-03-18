# Tasks: K-1 PDF Scan Import

**Input**: Design documents from `/specs/004-k1-scan-import/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested — test tasks are excluded. Test fixture PDFs are included in Polish phase for manual/integration validation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `apps/api/src/app/`
- **Frontend**: `apps/client/src/app/`
- **Shared library**: `libs/common/src/lib/`
- **Database schema**: `prisma/schema.prisma`
- **Config**: `apps/api/src/app/configuration/configuration.service.ts`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies, define database schema, create shared types and configuration

- [X] T001 Install npm dependencies: pdf-parse, @azure/ai-form-recognizer, tesseract.js, @types/pdf-parse in package.json
- [X] T002 [P] Add K1ImportStatus enum (PROCESSING, EXTRACTED, VERIFIED, CONFIRMED, CANCELLED, FAILED), K1ImportSession model, CellMapping model, and CellAggregationRule model to prisma/schema.prisma
- [X] T003 [P] Create shared K-1 TypeScript interfaces (K1ExtractionResult, K1ExtractedField, K1UnmappedItem, K1ConfirmationRequest) in libs/common/src/lib/interfaces/k1-import.interface.ts
- [X] T004 [P] Register AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and AZURE_DOCUMENT_INTELLIGENCE_KEY environment variables in apps/api/src/app/configuration/configuration.service.ts
- [X] T005 Run Prisma migration to create K-1 import tables and K1ImportStatus enum
- [X] T006 [P] Create shared DTOs (CreateK1ImportDto, VerifyK1ImportDto, ConfirmK1ImportDto) in libs/common/src/lib/dtos/k1-import/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core module scaffolding, extractor interface, seed data, and frontend plumbing that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create K1Import NestJS module skeleton (module, empty controller, empty service) in apps/api/src/app/k1-import/k1-import.module.ts
- [X] T008 [P] Create CellMapping NestJS module skeleton (module, empty controller, empty service) in apps/api/src/app/cell-mapping/cell-mapping.module.ts
- [X] T009 Register K1ImportModule and CellMappingModule in apps/api/src/app/app.module.ts
- [X] T010 Create K1 extractor interface (K1Extractor with extract method returning K1ExtractionResult) in apps/api/src/app/k1-import/extractors/k1-extractor.interface.ts
- [X] T011 Implement cell mapping seed logic (28 IRS default rows + 3 default aggregation rules) in apps/api/src/app/cell-mapping/cell-mapping.service.ts
- [X] T012 [P] Create K1 import frontend data service (HTTP client for all k1-import and cell-mapping endpoints) in apps/client/src/app/services/k1-import-data.service.ts
- [X] T013 [P] Create frontend route configurations for K1 import pages in apps/client/src/app/pages/k1-import/k1-import-page.routes.ts and cell mapping pages in apps/client/src/app/pages/cell-mapping/cell-mapping-page.routes.ts

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Upload & Scan K-1 PDF (Priority: P1) 🎯 MVP

**Goal**: Administrator uploads a K-1 PDF for a partnership, the system extracts structured data using two-tier extraction (pdf-parse for digital, Azure/tesseract for scanned), and presents results mapped to K-1 box numbers

**Independent Test**: Upload a sample K-1 PDF for an existing partnership, verify extracted values appear on the review screen mapped to correct box numbers within 30 seconds

### Implementation for User Story 1

- [X] T014 [P] [US1] Implement pdf-parse extractor (Tier 1 — digital PDFs with regex-based box extraction) in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [X] T015 [P] [US1] Implement Azure Document Intelligence extractor (Tier 2 — scanned PDFs with key-value pair extraction) in apps/api/src/app/k1-import/extractors/azure-extractor.ts
- [X] T016 [P] [US1] Implement tesseract.js OCR extractor (Tier 2 fallback — self-hosted scanned PDF extraction) in apps/api/src/app/k1-import/extractors/tesseract-extractor.ts
- [X] T017 [P] [US1] Implement K1 confidence scoring service (three-level HIGH/MEDIUM/LOW with validation heuristics per research.md Decision 5) in apps/api/src/app/k1-import/k1-confidence.service.ts
- [X] T018 [US1] Implement K1 field mapper service (raw extraction → K1ExtractedField[] using cell mapping configuration, PDF type detection heuristic) in apps/api/src/app/k1-import/k1-field-mapper.service.ts
- [X] T019 [P] [US1] Create upload DTO (file, partnershipId, taxYear with validation decorators) in apps/api/src/app/k1-import/dto/upload-k1.dto.ts
- [X] T020 [US1] Implement K1 import service upload and extraction orchestration (PDF validation FR-003/FR-028, type detection, extractor routing, session lifecycle) in apps/api/src/app/k1-import/k1-import.service.ts
- [X] T021 [US1] Implement K1 import controller with POST /api/v1/k1-import/upload (multipart) and GET /api/v1/k1-import/:id endpoints in apps/api/src/app/k1-import/k1-import.controller.ts
- [X] T022 [US1] Create K1 import page component (PDF upload UI with partnership selector, tax year input, upload progress, extraction status polling) in apps/client/src/app/pages/k1-import/k1-import-page.component.ts

**Checkpoint**: At this point, User Story 1 should be fully functional — PDF upload triggers extraction and results are retrievable via GET /:id

---

## Phase 4: User Story 2 — Review & Verify Extracted Values (Priority: P1)

**Goal**: Administrator reviews extracted values with confidence indicators, edits incorrect values, resolves unmapped items, views aggregation summaries, and submits verified data. High-confidence values are auto-accepted; medium/low require explicit review before confirmation is allowed.

**Independent Test**: Scan a K-1 PDF, modify an extracted value and a cell label on the verification screen, resolve an unmapped item, confirm all medium/low fields are reviewed, and verify the session transitions to VERIFIED status with corrections saved

### Implementation for User Story 2

- [X] T023 [P] [US2] Create verify DTO (fields array with isReviewed flags, unmappedItems array with resolution status, taxYear override) in apps/api/src/app/k1-import/dto/verify-k1.dto.ts
- [X] T024 [US2] Implement verification logic in K1 import service (EXTRACTED → VERIFIED transition, enforce all medium/low-confidence isReviewed=true per FR-035, validate all unmapped items resolved per validation rule 10) in apps/api/src/app/k1-import/k1-import.service.ts
- [X] T025 [US2] Implement cancel logic in K1 import service (status → CANCELLED, discard extraction data per FR-011) in apps/api/src/app/k1-import/k1-import.service.ts
- [X] T026 [US2] Add PUT /api/v1/k1-import/:id/verify and POST /api/v1/k1-import/:id/cancel endpoints to apps/api/src/app/k1-import/k1-import.controller.ts
- [X] T027 [P] [US2] Implement K1 aggregation service (dynamic SUM computation from CellAggregationRule records, auto-recalculate when cell values change per FR-034/FR-039) in apps/api/src/app/k1-import/k1-aggregation.service.ts
- [X] T028 [US2] Create K1 verification component with mapped cells table (box number, label, value, confidence indicator, inline edit, isReviewed checkbox, custom label override) in apps/client/src/app/pages/k1-import/k1-verification/k1-verification.component.ts
- [X] T029 [US2] Add unmapped items section to verification view (assign to existing/new cell or discard, with resolution tracking per FR-037/FR-038) in apps/client/src/app/pages/k1-import/k1-verification/k1-verification.html
- [X] T030 [US2] Add aggregation summary display to verification view (derived rows distinguished from extracted values, live recalculation on cell edit per FR-033/FR-034) in apps/client/src/app/pages/k1-import/k1-verification/k1-verification.html
- [X] T031 [US2] Implement review enforcement UI (disable Confirm button until all medium/low-confidence fields have isReviewed=true AND all unmapped items resolved per FR-035) in apps/client/src/app/pages/k1-import/k1-verification/k1-verification.component.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work — upload → extract → verify flow is complete

---

## Phase 5: User Story 3 — Auto-Create Model Objects from Verified K-1 Data (Priority: P1)

**Goal**: After confirmation, system auto-creates KDocument with verified box values, allocates K-1 amounts to partnership members by ownership percentage, creates Distribution records for Box 19, and links the uploaded PDF as a Document record

**Independent Test**: Confirm verified K-1 data for a partnership with 2 members (60%/40% split), verify KDocument exists with correct box values, member allocations are proportional, Distribution records exist for Box 19, and the PDF Document is linked

### Implementation for User Story 3

- [ ] T032 [P] [US3] Create confirm DTO (filingStatus, existingKDocumentAction) in apps/api/src/app/k1-import/dto/confirm-k1.dto.ts
- [ ] T033 [US3] Implement K1 allocation service (allocate line items to members by ownership % as of tax year end, rounding adjustment on largest member per validation rule 8) in apps/api/src/app/k1-import/k1-allocation.service.ts
- [ ] T034 [US3] Implement confirmation logic in K1 import service (create KDocument with type K1 and verified box values, create Distribution records for Box 19a/19b, create Document record for PDF, link all records per FR-012 through FR-015) in apps/api/src/app/k1-import/k1-import.service.ts
- [ ] T035 [US3] Implement duplicate KDocument detection (check existing partnershipId + type K1 + taxYear, prompt UPDATE vs CREATE_NEW per FR-016) in apps/api/src/app/k1-import/k1-import.service.ts
- [ ] T036 [US3] Add POST /api/v1/k1-import/:id/confirm endpoint to apps/api/src/app/k1-import/k1-import.controller.ts
- [ ] T037 [US3] Create K1 confirmation result component (displays created KDocument summary, member allocations table, distribution records, linked Document) in apps/client/src/app/pages/k1-import/k1-confirmation/k1-confirmation.component.ts

**Checkpoint**: At this point, the complete K-1 import pipeline (upload → extract → verify → confirm → auto-create) is functional — this is the MVP

---

## Phase 6: User Story 4 — Cell Mapping Configuration (Priority: P2)

**Goal**: Administrator can view and customize K-1 cell mapping (rename labels, add custom cells, manage aggregation rules) per partnership, with reset-to-IRS-default capability. Custom mappings are reused for future imports.

**Independent Test**: Modify cell mapping for a partnership (add "Box 20 - Section 199A"), scan a K-1 PDF, verify the custom field appears in verification. Add an aggregation rule, verify computed summary appears on verification and KDocument detail.

### Implementation for User Story 4

- [ ] T038 [US4] Implement cell mapping service CRUD (get mappings with global fallback, upsert per-partnership mappings, reset to IRS default, aggregation rule CRUD, compute aggregates for a KDocument) in apps/api/src/app/cell-mapping/cell-mapping.service.ts
- [ ] T039 [US4] Implement cell mapping controller (GET /cell-mapping, PUT /cell-mapping, DELETE /cell-mapping/reset, GET /aggregation-rules, PUT /aggregation-rules, GET /aggregation-rules/compute) in apps/api/src/app/cell-mapping/cell-mapping.controller.ts
- [ ] T040 [US4] Create cell mapping page component (view/edit cell labels, add custom cells with isCustom flag, manage aggregation rules with source cell selection, reset to defaults button) in apps/client/src/app/pages/cell-mapping/cell-mapping-page.component.ts
- [ ] T041 [US4] Integrate per-partnership custom cell mappings into extraction pipeline (field mapper loads partnership-specific mappings, falls back to global defaults for unmapped boxes) in apps/api/src/app/k1-import/k1-field-mapper.service.ts

**Checkpoint**: Cell mapping customization is functional — custom mappings persist across imports

---

## Phase 7: User Story 5 — K-1 Import History & Re-Processing (Priority: P3)

**Goal**: Administrator views import history per partnership, re-processes previously uploaded PDFs with current cell mapping, and manages KDocument status transitions (DRAFT → ESTIMATED → FINAL) for estimated-to-final K-1 workflows

**Independent Test**: Scan two K-1 PDFs for the same partnership/year (one estimated, one final), verify both appear in import history, confirm KDocument status transitions from ESTIMATED to FINAL with updated values

### Implementation for User Story 5

- [ ] T042 [US5] Implement import history query (filter by partnershipId and optional taxYear, order by createdAt desc) in apps/api/src/app/k1-import/k1-import.service.ts and GET /api/v1/k1-import/history endpoint in k1-import.controller.ts
- [ ] T043 [US5] Implement reprocess endpoint (re-extract stored PDF with current cell mapping, create new session, original session unchanged) in apps/api/src/app/k1-import/k1-import.service.ts and POST /api/v1/k1-import/:id/reprocess in k1-import.controller.ts
- [ ] T044 [US5] Add import history list view (date, filename, status, tax year, link to KDocument) to K1 import page in apps/client/src/app/pages/k1-import/k1-import-page.component.ts
- [ ] T045 [US5] Implement KDocument status transitions (DRAFT → ESTIMATED → FINAL) with previous value preservation for audit trail (FR-024/FR-025) in apps/api/src/app/k1-import/k1-import.service.ts
- [ ] T046 [US5] Extend KDocument detail view with aggregation summary section (display named aggregation totals alongside raw box values per FR-036) in apps/client/src/app/pages/k-document/k-document-detail/

**Checkpoint**: All user stories should now be independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling, navigation integration, test fixtures, and end-to-end validation

- [ ] T047 [P] Add password-protected PDF detection (FR-029) and multi-entity PDF detection (edge case 5) to upload flow in apps/api/src/app/k1-import/k1-import.service.ts
- [ ] T048 [P] Add edge case warnings (EIN mismatch with existing entities, tax year mismatch, zero-extraction warning, ownership % change handling) to verification and confirmation flows in apps/api/src/app/k1-import/k1-import.service.ts
- [ ] T049 [P] Add K1 Import and Cell Mapping pages to application navigation/sidebar and register routes in apps/client/src/app/app-routing.module.ts
- [ ] T050 [P] Create test fixture K-1 PDF samples (one digital, one scanned) in test/import/sample-k1-digital.pdf and test/import/sample-k1-scanned.pdf
- [ ] T051 Run quickstart.md end-to-end workflow validation (upload → extract → review → verify → confirm → check KDocument + Distributions + Document created)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on User Story 1 (needs upload/extract to produce data for verification)
- **User Story 3 (Phase 5)**: Depends on User Story 2 (needs verified data to trigger auto-creation)
- **User Story 4 (Phase 6)**: Depends on Foundational phase — can run in parallel with US1–US3 (cell mapping CRUD is independent), but T041 (integration) should follow US1
- **User Story 5 (Phase 7)**: Depends on User Story 3 (needs confirmed imports for history and re-processing)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 — needs extraction results to display verification screen
- **User Story 3 (P1)**: Depends on US2 — needs verified data to trigger model object creation
- **User Story 4 (P2)**: Can start after Foundational — cell mapping CRUD is independent; integration task (T041) should follow US1
- **User Story 5 (P3)**: Depends on US3 — needs completed imports for history and status transitions

### Within Each User Story

- DTOs before services (when using validation decorators)
- Services before controllers (business logic before HTTP layer)
- Backend before frontend (API endpoints before UI components)
- Core implementation before integration/cross-cutting tasks

### Parallel Opportunities

**Setup phase**:
- T002 (prisma), T003 (interfaces), T004 (config), T006 (DTOs) — all different files, all parallel

**Foundational phase**:
- T007 (k1-import module) and T008 (cell-mapping module) — different directories, parallel
- T012 (frontend data service) and T013 (routes) — different files, parallel

**User Story 1**:
- T014 (pdf-parse), T015 (azure), T016 (tesseract), T017 (confidence) — four extractor/service files, all parallel
- T019 (upload DTO) parallel with T014–T018

**User Story 2**:
- T023 (verify DTO) parallel with T027 (aggregation service)

**User Story 4**:
- T038 (service) can start in parallel with US1–US3 since cell mapping CRUD is independent

**Polish phase**:
- T047, T048, T049, T050 — all different files/concerns, all parallel

---

## Parallel Example: User Story 1

```bash
# Launch all extractors in parallel (different files):
Task: T014 "Implement pdf-parse extractor in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts"
Task: T015 "Implement Azure extractor in apps/api/src/app/k1-import/extractors/azure-extractor.ts"
Task: T016 "Implement tesseract extractor in apps/api/src/app/k1-import/extractors/tesseract-extractor.ts"
Task: T017 "Implement confidence scoring in apps/api/src/app/k1-import/k1-confidence.service.ts"

# Then sequential (dependencies):
Task: T018 "Implement field mapper (depends on extractors + confidence service)"
Task: T020 "Implement import service upload orchestration (depends on T018)"
Task: T021 "Implement controller endpoints (depends on T020)"
Task: T022 "Create frontend upload page (depends on T012 data service + T021 API)"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 + 3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 — Upload & Scan
4. Complete Phase 4: User Story 2 — Review & Verify
5. Complete Phase 5: User Story 3 — Auto-Create Model Objects
6. **STOP and VALIDATE**: Test the complete pipeline end-to-end (upload → extract → verify → confirm → KDocument + Distributions created)
7. Deploy/demo if ready — this covers the core value proposition

### Incremental Delivery

1. **Setup + Foundational** → Foundation ready, modules registered, seed data loaded
2. **Add User Story 1** → Test: PDF upload extracts values → First working extraction
3. **Add User Story 2** → Test: Verification screen with editing → User can review/correct
4. **Add User Story 3** → Test: Confirmation creates model objects → **MVP complete!**
5. **Add User Story 4** → Test: Custom cell mapping persists → Customization available
6. **Add User Story 5** → Test: History + re-processing → Full workflow with audit trail
7. **Polish** → Edge cases, navigation, fixtures → Production-ready
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 → User Story 2 → User Story 3 (sequential — data dependencies)
   - Developer B: User Story 4 (parallel — independent cell mapping CRUD)
3. After US3 complete: Developer B takes User Story 5
4. Both developers collaborate on Polish phase

---

## Notes

- [P] tasks = different files, no dependencies on in-progress tasks
- [Story] label maps task to specific user story for traceability
- US1 → US2 → US3 are sequential (data pipeline dependencies) — cannot be parallelized across stories
- US4 (Cell Mapping) CAN start in parallel with US1–US3 (independent CRUD), except T041 (integration)
- Total tasks: 51 (Setup: 6, Foundational: 7, US1: 9, US2: 9, US3: 6, US4: 4, US5: 5, Polish: 5)
- No test tasks included — tests were not explicitly requested in the feature specification
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
