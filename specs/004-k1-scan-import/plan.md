# Implementation Plan: K-1 PDF Scan Import

**Branch**: `004-k1-scan-import` | **Date**: 2026-03-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-k1-scan-import/spec.md`

## Summary

Automated K-1 PDF scanning that extracts structured IRS Schedule K-1 (Form 1065) data from uploaded PDFs, presents a verification screen for manual review/correction, and auto-creates downstream model objects (KDocument, Distributions, member allocations, Document). Uses a two-tier extraction approach: `pdf-parse` for digital PDFs (free, instant, local) and Azure AI Document Intelligence / `tesseract.js` fallback for scanned PDFs. Supports per-partnership cell mapping customization and import history with re-processing.

## Technical Context

**Language/Version**: TypeScript 5.9.2, Node.js ≥ 22.18.0
**Primary Dependencies**: NestJS 11.x (backend), Angular 21.x (frontend), Prisma 6.x (ORM), pdf-parse (PDF text), @azure/ai-form-recognizer (cloud OCR), tesseract.js (local OCR fallback)
**Storage**: PostgreSQL via Prisma (structured data), local filesystem `uploads/` (PDF files)
**Testing**: Jest (unit + integration), test K-1 PDF fixtures in `test/import/`
**Target Platform**: Docker (node:22-slim), self-hosted or Railway
**Project Type**: Web application (NestJS API + Angular SPA) — Nx monorepo
**Performance Goals**: PDF extraction < 30 seconds (SC-001), model creation < 5 seconds (SC-005), 90%+ accuracy for digital PDFs (SC-002)
**Constraints**: Self-hosted capable (Azure OCR optional), max PDF size 25 MB, K-1 Form 1065 only (V1)
**Scale/Scope**: Single family office (10–50 partnerships, 10–50 K-1s/year), 2 new API modules, 3 new frontend pages

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

No constitution.md exists for this project. Gates assessed against standard engineering principles:

| Gate | Status | Notes |
|------|--------|-------|
| No unnecessary dependencies | PASS | 3 new packages (`pdf-parse`, `@azure/ai-form-recognizer`, `tesseract.js`) — each serves a distinct, justified purpose per research.md |
| Follows existing patterns | PASS | New NestJS modules follow existing controller/service/DTO pattern (mirrors `k-document`, `upload` modules) |
| No breaking changes | PASS | 2 new Prisma models + 1 enum, back-references only on existing models — no column changes |
| Test coverage | PASS | Unit tests for extractors, mapper, allocation; integration tests for full pipeline |
| Self-hosted compatible | PASS | Core extraction (pdf-parse) is fully local; Azure is optional with tesseract.js fallback |

**Post-Phase 1 re-check**: PASS — data model adds 2 models/1 enum, no existing schema changes beyond back-references. API contracts follow existing REST patterns. No violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/004-k1-scan-import/
├── plan.md              # This file
├── research.md          # Phase 0: OCR provider research & decisions
├── data-model.md        # Phase 1: K1ImportSession, CellMapping models
├── quickstart.md        # Phase 1: Setup & dev guide
├── contracts/
│   └── k1-import-api.md # Phase 1: REST API contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/api/src/app/
├── k1-import/
│   ├── k1-import.module.ts
│   ├── k1-import.controller.ts
│   ├── k1-import.service.ts
│   ├── dto/
│   │   ├── upload-k1.dto.ts
│   │   ├── verify-k1.dto.ts
│   │   └── confirm-k1.dto.ts
│   ├── extractors/
│   │   ├── k1-extractor.interface.ts
│   │   ├── pdf-parse-extractor.ts
│   │   ├── azure-extractor.ts
│   │   └── tesseract-extractor.ts
│   ├── k1-field-mapper.service.ts
│   ├── k1-allocation.service.ts
│   └── k1-confidence.service.ts
├── cell-mapping/
│   ├── cell-mapping.module.ts
│   ├── cell-mapping.controller.ts
│   └── cell-mapping.service.ts

apps/client/src/app/
├── pages/
│   ├── k1-import/
│   │   ├── k1-import-page.component.ts
│   │   ├── k1-import-page.html
│   │   ├── k1-import-page.scss
│   │   ├── k1-import-page.routes.ts
│   │   ├── k1-verification/
│   │   │   ├── k1-verification.component.ts
│   │   │   ├── k1-verification.html
│   │   │   └── k1-verification.scss
│   │   └── k1-confirmation/
│   │       ├── k1-confirmation.component.ts
│   │       ├── k1-confirmation.html
│   │       └── k1-confirmation.scss
│   └── cell-mapping/
│       ├── cell-mapping-page.component.ts
│       ├── cell-mapping-page.html
│       └── cell-mapping-page.routes.ts
├── services/
│   └── k1-import-data.service.ts

libs/common/src/lib/
├── interfaces/
│   └── k1-import.interface.ts
├── dtos/
│   └── k1-import/
│       ├── create-k1-import.dto.ts
│       ├── verify-k1-import.dto.ts
│       └── confirm-k1-import.dto.ts

prisma/
├── schema.prisma                    # + K1ImportSession, CellMapping, K1ImportStatus
├── migrations/
│   └── 2026XXXX_added_k1_import/    # New migration

test/import/
├── sample-k1-digital.pdf            # Test fixture: digital K-1
└── sample-k1-scanned.pdf            # Test fixture: scanned K-1
```

**Structure Decision**: Follows the existing Nx monorepo convention with new NestJS modules under `apps/api/src/app/` and new Angular pages under `apps/client/src/app/pages/`. Shared interfaces and DTOs in `libs/common/`. This mirrors the existing `k-document`, `upload`, and `family-office` module patterns.
