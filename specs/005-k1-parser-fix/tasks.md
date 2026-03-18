# Tasks: Fix K-1 PDF Parser — Position-Based Extraction

**Input**: Design documents from `/specs/005-k1-parser-fix/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/extraction.md, quickstart.md

**Tests**: Not explicitly requested — test tasks omitted.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in all descriptions

## Path Conventions

- **Monorepo (Nx)**: `apps/api/src/`, `libs/common/src/`
- **Extractor module**: `apps/api/src/app/k1-import/extractors/`
- **Shared interfaces**: `libs/common/src/lib/interfaces/`

---

## Phase 1: Setup

**Purpose**: Expand shared interfaces to support new extraction fields

- [x] T001 Add `subtype: string | null`, `fieldCategory: string`, and `isCheckbox: boolean` to K1ExtractedField interface, and add `x: number`, `y: number`, `fontName: string` to K1UnmappedItem interface in libs/common/src/lib/interfaces/k1-import.interface.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core extraction infrastructure that ALL user stories depend on — pdfjs-dist integration, position regions, font discrimination, value parsing

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Create K1PositionRegion interface and export all 73 bounding box region definitions (Header, Part I, Part II, Sections J/K/L/M/N, Part III left boxes 1-13, Part III right boxes 14-21) with ±15pt tolerance using verified anchor coordinates from research.md in apps/api/src/app/k1-import/extractors/k1-position-regions.ts
- [x] T003 Replace existing regex-based extraction with pdfjs-dist scaffold: dynamic `await import('pdfjs-dist/legacy/build/pdf.mjs')`, GlobalWorkerOptions.workerSrc set to `file://` path of pdf.worker.mjs, getDocument() with buffer, getPage(1), getTextContent(), and pdfDoc.destroy() cleanup in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T004 Implement dynamic font discrimination using textContent.styles: classify each font as template (serif fontFamily) or data (sans-serif/monospace fontFamily), filter text items to only data-font items in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T005 Implement findRegionForPosition() function that takes (x, y) coordinates and returns the matching K1PositionRegion from the 73-region map using ±15pt bounding box tolerance, or null if no match in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T006 Implement parseK1Value() utility: strip commas, parenthesized values → negative number, leading minus → negative, "SEE STMT" → numericValue null, "X" → checkbox true, dollar sign strip, preserve decimal percentages without rounding in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts

**Checkpoint**: Foundation ready — pdfjs-dist loads PDFs, data-font items are isolated, positions match to regions, values parse correctly

---

## Phase 3: User Story 1 — Accurate K-1 Value Extraction (Priority: P1) 🎯 MVP

**Goal**: Extract all Part III box values (boxes 1-21) with correct box numbers, values, signs, and subtype codes

**Independent Test**: Upload a sample K-1 PDF and verify Part III boxes are correctly extracted — box 1 = 498,211; box 11 ZZ* = (409,615); box 19 A = 4,493,757; box 20 with 4 subtypes; box 21 * = 196

### Implementation for User Story 1

- [x] T007 [US1] Implement Part III extraction loop: iterate data-font items, match to Part III regions (left column boxes 1-13, right column boxes 14-21), build K1ExtractedField with boxNumber, rawValue, numericValue, fieldCategory='PART_III' in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T008 [US1] Implement subtype code pairing: for regions with hasSubtype=true, find code text item and value text item at same y-band (±8pts) using subtypeXMin/XMax ranges from k1-position-regions.ts, set subtype field on K1ExtractedField in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T009 [US1] Handle multi-subtype boxes (box 20 with A, B, Z, * at ~23pt vertical spacing): produce separate K1ExtractedField entry for each subtype/value pair within the box's y-range in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T010 [US1] Wire Part III extraction into the main extract() method: call extraction after font filtering and position matching, merge Part III fields into K1ExtractionResult.fields array in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts

**Checkpoint**: Part III boxes 1-21 fully extracted with subtypes — User Story 1 independently testable via upload

---

## Phase 4: User Story 2 — Partnership & Partner Metadata Extraction (Priority: P1)

**Goal**: Extract Part I (partnership info) and Part II (partner info) metadata — names, EINs, addresses, tax year, filing status

**Independent Test**: Upload a K-1 PDF and verify partnership name, EIN, partner name, tax year, and final/amended status are correctly populated on K1ExtractionResult.metadata

### Implementation for User Story 2

