# Implementation Plan: Fix K-1 PDF Parser — Position-Based Extraction

**Branch**: `005-k1-parser-fix` | **Date**: 2026-03-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-k1-parser-fix/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Rewrite the K-1 PDF parser from regex-based label matching to position-based text extraction using `pdfjs-dist`. The current regex parser incorrectly matches cell numbers instead of actual data values. The new parser will use font discrimination (data fonts vs template fonts) and (x,y) coordinate mapping to bounding-box regions for each K-1 form field. This fixes extraction for all Part I/II metadata, Part III boxes 1-21 (including subtypes, multi-value fields, and SEE STMT references), checkboxes, and Sections J/K/L/M/N. The existing `PdfParseExtractor` already implements position-based extraction — this spec refines its accuracy and adds confidence scoring, unmapped item handling, and dynamic font identification.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js ≥22.18.0  
**Primary Dependencies**: NestJS 11+, Angular 21+, pdfjs-dist (position-based text extraction), Prisma ORM  
**Storage**: PostgreSQL (via Prisma), Redis (caching), filesystem (uploaded PDFs)  
**Testing**: Jest (unit + integration)  
**Target Platform**: Linux server (Docker) / local dev (Windows/macOS)  
**Project Type**: Web application (Nx monorepo: api + client + common + ui)  
**Performance Goals**: <5 seconds for single-page K-1 extraction (SC-009)  
**Constraints**: Zero data loss during extraction (SC-007); preserve existing API contract (FR-025)  
**Scale/Scope**: Single-user family office; ~10-50 K-1 PDFs per tax year

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate | Rule | Status | Notes |
|------|------|--------|-------|
| Nx boundary | Features respect project boundaries (api/client/common/ui) | ✅ PASS | Parser in `@ghostfolio/api`, interfaces in `@ghostfolio/common`, UI in `@ghostfolio/client` |
| NestJS module pattern | Module + Controller + Service structure | ✅ PASS | `K1ImportModule` already exists with proper DI |
| Prisma data layer | No direct SQL; use PrismaService | ✅ PASS | All DB access via Prisma ORM |
| TypeScript strict | No unused locals/params, path aliases | ✅ PASS | Existing codebase conventions followed |
| Simplicity first | YAGNI, minimal abstractions | ✅ PASS | Modifying existing `PdfParseExtractor`, not adding new layers |
| Interface-first design | Shared interfaces in `@ghostfolio/common` | ✅ PASS | `K1ExtractionResult`, `K1ExtractedField`, `K1UnmappedItem` already defined |
| Max 3 Nx projects per feature | api + common typical | ✅ PASS | Touches api + common only (client UI already exists, no changes needed) |

**All gates pass. No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/005-k1-parser-fix/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/api/src/app/k1-import/
├── extractors/
│   ├── k1-extractor.interface.ts        # K1Extractor contract (no changes)
│   ├── k1-position-regions.ts           # MODIFY: refine bounding boxes, add tolerance config
│   ├── pdf-parse-extractor.ts           # MODIFY: core rewrite — font discrimination, position mapping
│   ├── azure-extractor.ts               # No changes (Tier 2)
│   └── tesseract-extractor.ts           # No changes (Tier 2 fallback)
├── k1-import.service.ts                 # Minor: add warning generation for unmapped items
├── k1-import.controller.ts              # No changes
├── k1-field-mapper.service.ts           # Minor: handle new confidence levels
├── k1-confidence.service.ts             # MODIFY: integrate position-match confidence
└── k1-import.module.ts                  # No changes

libs/common/src/lib/interfaces/
└── k1-import.interface.ts               # Minor: add fontName/position to K1UnmappedItem if needed

prisma/
└── schema.prisma                        # No changes (existing schema sufficient)
```

**Structure Decision**: Existing Nx monorepo structure is used. The core change is within `apps/api/src/app/k1-import/extractors/` — specifically `pdf-parse-extractor.ts` and `k1-position-regions.ts`. No new modules, no new Nx projects.

## Complexity Tracking

> No violations detected. All changes fit within existing module boundaries.
