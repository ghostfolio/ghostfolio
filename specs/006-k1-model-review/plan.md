# Implementation Plan: K-1 Normalized Data Model

**Branch**: `006-k1-model-review` | **Date**: 2026-03-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-k1-model-review/spec.md`

## Summary

Transform K-1 financial data storage from JSON blob (`KDocument.data`) to a normalized relational model (`K1LineItem` fact table + `K1BoxDefinition` reference table). This enables SQL-level aggregation, referential integrity on box keys, field-level provenance tracking, and future NL-to-SQL/LLM queries. The migration follows a 3-phase approach: (1) additive schema + backfill, (2) dual-write in `K1ImportService.confirm()`, (3) switch `K1AggregationService` to SQL reads. `CellMapping` is fully replaced by `K1BoxDefinition`. `KDocument.data` is retained as an immutable archive. Backend-only — no Angular UI changes.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, `noUnusedLocals`, `noUnusedParameters`)
**Primary Dependencies**: NestJS 11+ (module-based DI), Prisma ORM 6.x, PostgreSQL 16, Redis (caching), pdfjs-dist (extraction — unaffected by this feature)
**Storage**: PostgreSQL via Prisma (Docker dev: port 5434). All schema changes via `prisma migrate dev`.
**Testing**: Jest (unit + integration). `jest.config.ts` at root, per-project configs. E2E with Prisma test DB.
**Target Platform**: Linux server (Railway deployment), Docker containers for dev
**Project Type**: Web service (NestJS monorepo backend — `apps/api`)
**Performance Goals**: SQL aggregation queries on K1LineItem within 50ms for up to 1,000 K-1 documents (SC-002)
**Constraints**: Zero-downtime migration; existing UI reading `KDocument.data` must continue working (SC-005); no direct SQL — Prisma only (Constitution III)
**Scale/Scope**: <100 K-1 documents/year, <50 partnerships, ~50 IRS box definitions. Low write volume, high read volume (dashboards).

### Existing Code Inventory

| Component | Location | Lines | Role in Migration |
|---|---|---|---|
| **Prisma Schema** | `prisma/schema.prisma` (L543–710) | ~170 | Add `K1BoxDefinition`, `K1LineItem` models; eventually drop `CellMapping` |
| **CellMapping service** | `apps/api/src/app/cell-mapping/cell-mapping.service.ts` | 468 | Houses `IRS_DEFAULT_MAPPINGS` array (~80 entries) and `seedDefaultMappings()` — will be replaced by `K1BoxDefinitionService` |
| **K1AggregationService** | `apps/api/src/app/k1-import/k1-aggregation.service.ts` | 120 | `computeForKDocument()` iterates `Object.entries(data)` JSON — must switch to `K1LineItem` SQL aggregation |
| **K1ImportService.confirm()** | `apps/api/src/app/k1-import/k1-import.service.ts` (L530–760) | ~230 | Builds `kDocumentData` from `verifiedData.fields`, writes JSON blob — add dual-write to `K1LineItem` |
| **IRS_DEFAULT_MAPPINGS** | `cell-mapping.service.ts` (L10–140) | 130 | 80+ entries with boxNumber, label, description, cellType, sortOrder — seed source for `K1BoxDefinition` |
| **DEFAULT_AGGREGATION_RULES** | `cell-mapping.service.ts` (L142–165) | 24 | 3 rules (Total Ordinary Income, Capital Gains, Deductions) — migrate to reference `K1BoxDefinition` |

### Key Data Shapes (Current)

**KDocument.data** (JSON blob — the data being normalized):
```json
{"1": 50000, "9a": -1200, "11-ZZ*": 500, "20-A": 1200, "FINAL_K1": true}
```

**CellMapping** (the reference being replaced):
```
{ boxNumber: "1", label: "Ordinary business income (loss)", cellType: "number", sortOrder: 100, isCustom: false, isIgnored: false, partnershipId: null }
```

**verifiedData.fields** (input to confirm()):
```
[{ boxNumber: "1", numericValue: 50000, rawValue: "50,000", subtype: null, confidence: 0.95 }]
```

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| # | Gate (from Constitution) | Status | Post-Design Re-check |
|---|---|---|---|
| I | **Nx Monorepo Structure**: Respect project boundaries | PASS | PASS — 2 Nx projects confirmed: `apps/api` + `libs/common`. K1BoxOverride (3rd table) is still within `apps/api`. |
| II | **NestJS Module Pattern**: Module → Controller → Service | PASS | PASS — `K1BoxDefinitionModule` follows pattern. `K1MaterializedViewService` added to existing K1ImportModule. |
| III | **Prisma Data Layer**: No direct SQL; migrations required | **WARN** | **WARN** — 3 raw SQL uses: (1) `COMMENT ON` in migration, (2) materialized view DDL+refresh, (3) backfill `jsonb_each()` + partial unique index. All justified below. |
| IV | **TypeScript Strict**: No dead code | PASS | PASS — `CellMapping` module deleted in final migration phase, not left dead. |
| V | **Simplicity First / YAGNI / Max 3 Nx projects** | PASS | PASS — 2 Nx projects. K1BoxOverride is simpler than embedding overrides in K1BoxDefinition with nullable partnershipId. |
| VI | **Interface-First Design**: Contracts in `@ghostfolio/common` | PASS | PASS — Contracts defined in `specs/006/contracts/`, moved to `libs/common` during implementation. |
| VII | **Testing**: Jest | PASS | PASS — Backfill validation query defined in research.md. Unit + integration tests planned. |

**Gate III Justification**: Prisma ORM does not support materialized views or JSONB iteration natively. Two specific operations require `$executeRawUnsafe()`:
1. `CREATE MATERIALIZED VIEW` / `REFRESH MATERIALIZED VIEW CONCURRENTLY` (FR-010/011)
2. Backfill migration iterating `jsonb_each()` over `KDocument.data` (FR-006)

Both are encapsulated in migration files or a single service method — not scattered across the codebase. This is the minimum deviation from "Prisma only" required by the feature.

## Project Structure

### Documentation (this feature)

```text
specs/006-k1-model-review/
├── plan.md              # This file
├── research.md          # Phase 0: Technical research
├── data-model.md        # Phase 1: Prisma schema + entity definitions
├── quickstart.md        # Phase 1: Dev onboarding for this feature
├── contracts/           # Phase 1: TypeScript interfaces
│   ├── k1-box-definition.ts
│   └── k1-line-item.ts
└── tasks.md             # Phase 2 output (NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                    # Add K1BoxDefinition, K1LineItem models
└── migrations/
    ├── YYYYMMDD_add_k1_box_definition/   # Create table + seed IRS defaults
    ├── YYYYMMDD_add_k1_line_item/        # Create fact table with FKs
    ├── YYYYMMDD_backfill_k1_line_items/  # Migrate JSON → rows
    └── YYYYMMDD_drop_cell_mapping/       # Remove old table (final phase)

