# Data Model: K-1 Normalized Data Model

**Feature Branch**: `006-k1-model-review` | **Date**: 2026-03-20
**Research**: [research.md](research.md) | **Spec**: [spec.md](spec.md)

---

## Entity Overview

```
                    ┌──────────────────┐
                    │   Partnership    │  (existing dimension)
                    └────────┬─────────┘
                             │
  ┌──────────────┐    ┌──────┴──────────┐    ┌──────────────────┐
  │   Entity     │────│   KDocument     │────│ K1BoxDefinition  │  (NEW — reference)
  │  (existing)  │    │   (existing)    │    │  PK = boxKey     │
  └──────────────┘    └────────┬────────┘    └────────┬─────────┘
                               │                      │
                        ┌──────┴──────────┐    ┌──────┴──────────┐
                        │  K1LineItem     │    │  K1BoxOverride  │  (NEW — per-partnership)
                        │  (NEW — fact)   │    │  display overrides
                        └─────────────────┘    └─────────────────┘
```

---

## New Entities

### K1BoxDefinition (Reference / Dimension)

Replaces the global rows of `CellMapping`. One row per unique IRS K-1 box identifier. Serves as the FK target for `K1LineItem.boxKey`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `boxKey` | `String` | **PK** | IRS box identifier: `"1"`, `"9a"`, `"20-A"`, `"11-ZZ*"` |
| `label` | `String` | NOT NULL | Human-readable: `"Ordinary business income (loss)"` |
| `section` | `String?` | — | `HEADER`, `PART_I`, `PART_II`, `SECTION_J`, `SECTION_K`, `SECTION_L`, `SECTION_M`, `SECTION_N`, `PART_III` |
| `dataType` | `String` | DEFAULT `"number"` | `number`, `string`, `percentage`, `boolean` |
| `sortOrder` | `Int` | NOT NULL | Display ordering (matches IRS form order) |
| `irsFormLine` | `String?` | — | `"Box 1"`, `"Section J, Line 1"`, `"Part I, Line A"` |
| `description` | `String?` | — | Extended description for LLM context |
| `isCustom` | `Boolean` | DEFAULT `false` | `true` for auto-created box keys not in IRS standard set (FR-017) |
| `createdAt` | `DateTime` | DEFAULT `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Indexes**: `@@index([section])`, `@@index([sortOrder])`
**Mapped name**: `k1_box_definition`

**Seed data**: Migrated from `IRS_DEFAULT_MAPPINGS` array in `cell-mapping.service.ts` (80+ entries). Mapping: `boxNumber` → `boxKey`, `label` → `label`, `cellType` → `dataType`, `sortOrder` → `sortOrder`, `description` → `description`. Section derived from sortOrder ranges (0–9 = HEADER, 10–19 = PART_I, 20–29 = PART_II, 30–39 = SECTION_J, 40–49 = SECTION_K, 50–59 = SECTION_L, 60–63 = SECTION_M/N, 100+ = PART_III).

---

### K1BoxOverride (Per-Partnership Display Override)

Replaces the per-partnership rows of `CellMapping`. Controls display customization without affecting data integrity.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK (UUID) | |
| `boxKey` | `String` | FK → `K1BoxDefinition.boxKey` | Which box to override |
| `partnershipId` | `String` | FK → `Partnership.id` | Which partnership |
| `customLabel` | `String?` | — | Override display label |
| `isIgnored` | `Boolean` | DEFAULT `false` | Hide this box for this partnership |
| `createdAt` | `DateTime` | DEFAULT `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Unique**: `@@unique([boxKey, partnershipId])`
**Indexes**: `@@index([partnershipId])`
**Mapped name**: `k1_box_override`
**On delete**: CASCADE from both `K1BoxDefinition` and `Partnership`

---

### K1LineItem (Fact Table)

One financial line item per box per K-1 document. Core normalized data store replacing `KDocument.data` JSON.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK (UUID) | |
| `kDocumentId` | `String` | FK → `KDocument.id` | Which K-1 document |
| `boxKey` | `String` | FK → `K1BoxDefinition.boxKey` | Which IRS box |
| `amount` | `Decimal?` | `@db.Decimal(15,2)` | Dollar amount. NULL for non-numeric values. |
| `textValue` | `String?` | — | Non-numeric values: `"SEE STMT"`, `"true"`, etc. |
| `rawText` | `String?` | — | Original extracted text before parsing |
| `confidence` | `Decimal?` | `@db.Decimal(3,2)` | OCR confidence 0.00–1.00. NULL if manual entry. |
| `sourcePage` | `Int?` | — | PDF page number where extracted |
| `sourceCoords` | `Json?` | — | `{x, y, width, height}` bounding box on page |
| `isUserEdited` | `Boolean` | DEFAULT `false` | True if user modified during verification |
| `isSuperseded` | `Boolean` | DEFAULT `false` | True if replaced by a newer version (ESTIMATED→FINAL) |
| `createdAt` | `DateTime` | DEFAULT `now()` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Partial unique index** (raw SQL, not expressible in Prisma):
```sql
CREATE UNIQUE INDEX "k1_line_item_active_unique"
  ON "k1_line_item" ("k_document_id", "box_key")
  WHERE "is_superseded" = false;
```

**Indexes**: `@@index([kDocumentId, boxKey])`, `@@index([kDocumentId])`, `@@index([boxKey])`, `@@index([isSuperseded])`
**Mapped name**: `k1_line_item`
**On delete**: CASCADE from `KDocument`

---

## Modified Entities

### KDocument (existing — minimal changes)

