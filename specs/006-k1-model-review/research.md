# Research: K-1 Normalized Data Model — Technical Questions

**Feature Branch**: `006-k1-model-review`  
**Date**: 2026-03-20  
**Prisma Version**: 6.19.0  
**PostgreSQL**: 16  
**NestJS**: 11+ (`@nestjs/event-emitter` 3.0.1 already installed, `EventEmitterModule` imported in `app.module.ts`)

---

## 1. Prisma `@@map` and `COMMENT ON` Annotations (FR-012)

### Decision

**Use raw SQL statements appended to the Prisma-generated migration file.** After running `prisma migrate dev --create-only` to generate the structural DDL, manually append `COMMENT ON TABLE` and `COMMENT ON COLUMN` statements to the same `.sql` migration file before applying it.

### Rationale

Prisma has **no native support** for PostgreSQL comments. There is no `@comment` attribute, no `@@comment` model attribute, and `@@map`/`@map` only control table/column name mapping — not metadata comments. Three options exist:

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **(a) Raw SQL in migration file** | Single source of truth; comments ship with the migration; version-controlled; reviewed in PR | Must manually append after `prisma migrate dev --create-only`; must maintain when schema changes | **Chosen** |
| **(b) Post-migration script** | Can be automated via `package.json` hook | Runs outside the migration transaction; easy to forget; comments drift from schema | Rejected |
| **(c) Prisma client extension** | Could add comments at runtime | Extensions operate at the client query layer, not DDL; cannot emit `COMMENT ON`; wrong abstraction level | Rejected |

**Why (a) wins**: The project already uses `prisma migrate dev` for all schema changes (see 95+ existing migrations in `prisma/migrations/`). The existing migration at `20260316120000_added_family_office_tables/migration.sql` is pure SQL — appending `COMMENT ON` statements is idiomatic. Comments are part of the schema, so they belong in the migration.

**Prisma's `@@map` and `@map`** are relevant but solve a different problem: they let Prisma model names (PascalCase) map to PostgreSQL table/column names (snake_case). The current schema does **not** use `@@map` — Prisma uses the model name directly as the table name (e.g., `model KDocument` → table `KDocument`). The spec's FR-012 requires `snake_case` table names, so we'll need `@@map` **in addition to** `COMMENT ON`.

### Code Example

**Step 1**: Prisma model with `@@map` / `@map` for snake_case table/column names:

```prisma
model K1BoxDefinition {
  boxKey        String   @id @map("box_key")
  label         String
  section       String?
  dataType      String   @default("number") @map("data_type")
  sortOrder     Int      @map("sort_order")
  irsFormLine   String?  @map("irs_form_line")
  description   String?
  isCustom      Boolean  @default(false) @map("is_custom")
  isIgnored     Boolean  @default(false) @map("is_ignored")
  partnershipId String?  @map("partnership_id")
  partnership   Partnership? @relation(fields: [partnershipId], onDelete: Cascade, references: [id])
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  lineItems     K1LineItem[]

  @@map("k1_box_definition")
  @@unique([partnershipId, boxKey])
  @@index([partnershipId])
}
```

**Step 2**: After `prisma migrate dev --create-only`, append to the generated `.sql` file:

```sql
-- COMMENT ON annotations for LLM discoverability (FR-012)
COMMENT ON TABLE "k1_box_definition" IS 'Reference table of IRS Schedule K-1 (Form 1065) box definitions. Maps box identifiers to human-readable labels, sections, and data types. Global rows (partnership_id IS NULL) define IRS defaults. Per-partnership rows override display settings.';
COMMENT ON COLUMN "k1_box_definition"."box_key" IS 'IRS K-1 box identifier: "1" for ordinary income, "9a" for long-term capital gains, "20-A" for other information code A.';
COMMENT ON COLUMN "k1_box_definition"."label" IS 'Human-readable label for this box, e.g. "Ordinary business income (loss)".';
COMMENT ON COLUMN "k1_box_definition"."section" IS 'IRS form section: HEADER, PART_I, PART_II, SECTION_J, SECTION_K, SECTION_L, PART_III.';
COMMENT ON COLUMN "k1_box_definition"."data_type" IS 'Expected data type: number, string, percentage, or boolean.';
COMMENT ON COLUMN "k1_box_definition"."is_custom" IS 'True if this box was auto-created during import for a key not in the IRS standard set.';
COMMENT ON COLUMN "k1_box_definition"."partnership_id" IS 'NULL for global IRS defaults. Non-null for per-partnership display overrides (custom label, isIgnored).';

COMMENT ON TABLE "k1_line_item" IS 'Individual financial line item from an IRS Schedule K-1 (Form 1065). One row per box per K-1 document. Fact table in a star schema with KDocument and K1BoxDefinition as dimensions.';
COMMENT ON COLUMN "k1_line_item"."box_key" IS 'FK to k1_box_definition. IRS K-1 box identifier.';
COMMENT ON COLUMN "k1_line_item"."amount" IS 'Dollar amount reported on this line item, DECIMAL(15,2). Negative = loss. NULL when value is non-numeric (see text_value).';
COMMENT ON COLUMN "k1_line_item"."text_value" IS 'Non-numeric value such as "SEE STMT" or "X" (checkbox). Present when amount is NULL.';
COMMENT ON COLUMN "k1_line_item"."is_superseded" IS 'True if this row was replaced by a newer version (e.g., ESTIMATED → FINAL K-1 transition). Aggregation queries filter WHERE is_superseded = false.';
COMMENT ON COLUMN "k1_line_item"."confidence" IS 'OCR extraction confidence score, 0.00–1.00. NULL if manually entered.';
```

