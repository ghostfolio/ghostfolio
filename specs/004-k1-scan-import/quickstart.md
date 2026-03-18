# Quickstart: K-1 PDF Scan Import

**Phase 1 Output** | **Date**: 2026-03-18

## Prerequisites

1. Spec 001-family-office-transform models are implemented (Entity, Partnership, PartnershipMembership, KDocument, Distribution, Document)
2. At least one Partnership with one or more member Entities exists in the database
3. The existing upload infrastructure (`UploadController`, `uploads/` directory) is functional
4. Node.js ≥ 22.18.0, Docker for PostgreSQL/Redis

## Environment Setup

Add to `.env` (optional — for Azure OCR of scanned PDFs):
```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=your-api-key
```

If these are empty, scanned PDFs fall back to `tesseract.js` (lower accuracy but fully self-hosted).

## New Dependencies

```bash
npm install pdf-parse @azure/ai-form-recognizer tesseract.js
npm install -D @types/pdf-parse
```

## Database Migration

After adding the new Prisma models (`K1ImportSession`, `CellMapping`, `K1ImportStatus` enum):

```bash
npx prisma db push          # Development: sync schema
# OR
npx prisma migrate dev      # Create a migration file
```

Seed the default IRS cell mappings (28 rows with partnershipId = null) via the existing seed mechanism or a dedicated seed script.

## Key Files to Create

### Backend (apps/api/src/)

```
app/k1-import/
├── k1-import.module.ts              # NestJS module
├── k1-import.controller.ts          # REST endpoints (see contracts/k1-import-api.md)
├── k1-import.service.ts             # Orchestration: upload → extract → verify → confirm
├── dto/
│   ├── upload-k1.dto.ts             # Multipart upload DTO
│   ├── verify-k1.dto.ts             # Verification submission DTO
│   └── confirm-k1.dto.ts            # Confirmation request DTO
├── extractors/
│   ├── k1-extractor.interface.ts    # Common extraction interface
│   ├── pdf-parse-extractor.ts       # Tier 1: digital PDF text extraction
│   ├── azure-extractor.ts           # Tier 2: Azure Document Intelligence
│   └── tesseract-extractor.ts       # Tier 2 fallback: tesseract.js OCR
├── k1-field-mapper.service.ts       # Maps raw extraction → K1ExtractedField[]
├── k1-allocation.service.ts         # Allocates K-1 amounts to members by ownership %
└── k1-confidence.service.ts         # Computes confidence scores with validation heuristics

app/cell-mapping/
├── cell-mapping.module.ts           # NestJS module
├── cell-mapping.controller.ts       # CRUD for cell mappings
└── cell-mapping.service.ts          # Cell mapping business logic + seed data
```

### Shared Types (libs/common/src/lib/)

```
interfaces/
├── k1-import.interface.ts           # K1ExtractionResult, K1ExtractedField, K1ConfirmationRequest
dtos/
├── k1-import/
│   ├── create-k1-import.dto.ts
│   ├── verify-k1-import.dto.ts
│   └── confirm-k1-import.dto.ts
```

### Frontend (apps/client/src/app/)

```
pages/k1-import/
├── k1-import-page.component.ts      # Upload + history view
├── k1-import-page.html
├── k1-import-page.scss
├── k1-import-page.routes.ts
├── k1-verification/
│   ├── k1-verification.component.ts # Verification/edit screen
│   ├── k1-verification.html
│   └── k1-verification.scss
└── k1-confirmation/
    ├── k1-confirmation.component.ts  # Confirmation result screen
    ├── k1-confirmation.html
    └── k1-confirmation.scss

pages/cell-mapping/
├── cell-mapping-page.component.ts   # Cell mapping configuration UI
├── cell-mapping-page.html
└── cell-mapping-page.routes.ts

services/
├── k1-import-data.service.ts        # HTTP client for k1-import endpoints
```

## Verification Workflow

1. **Upload**: User selects PDF → `POST /api/v1/k1-import/upload` → session created with status PROCESSING
2. **Extract**: Backend detects PDF type (digital vs. scanned) → routes to appropriate extractor → status becomes EXTRACTED
3. **Review**: Frontend polls/fetches session → displays verification screen with extracted fields, confidence indicators
4. **Edit**: User corrects values, overrides labels → `PUT /api/v1/k1-import/:id/verify` → status becomes VERIFIED
5. **Confirm**: User clicks "Confirm & Save" → `POST /api/v1/k1-import/:id/confirm` → KDocument + Distributions + Document created → status becomes CONFIRMED

## Testing Strategy

- **Unit tests**: Extractors (pdf-parse, azure, tesseract), field mapper, confidence scoring, allocation math
- **Integration tests**: Full upload → extract → verify → confirm flow with test PDF fixtures
- **Test fixtures**: Include sample K-1 PDFs (digital and scanned) in `test/import/` directory
- **Allocation accuracy**: Verify rounding behavior — allocated amounts must sum exactly to partnership total
