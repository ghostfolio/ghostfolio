# Quickstart: 006-k1-model-review

**Branch**: `006-k1-model-review`  
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Data Model**: [data-model.md](data-model.md)

---

## What This Feature Does

Transforms K-1 financial data from JSON blob storage (`KDocument.data`) to normalized relational tables:

- **K1BoxDefinition** — Reference table of valid IRS K-1 box identifiers (replaces `CellMapping`)
- **K1BoxOverride** — Per-partnership display overrides (custom labels, ignored boxes)
- **K1LineItem** — Fact table: one row per box per K-1 document (replaces JSON blob reads)

This enables SQL-level aggregation, referential integrity on box keys, and field-level provenance tracking.

## Prerequisites

```bash
# Docker containers running (PostgreSQL + Redis)
docker compose -f docker/docker-compose.dev.yml up -d

# Dependencies installed
npm install

# Environment variables (copy from .env.example if needed)
# DATABASE_URL=postgresql://user:password@localhost:5434/ghostfolio
```

## Development Workflow

### 1. Schema Changes

All new models are in `prisma/schema.prisma`. After modifying:

```bash
# Validate schema
npx prisma validate

# Generate diff SQL (shadow DB workaround — P3006 error in dev)
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script

# Create migration file manually, then apply:
npx prisma db execute --file prisma/migrations/<name>/migration.sql --schema prisma/schema.prisma
npx prisma migrate resolve --applied <name>

# Regenerate Prisma Client (kill node processes first on Windows for DLL lock)
npx prisma generate
```

### 2. Key Files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | K1BoxDefinition, K1BoxOverride, K1LineItem models |
| `apps/api/src/app/k1-box-definition/` | Service + controller for box definitions & overrides |
| `apps/api/src/app/k1-import/k1-import.service.ts` | `confirm()` creates K1LineItem rows from verified PDF fields |
| `apps/api/src/app/k1-import/k1-aggregation.service.ts` | SQL-based aggregation over K1LineItem |
| `apps/api/src/app/k1-import/k1-materialized-view.service.ts` | Refreshes `mv_k1_partnership_year_summary` on data changes |
| `apps/api/src/app/k1-import/k1-field-mapper.service.ts` | Maps PDF fields using K1BoxDefinitionService.resolve() |
| `libs/common/src/lib/interfaces/` | K1BoxDefinition, K1LineItem TypeScript types |

### 3. Running the API

```bash
# Start API (watches for changes)
npx nx serve api

# API runs at http://localhost:3333
```

### 4. Testing

```bash
# SC-006 comparison test (quality gate — must pass before commits)
node --experimental-strip-types test/import/k1-comparison.test.mts

# Run all tests
npx nx test api

# Run specific test file
npx jest --config apps/api/jest.config.ts --testPathPattern="k1-box-definition"
```

### 5. Migrations Applied

Migrations in this branch (applied in order):

1. **20260321004726_add_k1_normalized_model** — Create K1BoxDefinition, K1BoxOverride, K1LineItem tables. Seed 79 IRS box definitions. Add partial unique index. Drop unused KDocument/K1ImportSession columns.
2. **20260321010000_drop_cell_mapping** — Drop CellMapping and CellAggregationRule tables + FK constraints.
3. **20260321020000_widen_k1_line_item_amount_precision** — Widen K1LineItem.amount from Decimal(15,2) to Decimal(15,6) for percentage fields.
4. **20260321030000_add_k1_materialized_views** — Create `mv_k1_partnership_year_summary` materialized view with unique index.

## Architecture Notes

- **Clean-break migration**: CellMapping tables are dropped. No dual-write or backfill needed — PDFs are re-imported through the new pipeline.
- **K1LineItem is authoritative**: `KDocument.data` (Json?) is optional convenience snapshot only. All queries read from K1LineItem.
- **Aggregation via SQL**: `K1AggregationService` uses `prisma.k1LineItem.findMany()` and `groupBy()` instead of iterating JSON blobs.
- **Materialized views**: `mv_k1_partnership_year_summary` is refreshed via `REFRESH MATERIALIZED VIEW CONCURRENTLY` triggered by `@OnEvent('k-document.changed')` after confirm.
- **isSuperseded pattern**: When K-1 transitions ESTIMATED→FINAL, old K1LineItem rows are marked `isSuperseded = true`, new rows inserted. All queries filter `WHERE isSuperseded = false`.
- **Auto-create on import**: `K1BoxDefinitionService.autoCreateIfMissing()` creates custom box definitions for PDF-extracted fields not in the IRS defaults (e.g., Section J, Section L, Box 20 sub-items).

## Contracts

TypeScript interfaces are in `libs/common/src/lib/interfaces/`:
- `k1-box-definition.interface.ts` — K1BoxDefinition, K1BoxOverride, K1BoxDefinitionResolved
- `k1-line-item.interface.ts` — K1LineItem, K1LineItemWithDefinition, CreateK1LineItemDto, K1AggregationResult

## Out of Scope

- Angular dashboard UI (future spec)
- LLM NL-to-SQL integration (future spec)
- PDF extraction changes (covered by 005-k1-parser-fix)