**Workflow**: Run `npx prisma migrate dev --create-only --name add_k1_tables`, then hand-edit the `.sql` to append comments, then run `npx prisma migrate dev` to apply. This is the pattern recommended by the Prisma team for any DDL that Prisma doesn't generate natively.

---

## 2. Prisma Materialized Views (FR-010, FR-011)

### Decision

**Raw SQL in a Prisma migration file to create the materialized views + `prisma.$executeRawUnsafe()` in a NestJS service to refresh them, triggered by `@OnEvent('k-document.changed')`.**

Do NOT use Prisma's `view` preview feature — it only supports regular `CREATE VIEW`, not `CREATE MATERIALIZED VIEW`, and is still in preview as of Prisma 6.19.0.

### Rationale

| Option | Supports Materialized? | Refresh Mechanism | Prisma Type Safety | Verdict |
|---|---|---|---|---|
| **(a) Raw SQL migration + `$queryRaw` / `$executeRawUnsafe`** | Yes | `REFRESH MATERIALIZED VIEW CONCURRENTLY` via service | Query results need manual typing via `$queryRaw<Type>` | **Chosen** |
| **(b) Prisma `view` preview feature** | **No** — only `CREATE VIEW` | N/A (regular views auto-refresh) | Yes, generates types | Rejected for materialized |
| **(c) `db.execute` in a service (no migration)** | Yes | Same as (a) | Same as (a) | Rejected — DDL should be version-controlled in migrations |

**Key details**:

1. **Prisma `view` preview feature** (enabled via `previewFeatures = ["views"]` in generator block) lets you declare `view` instead of `model` in `schema.prisma`. Prisma then generates read-only types. However, it **only** handles `CREATE VIEW` — there is no syntax for `MATERIALIZED`. The Prisma team's GitHub issue [prisma/prisma#17335](https://github.com/prisma/prisma/issues/17335) tracks materialized view support — still open as of 2026-03. Using `view` for a materialized view will cause `prisma migrate dev` to emit `CREATE VIEW`, which is wrong.

2. **`REFRESH MATERIALIZED VIEW CONCURRENTLY`** requires a `UNIQUE INDEX` on the materialized view. This must be included in the migration.

3. **`@nestjs/event-emitter`** is already installed (v3.0.1) and `EventEmitterModule` is already imported in `app.module.ts` (line 24). The infrastructure for `@OnEvent` is ready.