- [x] T011 [US2] Implement header region extraction: match data items to Header regions for tax year (combine "20" + "25"), tax year begin/end dates, Final K-1 flag, Amended K-1 flag in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T012 [US2] Implement Part I extraction: match data items to Part I regions for partnership EIN (field A), partnership name and address (field B), and IRS Center (field C) in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T013 [US2] Implement Part II extraction: match data items to Part II regions for partner EIN (field D), partner name (field E), address (field F), and partner type general/limited (field G) and domestic/foreign (field H) in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T014 [US2] Assemble K1ExtractionResult.metadata object from extracted header, Part I, and Part II fields, setting partnershipName, partnershipEin, partnerName, partnerEin, taxYear, isFinal, isAmended in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts

**Checkpoint**: Metadata fully populated — User Story 2 independently testable via upload

---

## Phase 5: User Story 3 — Part I/II Financial Fields Extraction (Priority: P2)

**Goal**: Extract Sections J (percentages), K (liabilities), L (capital account), M (contributed property), N (net 704(c) gain/loss)

**Independent Test**: Upload a K-1 PDF and verify Section J percentages (3.032900 / 0.000000), Section K nonrecourse (498,211), Section L capital values with correct signs, Section N values are extracted

### Implementation for User Story 3

- [x] T015 [US3] Implement Section J extraction: match data items to 7 Section J regions for profit/loss/capital beginning and ending percentages, plus decrease-in-sale field, with fieldCategory='SECTION_J' in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T016 [US3] Implement Section K extraction: match data items to 8 Section K regions for nonrecourse/qualified nonrecourse/recourse beginning and ending liabilities, plus K-2/K-3 checkbox regions, with fieldCategory='SECTION_K' in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T017 [US3] Implement Section L extraction: match data items to 6 Section L regions for beginning capital, capital contributed, current year net income/loss, other increase/decrease, withdrawals/distributions, ending capital with fieldCategory='SECTION_L' in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T018 [US3] Implement Section M (contributed property yes/no checkbox) and Section N (beginning and ending net 704(c) gain/loss values) extraction with fieldCategory='SECTION_M' and 'SECTION_N' respectively in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts

**Checkpoint**: All J/K/L/M/N financial fields extracted — User Story 3 independently testable

---

## Phase 6: User Story 4 — Checkbox and Boolean Field Extraction (Priority: P2)

**Goal**: Detect all checkbox fields (Final K-1, Amended K-1, General/Limited, Domestic/Foreign, K-2/K-3 attached) as boolean values

**Independent Test**: Upload a K-1 PDF with known checkbox states and verify Final K-1 = true, Limited partner = true, Domestic = true, box 16 K-3 attached = true

### Implementation for User Story 4

- [x] T019 [US4] Implement checkbox detection: for all regions with valueType='checkbox', check if an "X" text item exists at the checkbox position, build K1ExtractedField with rawValue="X", numericValue=null, isCheckbox=true, fieldCategory='CHECKBOX' for checked boxes in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T020 [US4] Ensure unchecked checkboxes are either omitted or included with rawValue="" and isCheckbox=true to distinguish from missing data, and verify checkbox fields set on K1ExtractionResult.metadata (isFinal, isAmended) in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts

**Checkpoint**: All checkbox fields correctly detected as boolean values — User Story 4 independently testable

---

## Phase 7: User Story 5 — Manual Mapping Fallback for Ambiguous Fields (Priority: P3)

**Goal**: Data-font values that don't match any region appear in unmappedItems with position info for manual assignment

**Independent Test**: Upload a K-1 PDF where some values fall outside expected regions and verify those values appear in unmappedItems with raw text, x, y, fontName, pageNumber

### Implementation for User Story 5

- [x] T021 [US5] After all region matching is complete, collect remaining unmatched data-font items into K1UnmappedItem[] with rawLabel='', rawValue, numericValue (parsed), confidence=0.5, pageNumber=1, x, y, fontName in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T022 [US5] Verify unmapped items integrate with existing review UI manual assignment flow: ensure assignedBoxNumber and resolution fields on K1UnmappedItem work with the confirmation endpoint in apps/api/src/app/k1-import/k1-import.service.ts

**Checkpoint**: Zero data loss — all extracted values either mapped to fields or available in unmappedItems for manual assignment

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, confidence scoring, cleanup, and service integration

