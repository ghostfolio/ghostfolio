# Research: Normalized Relational Model for K-1 Financial Data

**Phase 0 Output** | **Date**: 2026-03-20 | **Research Only — No Code**

---

## Context

The current system stores K-1 box data as a flat JSON blob on `KDocument.data`:

```json
{"1": 50000, "9a": -1200, "11-ZZ*": 500, "20-A": 1200}
```

Aggregations are computed on-the-fly in `k1-aggregation.service.ts` by iterating JSON keys. `CellMapping` provides label metadata, and `CellAggregationRule` defines which box keys to SUM. The system currently has ~80+ possible K-1 fields (boxes 1–21 with subtypes, Sections J/K/L/M/N, metadata fields like A–I).

The goal is to evaluate whether and how to transform this into a normalized relational model.

---

## Topic 1: Wide vs Normalized Financial Data Models

### Decision

**Move to a normalized fact table** (`K1LineItem`) for Part III financial data (boxes 1–21), but **keep a JSON metadata column** for Part I/II identity fields (A–I, J–N) that are queried infrequently.

### Rationale

The current JSON blob approach has these specific weaknesses for analytics:

**Query limitations observed in this codebase:**
1. **No SQL-level filtering or aggregation** — The `computeForKDocument()` method in `k1-aggregation.service.ts` must fetch the entire `KDocument` row, deserialize JSON, and loop through `Object.entries(data)` in application code. This means you cannot write `SELECT SUM(amount) FROM ... WHERE box_number = '1' AND tax_year BETWEEN 2020 AND 2025` — every aggregation requires fetching and deserializing all rows.
2. **No indexes on values** — Cannot index `data->'1'` effectively in PostgreSQL JSONB for range queries. While GIN indexes support containment (`@>`), they don't help with `>`, `<`, or `BETWEEN` on numeric values within the JSON.
3. **No referential integrity** — A typo like `"9A"` vs `"9a"` silently creates bad data. The current `CellMapping` table defines valid box numbers, but nothing enforces that `KDocument.data` keys match them.
4. **Cross-document aggregation is O(n) deserialization** — To compute "total ordinary income (Box 1) across all partnerships for 2025," every KDocument row matching the year must be fetched and parsed. With 50+ partnerships × 5 years, this is 250+ JSON deserializations for one number.
5. **No partial update tracking** — When a KDocument transitions from ESTIMATED → FINAL, the entire JSON blob is replaced. `previousData` preserves the old blob but provides no field-level diff.
6. **Schema evolution is invisible** — If the IRS adds a Box 6d in 2027, there's no migration — it just appears as a new JSON key. This sounds convenient but means no validation, no type checking, and no discoverability for future NL-to-SQL.

**When the wide/JSON model is acceptable:**
- Archival storage of the complete raw extraction (already served by `K1ImportSession.rawExtraction`)
- Rarely-queried metadata fields (Part I/II: partnership name, EIN, addresses)
- Configurations and user preferences (already used for `Settings.settings`)
- Fewer than ~10 documents with no cross-document queries needed

**When it breaks down (the current situation):**
- Cross-entity/cross-year aggregation (core family office use case)
- Performance analytics over time (partnership returns by year)
- Tax planning queries ("show me all partnerships with Section 1231 losses > $10K")
- Audit trail at field granularity
- LLM-generated SQL queries (LLMs cannot reliably generate JSONB path expressions)

### Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Keep JSON blob** (status quo) | No migration, flexible schema | All query limitations above; blocks analytics roadmap |
| **JSONB with generated columns** | No schema change for K-1 fields; PostgreSQL 12+ supports `GENERATED ALWAYS AS (data->>'1')::numeric` | Max ~30 generated columns practical; doesn't scale to 80+ fields; still no FK integrity |
| **Wide table with 80+ columns** | Simple queries, strong typing | Extremely sparse (most K-1s populate ~20 of 80+ boxes); ALTER TABLE for every IRS form change; NULL-heavy |
| **Normalized fact table** (chosen) | SQL aggregation, indexes, FK integrity, LLM-friendly, field-level audit trail | More JOINs; migration effort; slightly more complex insert logic |