4. **Query results** from materialized views can be read via `prisma.$queryRaw<T>` with a manually defined TypeScript interface, or via a Prisma `view` model (which works for reads even if the underlying object is actually a materialized view — Prisma doesn't check). The latter gives better DX but is a slight hack.

### Code Example

**Migration file** (`YYYYMMDD_create_k1_materialized_views/migration.sql`):

```sql
-- Materialized View 1: K-1 Summary by Partnership/Year
CREATE MATERIALIZED VIEW mv_k1_partnership_year_summary AS
SELECT
    kd."partnershipId" AS partnership_id,
    kd."taxYear" AS tax_year,
    li."boxKey" AS box_key,
    bd."label",
    bd."section",
    SUM(li."amount") AS total_amount,
    COUNT(*) AS line_count
FROM "K1LineItem" li
JOIN "KDocument" kd ON li."kDocumentId" = kd."id"
JOIN "K1BoxDefinition" bd ON li."boxKey" = bd."boxKey" AND bd."partnershipId" IS NULL
WHERE li."isSuperseded" = false
GROUP BY kd."partnershipId", kd."taxYear", li."boxKey", bd."label", bd."section"
WITH NO DATA;

-- Required for CONCURRENTLY refresh
CREATE UNIQUE INDEX idx_mv_k1_pys_unique
  ON mv_k1_partnership_year_summary (partnership_id, tax_year, box_key);

-- Initial population
REFRESH MATERIALIZED VIEW mv_k1_partnership_year_summary;
```

> **Note on column names**: If `@@map` is adopted (Question 1), the table and column names in the view SQL will use the mapped snake_case names instead of PascalCase. Adjust accordingly.

**NestJS service** (`k1-materialized-view.service.ts`):

```typescript
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class K1MaterializedViewService {
  private readonly logger = new Logger(K1MaterializedViewService.name);

  constructor(private readonly prismaService: PrismaService) {}

  @OnEvent('k-document.changed')
  async handleKDocumentChanged() {
    this.logger.log('Refreshing K-1 materialized views...');
    await this.refreshAll();
  }

  async refreshAll() {
    await this.prismaService.$executeRawUnsafe(
      `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_k1_partnership_year_summary`
    );
    // Add additional MVs here as they are created
  }

  async getPartnershipYearSummary(partnershipId: string, taxYear: number) {
    return this.prismaService.$queryRaw<
      Array<{
        partnership_id: string;
        tax_year: number;
        box_key: string;
        label: string;
        section: string;
        total_amount: number;
        line_count: number;
      }>
    >`
      SELECT * FROM mv_k1_partnership_year_summary
      WHERE partnership_id = ${partnershipId}
        AND tax_year = ${taxYear}
      ORDER BY box_key
    `;
  }
}
```

**Emitting the event** (in `K1ImportService.confirm()` or KDocument update logic):

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

// After KDocument create/update:
this.eventEmitter.emit('k-document.changed', { kDocumentId, partnershipId });
```

**Optional hybrid**: You _can_ declare `view mv_k1_partnership_year_summary` in `schema.prisma` to get Prisma-generated types for reads. Prisma will try to `CREATE VIEW` on the next migration — just manually delete that migration SQL and keep the materialized view migration. This is fragile; the `$queryRaw<T>` approach with manual interfaces is more honest.

---

## 3. K1BoxDefinition Composite Key with `partnershipId` (FR-015)

### Decision

**Option (c): Split into two models — `K1BoxDefinition` (global IRS reference, PK = `boxKey`) and `K1BoxOverride` (per-partnership display overrides, FK to `K1BoxDefinition`).** K1LineItem's FK points to the global `K1BoxDefinition` only.

### Rationale

The core problem: K1BoxDefinition serves two purposes:
1. **Referential integrity** — K1LineItem.boxKey must be a valid IRS box identifier
2. **Display customization** — Per-partnership overrides for labels, ignored status, custom entries

Mixing both roles in one table with `partnershipId = null` for globals and `partnershipId = <uuid>` for overrides creates an FK ambiguity:

| Option | FK Target | Problem |
|---|---|---|
| **(a) K1LineItem FK → global rows only** | `boxKey WHERE partnershipId IS NULL` | Prisma cannot express a filtered FK. You'd need a compound FK `(boxKey, partnershipId)` with partnershipId always null in K1LineItem — awkward. Also, custom per-partnership boxes (not in global set) can't be FK targets. |
| **(b) Composite FK `(boxKey, partnershipId)`** | Exact row | K1LineItem would need a `partnershipId` column duplicating KDocument.partnershipId. Denormalization. Also, every K1LineItem for a partnership without overrides would point to the global row, requiring a COALESCE-style lookup at insert time ("does an override exist? if not, FK to global"). Complex insert logic. |
| **(c) Split into two tables** | `K1BoxDefinition.boxKey` (simple FK) | Clean separation. Global IRS reference is the FK target. Per-partnership display overrides are a separate concern queried at render time, not at data-insert time. Custom boxes added to the global table with `isCustom = true`. | **Chosen** |

**Why (c) is cleanest in Prisma**:

- Simple `String` PK on K1BoxDefinition (`boxKey`)
- Simple FK on K1LineItem (`boxKey` → `K1BoxDefinition.boxKey`)
- No composite FKs, no nullable FK components, no filtered relations
- Per-partnership overrides are a JOIN-at-read concern, not a data-integrity concern
- Prisma `@relation` works naturally with single-column FKs

**How per-partnership custom boxes work**: When a partnership has a custom box (e.g., "11-ZZ*" created during import per FR-017), a global `K1BoxDefinition` row is created with `isCustom = true`. It's globally unique by boxKey. If another partnership also has "11-ZZ*", they share the same K1BoxDefinition row (the label may differ via K1BoxOverride). This avoids duplicate boxKey entries.

**What about the spec saying "Per-partnership overrides become rows with a non-null partnershipId"?** That works for the _override table_ (`K1BoxOverride`), not the _reference table_ (`K1BoxDefinition`). The spec's intent (replace CellMapping) is preserved: CellMapping's global rows → K1BoxDefinition, CellMapping's per-partnership rows → K1BoxOverride.

### Code Example

```prisma
/// Global IRS K-1 box reference. One row per unique box identifier.
/// PK is the box key string (e.g., "1", "9a", "20-A").
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
model K1BoxOverride {
  id            String        @id @default(uuid())
  boxKey        String        @map("box_key")
  boxDefinition K1BoxDefinition @relation(fields: [boxKey], references: [boxKey], onDelete: Cascade)
  partnershipId String        @map("partnership_id")
  partnership   Partnership   @relation(fields: [partnershipId], onDelete: Cascade, references: [id])
  customLabel   String?       @map("custom_label")
  isIgnored     Boolean       @default(false) @map("is_ignored")
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  @@unique([boxKey, partnershipId])
  @@map("k1_box_override")
  @@index([partnershipId])
}

model K1LineItem {
  id            String          @id @default(uuid())
  kDocumentId   String          @map("k_document_id")
  kDocument     KDocument       @relation(fields: [kDocumentId], onDelete: Cascade, references: [id])
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

  @@unique([kDocumentId, boxKey, isSuperseded])  // See Question 5
  @@map("k1_line_item")
  @@index([kDocumentId])
  @@index([boxKey])
  @@index([isSuperseded])
}
```

**CellMapping → K1BoxDefinition + K1BoxOverride migration**:

| CellMapping field | → K1BoxDefinition | → K1BoxOverride |
|---|---|---|
| `boxNumber` | `boxKey` (PK) | `boxKey` (FK) |
| `label` | `label` (IRS default) | `customLabel` (override) |
| `description` | `description` | — |
| `cellType` | `dataType` | — |
| `sortOrder` | `sortOrder` | — |
| `isCustom` | `isCustom` | — |
| `isIgnored` | — | `isIgnored` |
| `partnershipId` (null) | (global row) | — |
| `partnershipId` (non-null) | — | `partnershipId` |

**CellAggregationRule**: Update its model to reference K1BoxDefinition boxKeys in its `sourceCells` JSON array. No structural change needed — the string values in `sourceCells` are already box key strings like `["1", "8", "9a"]`.

---

## 4. Prisma JSON Field Backfill Migration (FR-006, FR-017)

### Decision

**Use a single SQL `INSERT ... SELECT` statement with `jsonb_each()` inside the Prisma migration `.sql` file.** Handle non-numeric values (text, booleans) with PostgreSQL `CASE` / `jsonb_typeof()` expressions. Auto-create missing K1BoxDefinition rows in a preceding CTE.

### Rationale

Prisma migration files are plain `.sql` files executed against PostgreSQL. There is no limitation on SQL complexity. PostgreSQL's `jsonb_each()` function is the standard way to iterate JSONB keys.

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Single SQL with `jsonb_each()`** | Atomic, fast, runs in migration transaction, no application code needed | Complex SQL; harder to debug | **Chosen** |
| **TypeScript migration script** (`prisma.$executeRaw` in a seed file) | Easier to debug; can log per-row | Runs outside migration system; not version-controlled as migration; slower (row-by-row) | Rejected |
| **Multi-step: SQL to temp table then INSERT** | Intermediate visibility | Unnecessary complexity for <1000 documents | Rejected |

**Handling value types**:

| JSON value type (`jsonb_typeof()`) | K1LineItem.amount | K1LineItem.text_value | Example |
|---|---|---|---|
| `'number'` | `(value)::decimal` | `NULL` | `"1": 50000` |
| `'string'` | `NULL` | `value #>> '{}'` | `"11": "SEE STMT"` |
| `'boolean'` | `NULL` | `CASE WHEN value = 'true' THEN 'true' ELSE 'false' END` | `"FINAL_K1": true` |

**Auto-creating missing K1BoxDefinition rows (FR-017)**: A CTE first collects all distinct JSON keys across all KDocuments, then inserts any keys not already in K1BoxDefinition with `isCustom = true`. A second CTE (or the existing CellMapping data) provides labels.

### Code Example

**Migration file** (`YYYYMMDD_backfill_k1_line_items/migration.sql`):

```sql
-- Step 1: Auto-create K1BoxDefinition rows for any JSON keys not already defined.
-- Uses CellMapping label if available, otherwise raw key as label. (FR-017)
INSERT INTO "k1_box_definition" ("box_key", "label", "data_type", "sort_order", "is_custom", "created_at", "updated_at")
SELECT DISTINCT
    je.key,
    COALESCE(cm."label", je.key),
    CASE jsonb_typeof(je.value)
        WHEN 'number' THEN 'number'
        WHEN 'boolean' THEN 'boolean'
        ELSE 'string'
    END,
    9999, -- high sort order for custom entries
    true,
    NOW(),
    NOW()
FROM "KDocument" kd,
     jsonb_each(kd."data"::jsonb) AS je(key, value)
LEFT JOIN "CellMapping" cm ON cm."boxNumber" = je.key AND cm."partnershipId" IS NULL
WHERE NOT EXISTS (
    SELECT 1 FROM "k1_box_definition" bd WHERE bd."box_key" = je.key
)
ON CONFLICT ("box_key") DO NOTHING;

-- Step 2: Backfill K1LineItem rows from KDocument.data JSON blobs.
-- One row per JSON key per KDocument.
INSERT INTO "k1_line_item" (
    "id",
    "k_document_id",
    "box_key",
    "amount",
    "text_value",
    "raw_text",
    "is_user_edited",
    "is_superseded",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    kd."id",
    je.key,
    -- amount: numeric values only
    CASE
        WHEN jsonb_typeof(je.value) = 'number' THEN (je.value)::decimal
        ELSE NULL
    END,
    -- text_value: non-numeric values
    CASE
        WHEN jsonb_typeof(je.value) = 'string' THEN je.value #>> '{}'
        WHEN jsonb_typeof(je.value) = 'boolean' THEN
            CASE WHEN je.value::text = 'true' THEN 'true' ELSE 'false' END
        ELSE NULL
    END,
    -- raw_text: original string representation for all types
    je.value #>> '{}',
    false,  -- not user-edited (backfilled from import)
    false,  -- not superseded (current active version)
    kd."createdAt",
    NOW()
FROM "KDocument" kd,
     jsonb_each(kd."data"::jsonb) AS je(key, value);
```

> **Note on column names**: If `@@map` is adopted, `kd."createdAt"` stays as PascalCase because the KDocument table is NOT being remapped (existing table). The new `k1_line_item` table uses snake_case via `@@map`. Adjust based on final naming decision.

**Validation query** (run after migration to verify SC-001 parity):

```sql
-- Count: JSON keys per KDocument vs K1LineItem rows per KDocument
SELECT
    kd.id,
    jsonb_object_keys_count.json_key_count,
    li_count.line_item_count,
    jsonb_object_keys_count.json_key_count = li_count.line_item_count AS parity_ok
FROM "KDocument" kd
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS json_key_count FROM jsonb_each(kd."data"::jsonb)
) jsonb_object_keys_count ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS line_item_count FROM "k1_line_item" li WHERE li."k_document_id" = kd.id
) li_count ON true;
```

---

## 5. `isSuperseded` Soft Versioning Pattern (FR-016)

### Decision

**Use a raw SQL partial unique index** instead of `@@unique([kDocumentId, boxKey, isSuperseded])`. The business rule is: at most one _active_ (non-superseded) row per kDocumentId + boxKey. Superseded rows are historical and should not be constrained.

### Rationale

**The problem with `@@unique([kDocumentId, boxKey, isSuperseded])`**:

This allows exactly:
- One row with `(docA, box1, false)` — the active row ✓
- One row with `(docA, box1, true)` — one superseded row ✓
- ❌ But NOT two superseded rows for the same box (e.g., DRAFT → ESTIMATED → FINAL produces two superseded versions)

If a K-1 goes through DRAFT → ESTIMATED → FINAL, there would be 3 versions of each box:
1. DRAFT version → `isSuperseded = true`
2. ESTIMATED version → `isSuperseded = true`
3. FINAL version → `isSuperseded = false`

The `@@unique([kDocumentId, boxKey, isSuperseded])` constraint would reject the second superseded row. This is a blocker.

| Option | Allows multiple superseded rows? | Prisma-native? | Verdict |
|---|---|---|---|
| **(a) `@@unique([kDocumentId, boxKey])`** (original spec) | ❌ No superseded rows at all | Yes | Rejected — breaks versioning |
| **(b) `@@unique([kDocumentId, boxKey, isSuperseded])`** | ❌ Max 1 superseded | Yes | Rejected — breaks multi-version |
| **(c) Partial unique index (raw SQL)** | ✅ Unlimited superseded, exactly 1 active | No — requires migration SQL | **Chosen** |
| **(d) `@@unique([kDocumentId, boxKey, createdAt])`** | ✅ Technically yes | Yes | Rejected — `createdAt` in unique constraint is odd; doesn't enforce "one active" |

**Prisma and partial indexes**: Prisma does not support partial unique indexes natively. There is no syntax for `@@unique(..., where: ...)`. However, Prisma **tolerates** partial indexes — they are invisible to the Prisma client but enforced by PostgreSQL. The approach:

1. In `schema.prisma`: Use `@@index([kDocumentId, boxKey])` (regular index, NOT unique) for query performance.
2. In the migration `.sql`: Manually add a partial unique index.
3. Prisma Client won't generate a unique constraint violation type for this index, but PostgreSQL will enforce it and Prisma will surface the error as a `PrismaClientKnownRequestError` with code `P2002`.

### Code Example

**Prisma model** (no `@@unique` on these columns — just indexes):

```prisma
model K1LineItem {
  id            String          @id @default(uuid())
  kDocumentId   String          @map("k_document_id")
  kDocument     KDocument       @relation(fields: [kDocumentId], onDelete: Cascade, references: [id])
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

**Migration SQL** (appended to the create-table migration):

```sql
-- Partial unique index: enforce at most one ACTIVE (non-superseded) row per document + box.
-- Superseded rows (historical versions) are unrestricted.
CREATE UNIQUE INDEX "k1_line_item_active_unique"
  ON "k1_line_item" ("k_document_id", "box_key")
  WHERE "is_superseded" = false;
```

**Service-level supersede logic** (in K1ImportService or a dedicated K1LineItemService):

```typescript
async supersedAndInsert(
  kDocumentId: string,
  newLineItems: Array<{ boxKey: string; amount: number | null; textValue: string | null; /* ... */ }>
) {
  await this.prismaService.$transaction(async (tx) => {
    // Mark all existing active rows as superseded
    await tx.k1LineItem.updateMany({
      where: { kDocumentId, isSuperseded: false },
      data: { isSuperseded: true }
    });

    // Insert new active rows
    await tx.k1LineItem.createMany({
      data: newLineItems.map(item => ({
        kDocumentId,
        boxKey: item.boxKey,
        amount: item.amount,
        textValue: item.textValue,
        isSuperseded: false,
        // ... other fields
      }))
    });
  });
}
```

**Query pattern** (all aggregation queries use this filter):

```typescript
// Active line items only
const items = await this.prismaService.k1LineItem.findMany({
  where: { kDocumentId, isSuperseded: false }
});
```

**Migration safety note**: When running `prisma migrate dev` in the future, Prisma may warn that `k1_line_item_active_unique` is not reflected in the schema. This is expected — Prisma does not model partial indexes. Add a comment in `schema.prisma` above the model:

```prisma
/// NOTE: A partial unique index "k1_line_item_active_unique" exists on (k_document_id, box_key)
/// WHERE is_superseded = false. Managed in migration SQL, not expressible in Prisma schema.
model K1LineItem {
  // ...
}
```

---

## Summary of Decisions

| # | Question | Decision | Key Tradeoff |
|---|---|---|---|
| 1 | `COMMENT ON` in Prisma | Raw SQL appended to migration `.sql` files; `@@map`/`@map` for snake_case naming | Manual maintenance vs. version-controlled + atomic |
| 2 | Materialized Views | Raw SQL migration + `$executeRawUnsafe()` refresh + `@OnEvent` | Prisma type safety lost for MV queries; use `$queryRaw<T>` |
| 3 | K1BoxDefinition composite key | Split: `K1BoxDefinition` (global PK=boxKey) + `K1BoxOverride` (per-partnership display) | Extra table vs. clean FK semantics |
| 4 | JSON backfill | Single SQL `INSERT...SELECT` with `jsonb_each()` + `jsonb_typeof()` in migration | Complex SQL vs. atomic + fast |
| 5 | `isSuperseded` versioning | Partial unique index via raw SQL in migration | Not Prisma-native vs. correct multi-version semantics |