apps/api/src/app/
├── k1-box-definition/               # NEW module (replaces cell-mapping)
│   ├── k1-box-definition.module.ts
│   ├── k1-box-definition.controller.ts
│   └── k1-box-definition.service.ts
├── k1-import/
│   ├── k1-import.service.ts         # MODIFY: dual-write in confirm()
│   └── k1-aggregation.service.ts    # MODIFY: switch to K1LineItem SQL
└── cell-mapping/                    # DELETE after migration complete
    ├── cell-mapping.module.ts
    ├── cell-mapping.controller.ts
    └── cell-mapping.service.ts

libs/common/src/lib/interfaces/
├── k1-box-definition.interface.ts   # NEW: shared TS interface
└── k1-line-item.interface.ts        # NEW: shared TS interface
```

**Structure Decision**: Backend-only feature using 2 Nx projects (`apps/api` + `libs/common`). One new NestJS module (`k1-box-definition`) replaces the existing `cell-mapping` module. All other changes modify existing files in-place.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Raw SQL for materialized views (Constitution III) | Prisma ORM has no `CREATE MATERIALIZED VIEW` support | Cannot achieve FR-010/011 (cross-entity dashboard queries within 50ms) without pre-computed views. Regular Prisma queries would require O(n) JOINs at read time. |
| Raw SQL for backfill migration (Constitution III) | Prisma cannot iterate JSONB keys server-side | Alternative: fetch all KDocuments to Node.js, parse JSON, insert rows via Prisma. Rejected: unbounded memory for large datasets, no transactional atomicity, orders of magnitude slower than a single SQL `INSERT ... SELECT FROM jsonb_each()`. |