| Change | Detail |
|---|---|
| Add `lineItems` relation | `K1LineItem[]` — reverse relation for Prisma |
| `data` column | **Retained as-is** — immutable JSON archive (FR-008) |
| No column drops | `data`, `previousData` preserved permanently |

### CellAggregationRule (existing — update references)

| Change | Detail |
|---|---|
| `sourceCells` JSON | Values are already strings like `["1", "8", "9a"]` — these match `K1BoxDefinition.boxKey` directly |
| No schema change | The `sourceCells` array doesn't need migration; it naturally references boxKey strings |

### CellMapping (existing — to be dropped)

| Phase | Action |
|---|---|
| Phase 1 (additive) | Leave in place alongside K1BoxDefinition |
| After backfill verified | Drop table via migration. Remove `CellMappingService`, `CellMappingController`, `CellMappingModule` |

---

## Prisma Schema

```prisma
/// Global IRS K-1 box reference. One row per unique box identifier.
/// Replaces the global (partnershipId = null) CellMapping rows.
/// NOTE: COMMENT ON annotations added in migration SQL for LLM discoverability.
model K1BoxDefinition {
  boxKey      String   @id @map("box_key")
  label       String
  section     String?
  dataType    String   @default("number") @map("data_type")
  sortOrder   Int      @map("sort_order")
  irsFormLine String?  @map("irs_form_line")
  description String?
  isCustom    Boolean  @default(false) @map("is_custom")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  lineItems   K1LineItem[]
  overrides   K1BoxOverride[]

  @@map("k1_box_definition")
  @@index([section])
  @@index([sortOrder])
}

/// Per-partnership display overrides for a K1BoxDefinition.
/// Controls custom labels, ignored status, etc. Does NOT affect data integrity.
/// Replaces the per-partnership (partnershipId != null) CellMapping rows.
model K1BoxOverride {
  id            String          @id @default(uuid())
  boxKey        String          @map("box_key")
  boxDefinition K1BoxDefinition @relation(fields: [boxKey], references: [boxKey], onDelete: Cascade)
  partnershipId String          @map("partnership_id")
  partnership   Partnership     @relation(fields: [partnershipId], references: [id], onDelete: Cascade)
  customLabel   String?         @map("custom_label")
  isIgnored     Boolean         @default(false) @map("is_ignored")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  @@unique([boxKey, partnershipId])
  @@map("k1_box_override")
  @@index([partnershipId])
}

/// Individual financial line item from an IRS Schedule K-1.
/// Fact table: one row per box per K-1 document.
/// NOTE: Partial unique index "k1_line_item_active_unique" on (k_document_id, box_key)
/// WHERE is_superseded = false — managed in migration SQL, not expressible in Prisma.
model K1LineItem {
  id            String          @id @default(uuid())
  kDocumentId   String          @map("k_document_id")
  kDocument     KDocument       @relation(fields: [kDocumentId], references: [id], onDelete: Cascade)
  boxKey        String          @map("box_key")
  boxDefinition K1BoxDefinition @relation(fields: [boxKey], references: [boxKey])
  amount        Decimal?        @db.Decimal(15, 2)
  textValue     String?         @map("text_value")
  rawText       String?         @map("raw_text")
  confidence    Decimal?        @db.Decimal(3, 2)
  sourcePage    Int?            @map("source_page")
  sourceCoords  Json?           @map("source_coords")
  isUserEdited  Boolean         @default(false) @map("is_user_edited")
  isSuperseded  Boolean         @default(false) @map("is_superseded")
  createdAt     DateTime        @default(now()) @map("created_at")
  updatedAt     DateTime        @updatedAt @map("updated_at")

  @@map("k1_line_item")
  @@index([kDocumentId, boxKey])
  @@index([kDocumentId])
  @@index([boxKey])
  @@index([isSuperseded])
}
```

**Relations to add to existing models**:

```prisma
// In model KDocument — add:
lineItems K1LineItem[]

// In model Partnership — add:
boxOverrides K1BoxOverride[]
```

---

## State Transitions

### K1LineItem Versioning (ESTIMATED → FINAL)

```
State 1: ESTIMATED K-1 confirmed
  K1LineItem rows created with isSuperseded = false

State 2: FINAL K-1 imported for same KDocument
  1. UPDATE K1LineItem SET isSuperseded = true WHERE kDocumentId = X AND isSuperseded = false
  2. INSERT new K1LineItem rows with isSuperseded = false
  3. Old rows preserved for audit trail

Query pattern (always):
  WHERE isSuperseded = false
```

### CellMapping → K1BoxDefinition Migration

```
Phase 1: Both tables exist
  - K1BoxDefinition seeded from IRS_DEFAULT_MAPPINGS
  - CellMapping continues to serve existing code

Phase 2: Dual-read
  - New code reads K1BoxDefinition
  - Old code gradually migrated

Phase 3: CellMapping dropped
  - Migration removes table
  - Service/controller/module deleted
```

---

## Validation Rules

| Entity | Rule | Enforcement |
|---|---|---|
| K1BoxDefinition | `boxKey` is non-empty string | Application + PK constraint |
| K1BoxDefinition | `dataType` ∈ `{number, string, percentage, boolean}` | Application validation |
| K1LineItem | `amount` XOR `textValue` populated (not both null, not both non-null for numeric types) | Application validation layer |
| K1LineItem | `confidence` ∈ [0.00, 1.00] | Application validation |
| K1LineItem | `boxKey` exists in K1BoxDefinition | FK constraint (database) |
| K1LineItem | At most 1 active row per (kDocumentId, boxKey) | Partial unique index (database) |
| K1BoxOverride | One override per (boxKey, partnershipId) | @@unique constraint (database) |
