# Feature Specification: K-1 Normalized Data Model

**Feature Branch**: `006-k1-model-review`  
**Created**: 2026-03-20  
**Status**: Draft  
**Input**: Transform K-1 financial data from JSON blob storage to a normalized relational model (K1LineItem + K1BoxDefinition) enabling SQL-level aggregation, indexing, LLM-friendly queries, and field-level audit trails.

**Out of scope**: Angular dashboard UI, LLM NL-to-SQL integration, PDF extraction changes. This feature is backend-only: Prisma schema, migrations, service layer, and API endpoints.

## Clarifications

### Session 2026-03-20

- Q: How should the CellMapping → K1BoxDefinition transition be handled? → A: Replace entirely — delete CellMapping, migrate all data to K1BoxDefinition. Per-partnership overrides become rows in K1BoxDefinition with a nullable partnershipId column.
- Q: When should K1AggregationService switch from JSON iteration to K1LineItem SQL? → A: Switch reads immediately once dual-write is active and backfill is complete. JSON read path kept only as validation fallback.
- Q: How are ESTIMATED → FINAL K-1 transitions handled for K1LineItem rows? → A: Soft version — old rows kept with an `isSuperseded` flag. New rows are the active version. Aggregation queries filter to non-superseded rows only.
- Q: How should the backfill handle JSON keys that don't match any K1BoxDefinition entry? → A: Auto-create a K1BoxDefinition row (using CellMapping label if available, otherwise key as label) with `isCustom = true`, then insert the K1LineItem. Never skip data.
- Q: Does this feature include building Angular dashboard UI? → A: Backend only — schema, migration, backfill, dual-write, aggregation service, API endpoints. No new Angular UI. Existing UI continues to work. Dashboard UI is a separate future feature.

### Session 2026-03-21

- Q: Should migration use phased dual-write (FR-006/007/008/009) or clean break with DB reset? → A: Clean break — drop old tables (CellMapping, CellAggregationRule), create K1BoxDefinition + K1LineItem as the only data path. No dual-write, no JSON backfill, no immutable JSON archive. Database will be cleared and K-1 PDFs re-imported. FR-006 (backfill), FR-007 (dual-write), FR-008 (immutable JSON), FR-009 (gradual read switch) are removed. User Story 3 (backfill) and User Story 4 (dual-write) are removed. K-1 PDF parsing accuracy must remain 100%.
- Q: What happens to the KDocument.data JSON column in the clean-break model? → A: Keep as `Json?` (nullable) convenience snapshot written during confirm. K1LineItem is the sole authoritative data source. No code reads from KDocument.data for aggregation or queries. Column exists only as a debugging/archival convenience.
- Q: How should parsing accuracy be verified before committing changes? → A: Run a comparison test — import a known K-1 PDF through both the old pipeline (JSON blob output) and the new pipeline (K1LineItem output), then assert exact numeric parity for every box value. This validates the new storage path doesn't lose or alter any data. No code is committed until this passes.
- Q: Should KDocument.previousData and previousFilingStatus be kept or dropped? → A: Drop both. `filingStatus` stays on KDocument (describes the document status). Version history is handled entirely by K1LineItem `isSuperseded` pattern. `previousData` (JSON blob diff) and `previousFilingStatus` are dead columns in the clean-break model.
- Q: Should K1ImportSession.verifiedData and rawExtraction be kept or dropped? → A: Keep `rawExtraction` (immutable record of what parser saw before human intervention — valuable for debugging extraction accuracy and reprocessing). Drop `verifiedData` — K1LineItem rows with `isUserEdited` flag are the verified data. Avoids two sources of truth.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Query K-1 Financial Data via SQL (Priority: P1)

As a family office administrator, I want K-1 financial line items stored in a normalized relational table so I can run SQL aggregations (e.g., total ordinary income by partnership by year) without deserializing JSON blobs.

**Why this priority**: The current JSON blob model (`KDocument.data`) prevents any SQL-level filtering, aggregation, or indexing. Every aggregation requires fetching all rows and parsing JSON in application code. This is the core blocker for analytics, dashboards, and future LLM NL-to-SQL.

**Independent Test**: After migration, `SELECT SUM(amount) FROM k1_line_item WHERE box_key = '1' AND k_document_id IN (SELECT id FROM k_document WHERE tax_year = 2025)` returns the correct total ordinary income.

**Acceptance Scenarios**:

