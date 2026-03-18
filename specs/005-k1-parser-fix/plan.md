# Implementation Plan: Fix K-1 PDF Parser — Position-Based Extraction

**Branch**: `005-k1-parser-fix` | **Date**: 2026-03-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-k1-parser-fix/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Rewrite the K-1 PDF extractor from a broken regex-based label matcher to a position-based extraction engine using pdfjs-dist. The core approach: use `page.getTextContent()` to get all text items with (x, y) coordinates and font info, discriminate data values from template text by font, then map each data value to a K-1 form field based on position regions (bounding boxes). Supports Part III boxes 1-21 with subtype codes, Part I/II metadata, sections J/K/L/M/N, and checkboxes. Unmapped values go to a fallback list for manual user assignment.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js runtime)
**Primary Dependencies**: NestJS 11.x, pdfjs-dist 5.4.x (already installed via pdf-parse), pdf-parse 2.4.x (kept for `isDigitalK1` detection)
**Storage**: PostgreSQL via Prisma ORM (existing K1ImportSession, Document tables)
**Testing**: Jest (unit tests for extraction logic, position mapping, value parsing)
**Target Platform**: Node.js server (NestJS API), Angular 21 client (existing review UI)
**Project Type**: Web service (monorepo: api + common libs)
**Performance Goals**: < 5 seconds extraction for a single-page K-1 PDF
**Constraints**: Must preserve existing `K1Extractor` interface contract; no new npm dependencies (pdfjs-dist is already transitive)
**Scale/Scope**: Single-file parser rewrite + interface expansion in common lib; ~2 files modified, ~1 new file

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Nx Monorepo Structure | PASS | Changes in `apps/api` (extractor) and `libs/common` (interfaces). No new projects. |
| II. NestJS Module Pattern | PASS | PdfParseExtractor is already a `@Injectable()` provider in K1ImportModule. Rewriting internals only. |
| III. Prisma Data Layer | PASS | No schema changes. Existing tables sufficient. |
| IV. TypeScript Strict Conventions | PASS | Will follow `noUnusedLocals`, `noUnusedParameters`, path aliases. |
| V. Simplicity First | PASS | Rewriting one file, expanding one interface. No new architectural layers. |
| VI. Interface-First Design | PASS | K1ExtractedField interface expanded first, then implementation follows. |

No gate violations. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/005-k1-parser-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── extraction.md    # Extractor interface contract
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/api/src/app/k1-import/
├── extractors/
│   ├── k1-extractor.interface.ts      # Unchanged
│   ├── pdf-parse-extractor.ts         # REWRITE: position-based extraction
│   ├── k1-position-regions.ts         # NEW: bounding box definitions for K-1 form fields
│   ├── azure-extractor.ts             # Unchanged
│   └── tesseract-extractor.ts         # Unchanged
├── k1-import.module.ts                # Unchanged
├── k1-import.service.ts               # Minor: handle new subtype field in K1ExtractedField
├── k1-import.controller.ts            # Unchanged
└── ...

libs/common/src/lib/interfaces/
└── k1-import.interface.ts             # MODIFY: add subtype, fieldCategory, isCheckbox to K1ExtractedField

tests/
└── apps/api/src/app/k1-import/
    └── extractors/
        └── pdf-parse-extractor.spec.ts  # NEW: unit tests
```

**Structure Decision**: Minimalist approach — rewrite one extractor file, add one position-region data file, expand one interface. Follows the existing module structure with no new architectural patterns.

## Complexity Tracking

No constitution violations. Table intentionally empty.