- [x] T023 Implement graceful error handling: wrap extraction in try/catch, return empty fields + low confidence + meaningful error for non-K-1 and corrupted PDFs, never crash on unexpected content in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T024 Implement confidence scoring: HIGH (≥0.90) when value center is within region center ±5pts, MEDIUM (0.70-0.89) within ±10pts, LOW (0.50-0.69) at tolerance boundary ±15pts; compute overallConfidence as weighted average in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T025 Ensure pdfDoc.destroy() cleanup runs in all code paths (success, error, empty result) using try/finally in apps/api/src/app/k1-import/extractors/pdf-parse-extractor.ts
- [x] T026 [P] Update k1-import.service.ts to handle new subtype field when building K1Cell records — concatenate subtype into boxNumber (e.g., "11-ZZ*", "20-A") or store via metadata JSON column in apps/api/src/app/k1-import/k1-import.service.ts
- [x] T027 Run quickstart.md verification checklist: upload test K-1 PDF, verify all 9 checklist items pass (box 11/19/20/21, Section J/L, Final K-1 checkbox, unmapped empty, non-K-1 error)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: T002 can run in parallel with T001 (different files). T003-T006 depend on T001 (interface types) and execute sequentially in pdf-parse-extractor.ts
- **User Stories (Phase 3-7)**: ALL depend on Foundational phase completion (T001-T006)
  - US1 (Phase 3) and US2 (Phase 4): Both P1, execute sequentially (same file)
  - US3 (Phase 5) and US4 (Phase 6): Both P2, execute after US1+US2 (same file)
  - US5 (Phase 7): P3, executes last of user stories
- **Polish (Phase 8)**: T023-T025 depend on all user stories. T026 is independent (different file, marked [P])

### User Story Dependencies

- **US1 (P1)**: Depends only on Foundational. No dependency on other stories.
- **US2 (P1)**: Depends only on Foundational. No dependency on US1 (metadata vs Part III are separate regions).
- **US3 (P2)**: Depends only on Foundational. J/K/L/M/N regions are independent of Part III.
- **US4 (P2)**: Depends only on Foundational. Checkbox detection is position-based, independent of value extraction. Some overlap with US2 (Final/Amended checkboxes set metadata flags).
- **US5 (P3)**: Depends on US1-US4 being done (unmapped = whatever's left after all matching).

### Within Each User Story

- Region matching before subtype pairing
- Subtype pairing before multi-subtype handling
- Core extraction before wiring into extract()
- Story complete before moving to next priority

### Parallel Opportunities

- **T001 + T002**: Interface expansion and position regions file — different files, no dependencies
- **T026**: Service update — different file from extractor, can run in parallel with T023-T025
- **US1-US4**: While all modify the same extractor file (sequential), each story's extraction logic is a self-contained function that could theoretically be developed in parallel branches

---

## Parallel Example: Foundational Phase

```
# These two tasks can run simultaneously:
Task T001: "Expand interfaces in k1-import.interface.ts"
Task T002: "Create position regions in k1-position-regions.ts"

# Then sequentially in pdf-parse-extractor.ts:
Task T003: "Scaffold pdfjs-dist infrastructure"
Task T004: "Font discrimination logic"
Task T005: "Position matching engine"
Task T006: "Value parsing utility"
```

## Parallel Example: Polish Phase

```
# These can run simultaneously (different files):
Task T023-T025: "Error handling, confidence, cleanup in pdf-parse-extractor.ts"
Task T026: "Service subtype handling in k1-import.service.ts"

# Final validation after all above:
Task T027: "Run quickstart.md verification checklist"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001) — interface expansion
2. Complete Phase 2: Foundational (T002-T006) — pdfjs-dist + regions + font + parsing
3. Complete Phase 3: User Story 1 (T007-T010) — Part III boxes 1-21
4. **STOP and VALIDATE**: Upload test K-1 PDF, verify Part III extraction
5. This delivers the core value — accurate box values replace broken regex parser

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 (Part III) → Test independently → **MVP!**
3. Add US2 (Metadata) → Test independently → Metadata populated
4. Add US3 (J/K/L/M/N) → Test independently → Financial fields complete
5. Add US4 (Checkboxes) → Test independently → Boolean fields detected
6. Add US5 (Unmapped) → Test independently → Zero data loss guaranteed
7. Polish → Error handling, confidence, service integration

### Single Developer Flow

All user story tasks modify the same extractor file, so execute sequentially:
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) → Phase 5 (US3) → Phase 6 (US4) → Phase 7 (US5) → Phase 8 (Polish)

---

## Notes

- All 73 position regions are defined in T002 upfront — individual story phases use them
- No new npm dependencies required (pdfjs-dist already installed via pdf-parse)
- The extractor rewrite preserves the existing K1Extractor interface contract (extract + isAvailable)
- Keep isDigitalK1() from the existing extractor — it's used by isAvailable()
- Font names are dynamic — never hardcode specific font names like "g_d0_f8"
- Total: 27 tasks across 8 phases covering 5 user stories