1. **Given** a confirmed K-1 import, **When** the system writes K1LineItem rows, **Then** each populated Part III box (1–21) has a corresponding row with amount, boxKey, and provenance metadata.
2. **Given** multiple K-1 documents across partnerships, **When** I run a GROUP BY aggregation on K1LineItem, **Then** I get correct sums per box per year without application-level JSON parsing.
3. **Given** a K1LineItem row, **When** I inspect its provenance fields, **Then** I can see the source page number, coordinates, raw text, confidence score, and whether it was user-edited.

---

### User Story 2 - Validate K-1 Box Keys via Reference Table (Priority: P1)

As a system maintainer, I want a K1BoxDefinition reference table that enumerates all valid IRS K-1 box identifiers so that invalid box keys cannot be stored and new IRS form changes are handled by adding rows, not altering schema.

**Why this priority**: The current system has no referential integrity on box keys. A typo like "9A" vs "9a" silently creates bad data. CellMapping provides labels but no FK enforcement.

**Independent Test**: Inserting a K1LineItem with `boxKey = 'INVALID'` fails with an FK constraint violation. Inserting with `boxKey = '1'` succeeds.

**Acceptance Scenarios**:

1. **Given** the K1BoxDefinition table is seeded, **When** I query it, **Then** I see all ~50 IRS-defined box keys with labels, sections, data types, and sort order.
2. **Given** a K1LineItem insert with an invalid boxKey, **When** the database enforces the FK, **Then** the insert fails with a clear constraint error.
3. **Given** the IRS adds a new box in a future year, **When** an admin adds a row to K1BoxDefinition, **Then** the system supports the new box without any schema migration.

---

### ~~User Story 3 - Backfill~~ (REMOVED — Session 2026-03-21)

> Removed: Clean-break migration eliminates the need for JSON-to-K1LineItem backfill. Database will be cleared and K-1 PDFs re-imported through the new pipeline.

---

### ~~User Story 4 - Dual-Write~~ (REMOVED — Session 2026-03-21)

> Removed: Clean-break migration eliminates the dual-write transition period. K1LineItem is the sole write target from day one. No JSON blob compatibility needed.

---

### User Story 5 - Cross-Entity Dashboard Queries (Priority: P3, renumbered to P2)

> **Scope note**: This user story covers backend API endpoints and materialized views only. No Angular UI is included in this feature. Dashboard frontend is deferred to a future spec.

As a family office manager, I want to query K-1 data across all entities and partnerships for a given tax year to see aggregated income, deductions, and capital gains on a dashboard.

**Why this priority**: This is the analytics payoff of normalization — impossible with JSON blobs without O(n) deserialization.

**Independent Test**: A single SQL query joining K1LineItem → KDocument → Partnership → Entity returns correct per-entity totals.

**Acceptance Scenarios**:

1. **Given** K1LineItem data exists for multiple partnerships and entities, **When** I query with GROUP BY entity and box_key, **Then** I get correct aggregated amounts.
2. **Given** materialized views are created, **When** K-1 data changes, **Then** views are refreshed and dashboard queries return updated totals.

---

### Edge Cases