---

## Topic 2: EAV vs Normalized Tables for Tax Document Fields

### Decision

**Use a hybrid approach**: a single EAV-style fact table (`K1LineItem`) for all Part III financial line items, combined with a reference/dimension table (`K1BoxDefinition`) that provides metadata, typing, and validation rules. Keep Part I/II identity metadata as structured JSON on the KDocument.

This is technically EAV but with strong constraints — it's closer to a **typed fact table** pattern than classic unconstrained EAV.

### Rationale

**Why EAV is appropriate here (and usually isn't):**

Classic EAV fails because it loses type safety, makes queries verbose, and resists validation. K-1 data avoids these pitfalls because:

1. **Uniform value type** — All Part III financial values (boxes 1–21) are `Decimal` amounts. Unlike generic EAV where attributes might be strings, dates, booleans, or blobs, K-1 line items are uniformly monetary amounts with a known currency. This eliminates the "value_string / value_number / value_date" anti-pattern.

2. **Closed attribute set** — The IRS defines ~50 Part III line items. This is not open-ended. The `K1BoxDefinition` reference table enumerates all valid attributes, so there's no unbounded attribute sprawl.

3. **Natural query pattern** — The primary queries are aggregations across one attribute dimension: `SUM(amount) WHERE box_key = '1'`. This is exactly what EAV is good at — pivot-style aggregation across a known set of attributes.

4. **Sparse data** — A typical K-1 populates 15–25 of ~50 possible line items. A wide table would be 50–70% NULL. The EAV/fact table stores only populated fields, which is both space-efficient and semantically clearer.

**Proposed structure (conceptual):**

```
K1BoxDefinition (reference/dimension table)
├── boxKey        VARCHAR PK   -- "1", "9a", "11-ZZ*", "20-A"
├── label         VARCHAR      -- "Ordinary business income (loss)"
├── section       VARCHAR      -- "PART_III", "PART_I", "SECTION_J"
├── dataType      VARCHAR      -- "CURRENCY", "PERCENTAGE", "BOOLEAN", "TEXT"
├── sortOrder     INT
├── irsFormLine   VARCHAR      -- "Box 1", "Box 9a", "Section J, Line 1"
└── description   TEXT

K1LineItem (fact table — one row per box per KDocument)
├── id              UUID PK
├── kDocumentId     UUID FK → KDocument.id
├── boxKey          VARCHAR FK → K1BoxDefinition.boxKey
├── amount          DECIMAL(15,2)    -- financial value (null for non-monetary)
├── textValue       VARCHAR          -- for text/boolean fields if needed
├── sourceConfidence DECIMAL(3,2)    -- 0.00–1.00, from extraction
├── sourcePageNumber INT             -- PDF page where extracted
├── sourceCoordinates JSON           -- {x, y, width, height} on the page
├── isUserEdited     BOOLEAN         -- true if user modified during verification
├── createdAt       TIMESTAMP
├── updatedAt       TIMESTAMP
└── @@unique([kDocumentId, boxKey])
```

**Why not separate normalized tables for each box category:**

An alternative is dedicated tables: `K1IncomeItems`, `K1DeductionItems`, `K1CreditItems`, `K1CapitalAccount`, etc. This was rejected because:
- K-1 boxes don't cleanly partition into fixed categories (Box 11 "Other income" spans multiple categories via sub-codes)
- Sub-code boxes (11-A through 11-ZZ*, 13-A through 13-ZZ*, 20-A through 20-ZZ*) have partnership-specific meaning — the same structural pattern repeats across boxes
- It would require 6–8 tables with identical column shapes, making queries harder, not easier
- The `K1BoxDefinition` reference table provides the categorical metadata without needing separate physical tables

**Treatment of Part I/II metadata fields:**

Fields like Partnership EIN (Box A), Partner name (Box F), Section J percentages, and Section L capital account data are better stored as structured JSON on `KDocument` in a `metadata` column because:
- They're queried for display, not for aggregation
- They have heterogeneous types (strings, booleans, percentages, addresses)
- They identify the document rather than representing financial facts
- There are ~30 of them, and they're almost all populated (not sparse)

### Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Pure EAV (no reference table)** | Maximum flexibility | No validation of box keys; `CellMapping` already serves this role but without FK enforcement |
| **Wide table (one column per box)** | Simple SELECTs for specific boxes | 80+ columns; 50–70% NULLs; ALTER TABLE for new boxes; poor for cross-box aggregation |
| **Separate tables per box category** | Strong typing per category | 6–8 near-identical tables; complex UNION queries; sub-code boxes don't fit cleanly |
| **Hybrid EAV + reference table** (chosen) | Uniform fact table; strong FK validation; sparse-friendly; single query pattern for aggregation; field-level provenance | Pivot queries needed for "show one K-1 as a form"; slightly more complex writes |

---

## Topic 3: Financial Fact Tables for Tax Data

### Decision

**Model K-1 line items as a financial fact table** in a star-schema-inspired design, with KDocument as the central bridge to dimension tables (Partnership, Entity, TaxYear). Monetary values stored as `DECIMAL(15,2)` with explicit currency.

### Rationale

Financial data warehouses consistently use a fact/dimension pattern for tax line items:

**Star schema mapping for K-1 data:**

```
                    ┌──────────────┐
                    │  Partnership │  (dimension)
                    │  ──────────  │
                    │  id, name,   │
                    │  type, ein   │
                    └──────┬───────┘
                           │
┌──────────────┐    ┌──────┴───────┐    ┌──────────────────┐
│   Entity     │────│  KDocument   │────│ K1BoxDefinition  │  (dimension)
│  (dimension) │    │  (bridge)    │    │  ────────────────│
│  ──────────  │    │  ──────────  │    │  boxKey, label,  │
│  id, name,   │    │  id, taxYear,│    │  section, type   │
│  type, taxId │    │  status      │    └──────────────────┘
└──────────────┘    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │  K1LineItem   │  (FACT)
                    │  ──────────  │
                    │  amount,     │
                    │  boxKey,     │
                    │  confidence  │
                    └──────────────┘
```

**Best practices from financial data warehousing applied here:**

1. **Additive facts only** — `K1LineItem.amount` is fully additive: you can SUM across tax years, partnerships, entities, or box types. Non-additive data (percentages, booleans, text) is stored separately in `textValue` or on the KDocument metadata.

2. **Grain = one box value per K-1 document** — Each row in `K1LineItem` represents one financial amount from one K-1 for one tax year. This is the atomic grain. Aggregation rules from `CellAggregationRule` operate on this grain.

3. **Slowly changing dimensions** — `PartnershipMembership` already handles SCD Type 2 (effective dates) for ownership percentages. `K1BoxDefinition` is SCD Type 1 (overwritten on IRS form changes, with version tracking if needed).

4. **Conformed dimensions** — `Partnership` and `Entity` serve as conformed dimensions shared between K-1 facts, Distribution facts, and Valuation facts. A single `Entity` dimension joins to multiple fact tables.

5. **Currency handling** — Store amounts in the source currency with a `currency` column. The KDocument inherits currency from Partnership. Conversion to reporting currency happens at query time or in materialized views, never by mutating the fact.

6. **Decimal precision** — `DECIMAL(15,2)` covers amounts up to $9,999,999,999,999.99. K-1 amounts from large partnerships (PE funds, hedge funds) can reach tens of millions. 15 digits provides headroom. Use 2 decimal places to match IRS reporting precision.

**Aggregation queries enabled by this model:**

```sql
-- Total ordinary income across all partnerships for 2025
SELECT SUM(li.amount)
FROM k1_line_item li
JOIN k_document kd ON li.k_document_id = kd.id
WHERE li.box_key = '1' AND kd.tax_year = 2025;

-- Income breakdown by entity for tax year 2025
SELECT e.name, li.box_key, SUM(li.amount)
FROM k1_line_item li
JOIN k_document kd ON li.k_document_id = kd.id
JOIN partnership p ON kd.partnership_id = p.id
JOIN partnership_membership pm ON pm.partnership_id = p.id
JOIN entity e ON pm.entity_id = e.id
WHERE kd.tax_year = 2025
GROUP BY e.name, li.box_key;

-- Partnership performance: Box 1 over time
SELECT kd.tax_year, p.name, li.amount
FROM k1_line_item li
JOIN k_document kd ON li.k_document_id = kd.id
JOIN partnership p ON kd.partnership_id = p.id
WHERE li.box_key = '1'
ORDER BY kd.tax_year;
```

These queries are impossible or impractical with the current JSON blob model.

### Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Snowflake schema (more normalization)** | Normalized box categories into sub-dimensions | Over-normalized for ~50 box types; extra JOINs for no benefit |
| **Flat denormalized reporting table** | Fastest reads; no JOINs | Write complexity; data duplication; hard to keep consistent |
| **OLAP cube / column store** | Best aggregation performance | Overkill for <10K rows; adds infrastructure complexity |
| **Star-schema-inspired fact table** (chosen) | Natural fit for K-1 aggregation queries; leverages existing dimensions; PostgreSQL handles this scale trivially | Requires JOINs for full context (acceptable) |

---

## Topic 4: Source Traceability in Financial Systems

### Decision

**Store extraction provenance at the line-item grain** — each `K1LineItem` records the source page number, bounding-box coordinates, raw extracted text, confidence score, and whether it was user-edited. The `K1ImportSession` retains the complete raw extraction as an immutable JSON snapshot.

### Rationale

The audit trail must support this flow:

```
Displayed aggregated number
  → K1LineItem (individual box value)
    → KDocument (which K-1, which year, which partnership)
      → K1ImportSession (extraction record)
        → Document (source PDF file)
          → Specific page + coordinates on that page
            → Raw extracted text before parsing
```

**Granularity levels and what to store where:**

| Level | Table | Fields | Purpose |
|---|---|---|---|
| **Aggregation** | Computed at query time | SUM/formula from `CellAggregationRule` | "Where does this total come from?" → list of K1LineItems |
| **Line item** | `K1LineItem` | `amount`, `boxKey`, `sourceConfidence`, `sourcePageNumber`, `sourceCoordinates`, `rawExtractedText`, `isUserEdited` | "What exactly was extracted and from where?" |
| **Document** | `K1ImportSession` | `rawExtraction` (full JSON), `extractionMethod`, `fileName` | "What did the system originally see?" (immutable after extraction) |
| **File** | `Document` | `filePath`, `fileSize`, `mimeType` | "Where is the original PDF?" |

**Key design principles:**

1. **Immutability of raw extraction** — `K1ImportSession.rawExtraction` is written once at extraction time and never modified. `verifiedData` captures user edits. This provides a complete before/after audit trail.

2. **Coordinate-level provenance** — Current `k1-positions-dump.txt` shows the parser already extracts `x, y` coordinates for each text element. Storing `sourceCoordinates: {x, y, width, height}` on each `K1LineItem` enables a future "click to highlight in PDF" feature.

3. **Confidence as first-class data** — The system already computes confidence scores (0.0–1.0) during extraction. Persisting this on the line item (not just in the import session JSON) enables queries like "show me all low-confidence values across all partnerships" and supports audit prioritization.

4. **User edit tracking** — `isUserEdited: boolean` distinguishes machine-extracted values from human-verified overrides. This is critical for audit and for training future extraction models.

5. **No deletion of source data** — When a KDocument transitions from ESTIMATED → FINAL, the old line items should be soft-versioned (via `KDocument.previousData` or a separate version table), not deleted.

**What NOT to store at line-item level:**
- Full PDF binary (stay on Document/filesystem)
- Complete OCR output for the entire page (stay on K1ImportSession.rawExtraction)
- Rendering coordinates for non-K-1 text on the page (not relevant)

### Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Provenance only at document level** | Simpler; fewer columns | Cannot trace an individual number back to a specific location on a page |
| **Separate provenance table** (K1LineItemProvenance) | Clean separation of concerns | Extra JOIN for every audit query; 1:1 relationship is usually better as columns |
| **Store full page image crops per line item** | Visual proof | Massive storage; PDF coordinates + original file are sufficient for re-rendering |
| **Provenance on line item** (chosen) | Direct traceability; no extra JOINs; enables "highlight in PDF"; supports audit queries | Slightly wider rows (acceptable for <10K rows) |

---

## Topic 5: PostgreSQL Materialized Views for Financial Reporting

### Decision

**Use materialized views for cross-partnership/cross-year aggregation dashboards**, refreshed on a schedule or triggered by KDocument changes. Use regular views for single-document or single-partnership queries. Do **not** use denormalized reporting tables.

### Rationale

**When to use each approach in this system:**

| Scenario | Approach | Reason |
|---|---|---|
| "Show Box 1–21 for one K-1" | Regular query on `K1LineItem` | Small result set; no aggregation; fast enough |
| "Total income by box for one partnership across years" | Regular SQL `GROUP BY` | <20 rows × <10 years = <200 rows; trivial for PostgreSQL |
| "Dashboard: all partnerships × all entities × 5 years" | **Materialized view** | Cross-joins across dimensions; 50 partnerships × 5 entities × 5 years × 20 boxes = 25,000 aggregated values; worth pre-computing |
| "Tax planning: find partnerships with specific loss patterns" | Materialized view or indexed view | Complex filtering across many K-1s |
| "YoY change in Box 1 by partnership" | Materialized view | Window functions over multiple years |

**Proposed materialized views:**

```sql
-- MV 1: K-1 Summary by Partnership/Year
CREATE MATERIALIZED VIEW mv_k1_partnership_year_summary AS
SELECT
    kd.partnership_id,
    kd.tax_year,
    li.box_key,
    bd.label,
    bd.section,
    SUM(li.amount) AS total_amount,
    COUNT(*) AS line_count,
    kd.filing_status
FROM k1_line_item li
JOIN k_document kd ON li.k_document_id = kd.id
JOIN k1_box_definition bd ON li.box_key = bd.box_key
GROUP BY kd.partnership_id, kd.tax_year, li.box_key, bd.label, bd.section, kd.filing_status;

-- MV 2: Entity-level Income Aggregation
CREATE MATERIALIZED VIEW mv_entity_income_summary AS
SELECT
    e.id AS entity_id,
    e.name AS entity_name,
    kd.tax_year,
    li.box_key,
    SUM(li.amount * pm.ownership_percent / 100) AS allocated_amount
FROM k1_line_item li
JOIN k_document kd ON li.k_document_id = kd.id
JOIN partnership_membership pm ON pm.partnership_id = kd.partnership_id
JOIN entity e ON pm.entity_id = e.id
WHERE pm.effective_date <= make_date(kd.tax_year, 12, 31)
  AND (pm.end_date IS NULL OR pm.end_date > make_date(kd.tax_year, 12, 31))
GROUP BY e.id, e.name, kd.tax_year, li.box_key;
```

**Refresh strategy:**

- **Trigger-based refresh**: After any KDocument insert/update/delete or status change to FINAL, refresh affected materialized views. In NestJS, this is a `@OnEvent('k-document.changed')` handler that calls `REFRESH MATERIALIZED VIEW CONCURRENTLY`.
- **`CONCURRENTLY` keyword**: Allows reads during refresh (requires a unique index on the MV). Essential for a multi-user system.
- **Frequency**: For a family office with <100 K-1s updated per year, refresh takes <1 second. No scheduling needed — event-driven refresh is sufficient.

**Why not denormalized reporting tables:**

Denormalized tables (duplicating data into a flat reporting structure) require write-time consistency management — every KDocument change must update the reporting table transactionally. This is the pattern used in high-write OLTP systems, but K-1 data is low-write (<100 writes/year) and high-read (dashboards queried many times). Materialized views handle this perfectly with zero application-level sync logic.

**Why not computed/generated columns:**

PostgreSQL generated columns cannot reference other tables. Since aggregations span KDocument → K1LineItem → Partnership → Entity, generated columns are structurally insufficient.

### Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Application-level caching** (Redis/in-memory) | No DB schema changes | Cache invalidation complexity; doesn't help SQL-based analytics |
| **Denormalized reporting tables** | Fastest reads; works at any scale | Write-time maintenance burden; consistency bugs; overkill for <10K rows |
| **Regular views** (not materialized) | Always fresh; no refresh needed | Recomputed on every query; slow for cross-entity dashboards |
| **Materialized views** (chosen) | Pre-computed; concurrent reads; event-driven refresh; zero application-level sync | Slight staleness (mitigated by event-driven refresh); requires unique indexes for CONCURRENTLY |

---

## Topic 6: Migration Strategy from JSON Blob to Normalized Tables

### Decision

**Phase the migration in 3 steps**: (1) Create new tables alongside existing JSON, (2) Dual-write to both during a transition period, (3) Make normalized tables authoritative. **Keep the JSON blob immutable as an archive** — never delete it.

### Rationale

**Step 1: Additive schema changes (zero breaking changes)**

```
Migration 1: Create K1BoxDefinition table, seed with IRS default box definitions
Migration 2: Create K1LineItem table with FK to KDocument and K1BoxDefinition
Migration 3: Backfill K1LineItem from existing KDocument.data JSON blobs
```

The backfill migration for Step 3:

```sql
-- Pseudocode: For each KDocument, iterate JSON keys and insert K1LineItems
INSERT INTO k1_line_item (id, k_document_id, box_key, amount, created_at, updated_at)
SELECT
    gen_random_uuid(),
    kd.id,
    je.key,
    (je.value)::decimal,
    kd.created_at,
    NOW()
FROM k_document kd,
     jsonb_each(kd.data::jsonb) AS je(key, value)
WHERE jsonb_typeof(je.value) = 'number';
```

**Step 2: Dual-write transition period**

During the transition:
- `k1-import.service.ts` `confirmImport()` writes to **both** `KDocument.data` (JSON) and `K1LineItem` (rows)
- Read operations gradually migrate from JSON-based to K1LineItem-based
- `k1-aggregation.service.ts` switches from JSON iteration to `SELECT SUM` on K1LineItem
- Run validation queries comparing JSON-derived totals to K1LineItem-derived totals

**Step 3: K1LineItem becomes authoritative**

- New features (dashboards, tax planning, LLM queries) read only from K1LineItem
- `KDocument.data` is retained as immutable archive but no longer written to for new documents
- `CellAggregationRule.sourceCells` continues to work — the boxKey values are the same strings
- `CellMapping` evolves into or is replaced by `K1BoxDefinition`

**Should the old JSON be kept immutable?**

**Yes, permanently.** Reasons:
1. **Audit requirement** — The JSON blob is the original imported representation. Regulatory and audit standards require preserving source data in its original form.
2. **Rollback safety** — If the migration has bugs, the JSON blob is the recovery source.
3. **Storage is trivial** — A JSON blob with ~30 key-value pairs is <1 KB. Even 1,000 KDocuments = <1 MB total. There's no storage pressure to delete it.
4. **Import session already preserves extraction** — `K1ImportSession.rawExtraction` holds the pre-verification extraction. `KDocument.data` holds the post-verification snapshot. Both should survive indefinitely.

**Backward compatibility considerations:**

- The `KDocument.data` column type stays `Json` (not nullable, not removed)
- The existing `k-document-form.component.ts` UI reads from `KDocument.data` — it continues to work during transition
- The `computeForKDocument()` aggregation service works against JSON through the transition, then switches to K1LineItem queries
- No existing API contracts change — `GET /k-documents/:id` returns the same shape

**Handling the CellMapping → K1BoxDefinition transition:**

The existing `CellMapping` table (per-partnership box definitions) maps closely to the proposed `K1BoxDefinition`. The migration strategy:
- `K1BoxDefinition` absorbs the global (partnershipId = null) CellMapping records
- Per-partnership CellMapping overrides become per-partnership `K1BoxDefinition` rows (or remain as display-layer configuration separate from the data model)
- `CellMapping` fields like `isIgnored`, `isCustom` are presentation concerns that may not belong on the data-layer `K1BoxDefinition`

### Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **Big-bang migration** (drop JSON, create tables, migrate in one step) | Clean; no dual-write complexity | Risk of data loss; requires full feature freeze; hard to validate |
| **Dual-write indefinitely** | Maximum safety | Permanent write overhead; divergence risk between JSON and rows |
| **Keep JSON as authoritative, add views** | No migration of writes | Doesn't solve the core query limitation; views over JSONB are slow |
| **Phased migration with immutable archive** (chosen) | Zero-downtime; incremental validation; rollback possible; preserves audit trail | Dual-write period adds complexity (bounded to weeks, not permanent) |

---

## Topic 7: Schema Design for Future LLM NL-to-SQL

### Decision

**Design tables with self-documenting names, add PostgreSQL `COMMENT ON` annotations for every table and column, use consistent naming conventions, and avoid ambiguity between similarly-named entities.**

### Rationale

LLMs generating SQL (via text-to-SQL or NL-to-SQL) work by receiving the schema as context and mapping natural language to table/column references. The schema itself is the prompt. Research from the Spider benchmark (Yale), BIRD benchmark, and production NL-to-SQL systems (e.g., Vanna.ai, DataHerald) identifies these factors as most impactful:

**1. Naming conventions that LLMs parse correctly:**

| Current Name | Problem | Proposed Name | Why Better |
|---|---|---|---|
| `KDocument` | "K" is ambiguous to LLMs | `k1_document` | Explicitly says "K-1" |
| `KDocument.data` | "data" is the most generic possible name | `k1_document.raw_data_json` | Describes what it holds |
| `K1LineItem.amount` | Could be confused with Distribution.amount | `k1_line_item.reported_amount` | Disambiguates |
| `CellMapping` | "Cell" is a spreadsheet term, not a tax term | `k1_box_definition` | Domain-specific |
| `CellAggregationRule` | LLMs may not connect "cell" to K-1 boxes | `k1_aggregation_rule` | Clearer context |

**Naming conventions to adopt:**
- `snake_case` for all table and column names (PostgreSQL convention; LLMs trained on more snake_case SQL than camelCase)
- Prefix K-1-specific tables with `k1_` to create a namespace
- Use `_id` suffix for all foreign keys
- Avoid abbreviations (`partnership_id` not `ptnr_id`)
- Use `_at` suffix for timestamps (`created_at`, `updated_at`)
- Use descriptive names over short names (`tax_year` not `yr`, `filing_status` not `status`)

**2. PostgreSQL COMMENT annotations:**

```sql
COMMENT ON TABLE k1_line_item IS 'Individual financial line item from an IRS Schedule K-1 (Form 1065). One row per box number per K-1 document.';
COMMENT ON COLUMN k1_line_item.box_key IS 'IRS K-1 box identifier such as "1" for ordinary income, "9a" for long-term capital gains, or "20-A" for other information code A.';
COMMENT ON COLUMN k1_line_item.reported_amount IS 'Dollar amount reported on this K-1 line item, in the partnership base currency. Negative values represent losses.';
COMMENT ON TABLE k1_box_definition IS 'Reference table of IRS Schedule K-1 box definitions. Maps box identifiers to human-readable labels and categories.';
```

LLM NL-to-SQL systems extract these comments as schema context. A model asked "what is total ordinary income?" can map "ordinary income" → `k1_box_definition.label = 'Ordinary business income (loss)'` → `box_key = '1'` → join to `k1_line_item`.

**3. Avoiding ambiguity:**

Current pain points for LLM-generated SQL:
- `Distribution.amount` vs `K1LineItem.amount` — an LLM asked "total distributions" might query the wrong table. Solution: `k1_line_item.reported_amount` vs `distribution.distribution_amount`.
- `Partnership` has `distributions`, `kDocuments`, `valuations` — naming all FK columns `partnership_id` is correct and expected by LLMs.
- `Entity` is overloaded (database entities, legal entities). The table comment must clarify: "A legal person or structure (trust, LLC, individual) that owns assets and receives K-1 allocations."

**4. Schema metadata table for LLM context:**

Consider a lightweight `schema_metadata` table or a markdown document that provides the LLM with:
- Table relationships in natural language
- Common query patterns with examples
- Business rules ("Box 19a distributions are allocated to entities by ownership percentage")
- Valid values for enum columns

This is cheaper than fine-tuning and more maintainable than few-shot prompts.

**5. Avoid patterns that confuse LLMs:**

| Anti-pattern | Why It Confuses LLMs | Alternative |
|---|---|---|
| JSON columns for queryable data | LLMs generate `->` / `->>` operators inconsistently | Normalized columns |
| Composite primary keys | LLMs often forget one part of the key in JOINs | Surrogate UUID PK + unique constraint |
| Polymorphic FKs (one FK, multiple target tables) | LLMs can't determine which table to JOIN | Separate FK columns |
| Generic column names (`type`, `status`, `data`, `value`) | Ambiguous across tables | Prefix with table context (`filing_status`, `box_data_type`) |
| Soft deletes (`is_deleted`) | LLMs forget the `WHERE is_deleted = false` filter | Use `end_date IS NULL` pattern (already in use for memberships) |

### Alternatives Considered

| Alternative | Pros | Cons |
|---|---|---|
| **No schema changes for LLM** | No work | LLM accuracy drops significantly with ambiguous/generic names; JSONB columns are nearly unusable for NL-to-SQL |
| **Fine-tune LLM on this schema** | Can handle any naming convention | Expensive; needs retraining on every schema change; vendor lock-in |
| **RAG over schema docs** | Flexible; schema-aware | Still limited by underlying schema quality; garbage-in-garbage-out |
| **Self-documenting schema + COMMENT annotations** (chosen) | Works with any LLM; zero runtime cost; maintainable; improves human readability too | Requires discipline to maintain comments on schema changes |

---

## Summary of Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Wide vs Normalized | Normalized fact table for Part III financial data; JSON retained for Part I/II metadata |
| 2 | EAV vs Normalized | Hybrid: typed EAV fact table (`K1LineItem`) with reference dimension (`K1BoxDefinition`); uniform `DECIMAL` value type avoids classic EAV pitfalls |
| 3 | Financial fact tables | Star-schema-inspired design with `K1LineItem` as fact, `KDocument`/`Partnership`/`Entity` as dimensions |
| 4 | Source traceability | Per-line-item provenance (page, coordinates, confidence, raw text, user-edit flag); K1ImportSession.rawExtraction as immutable full extraction archive |
| 5 | Materialized views | Event-driven materialized views for cross-entity dashboards; regular queries for single-document access |
| 6 | Migration strategy | 3-phase: additive tables → dual-write → K1LineItem authoritative; JSON blob kept immutable forever |
| 7 | LLM NL-to-SQL | Self-documenting `snake_case` names, `COMMENT ON` annotations, disambiguation of similar columns, `k1_` table prefix namespace |