- What happens when an extracted box key doesn't match any K1BoxDefinition entry during import? Answer: Auto-create a K1BoxDefinition row with `isCustom = true`, using the raw key as the label. No data is ever skipped.
- How are non-numeric JSON values (e.g., "SEE STMT", boolean checkboxes) handled in K1LineItem?
- What happens when a K-1 has multiple subtypes for the same box (e.g., Box 20-A, 20-B, 20-V)?
- How is currency handled — does K1LineItem store amounts in source currency or reporting currency?
- What happens to CellMapping and CellAggregationRule after K1BoxDefinition is introduced? Answer (Session 2026-03-21): Both are dropped in the clean-break migration. K1BoxDefinition fully replaces CellMapping. Aggregation rules are reimplemented against K1LineItem SQL.
- How are ESTIMATED → FINAL K-1 transitions handled with line items? Answer: Soft versioning — old K1LineItem rows are marked `isSuperseded = true`. New rows from the FINAL K-1 are inserted as the active version. Aggregation queries filter `WHERE isSuperseded = false`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST create a `K1BoxDefinition` reference table with boxKey (PK), label, section, dataType, sortOrder, irsFormLine, and description columns.
- **FR-002**: System MUST seed `K1BoxDefinition` with all ~50 IRS-defined K-1 Part III box identifiers (boxes 1–21 including subtypes).
- **FR-003**: System MUST create a `K1LineItem` fact table with FK to KDocument and FK to K1BoxDefinition.
- **FR-004**: Each `K1LineItem` row MUST store: amount (DECIMAL(15,2)), raw extracted text, source confidence (0.00–1.00), source page number, source coordinates (JSON), and isUserEdited flag.
- **FR-005**: System MUST enforce `@@unique([kDocumentId, boxKey])` to prevent duplicate line items per K-1 document per box.
- ~~**FR-006**: System MUST backfill existing KDocument.data JSON blobs into K1LineItem rows via migration.~~ (REMOVED — clean break, Session 2026-03-21)
- ~~**FR-007**: `K1ImportService.confirm()` MUST dual-write to both KDocument.data JSON and K1LineItem rows.~~ (REMOVED — clean break, Session 2026-03-21)
- ~~**FR-008**: System MUST NOT delete or modify existing KDocument.data JSON (immutable archive).~~ (REMOVED — clean break, Session 2026-03-21)
- **FR-009**: `K1ImportService.confirm()` MUST write exclusively to K1LineItem rows. `K1AggregationService` MUST use SQL aggregation on K1LineItem as the sole data source. No JSON read/write path.
- **FR-010**: System MUST create materialized views for cross-partnership/cross-entity aggregation.
- **FR-011**: Materialized views MUST be refreshed after KDocument status changes (event-driven).
- **FR-012**: All new tables MUST use `snake_case` naming convention and include `COMMENT ON` annotations for LLM discoverability.
- **FR-013**: Non-numeric K-1 values (text like "SEE STMT", booleans) MUST be stored in a `textValue` column on K1LineItem with `amount` set to null.
- **FR-014**: K1LineItem MUST support subtype codes via the boxKey format (e.g., "11-ZZ*", "20-A") matching K1BoxDefinition entries.
- **FR-016**: K1LineItem MUST include an `isSuperseded` boolean (default false). When a KDocument transitions from ESTIMATED to FINAL, existing line items are marked `isSuperseded = true` and new line items are inserted. Aggregation queries MUST filter `WHERE isSuperseded = false`.
- **FR-017**: During K-1 import, if an extracted box key does not match any existing K1BoxDefinition entry, the system MUST auto-create a K1BoxDefinition row with `isCustom = true` (using the raw key as label) and then insert the K1LineItem. No data may be skipped.
- **FR-015**: System MUST replace CellMapping entirely with K1BoxDefinition. Global box definitions become rows with `partnershipId = null`. Per-partnership overrides (isIgnored, isCustom, customLabel) become rows with a non-null `partnershipId`. CellMapping table is dropped after migration. CellAggregationRule must be updated to reference K1BoxDefinition.

### Key Entities

- **K1BoxDefinition**: Replaces CellMapping. IRS-defined reference table of valid K-1 box identifiers with optional `partnershipId` for per-partnership overrides. Global rows (partnershipId = null) define IRS defaults (~50 rows). Per-partnership rows override labels, ignored status, or add custom entries. Also serves as FK target for K1LineItem validation.
- **K1LineItem**: Fact table storing one financial line item per box per K-1 document. Links to KDocument (filing context) and K1BoxDefinition (field metadata). Contains amount, provenance metadata, and user-edit tracking.
- **KDocument** (existing): Bridge dimension linking K1LineItems to Partnership and tax year. `data` column changed to `Json?` (nullable) — written during confirm as a debugging convenience snapshot. Not read by any aggregation or query code. K1LineItem is the sole authoritative source. `previousData` and `previousFilingStatus` columns dropped (versioning handled by K1LineItem `isSuperseded`). `filingStatus` retained on KDocument.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: After re-importing K-1 PDFs, every box value stored in K1LineItem exactly matches the source PDF (100% data fidelity).
- **SC-002**: SQL aggregation queries on K1LineItem return results within 50ms for datasets up to 1,000 K-1 documents.
- **SC-003**: Invalid boxKey insertions are rejected by FK constraint with zero exceptions.
- **SC-004**: After re-importing a K-1 PDF through the new pipeline, every extracted box value matches the original PDF exactly (100% parsing accuracy). Verified by comparison test: import same PDF through old pipeline (JSON) and new pipeline (K1LineItem), assert exact numeric parity for every box.
- **SC-005**: The complete import→confirm→query pipeline works end-to-end: upload PDF → extract → verify → confirm → K1LineItem rows queryable via SQL.
- **SC-006**: No code changes are committed until the comparison test passes for at least one real K-1 PDF.
