# Data Model: K-1 PDF Scan Import

**Phase 1 Output** | **Date**: 2026-03-18 | **Updated**: 2026-03-18 (post-clarification)

## Overview

This feature adds 3 new Prisma models and 1 new enum to support K-1 PDF scanning, import session tracking, cell mapping configuration, and aggregation rules. It extends the existing models from spec 001-family-office-transform (KDocument, Distribution, Document, PartnershipMembership) with automatic creation from scanned data.

### Entity Relationship Diagram (Conceptual)

```
User (existing)
 └── Partnership (existing from 001)
      ├── K1ImportSession[] ──┬── Document (uploaded PDF, existing from 001)
      │   (new model)         ├── KDocument (auto-created, existing from 001)
      │                       └── CellMapping (per-partnership config)
      ├── PartnershipMembership[] (existing from 001)
      │    └── [K-1 allocations computed at confirm time]
      ├── KDocument[] (existing from 001)
      │    └── Distribution[] (auto-created from Box 19, existing from 001)
      ├── CellMapping[] (new model, per-partnership overrides)
      └── CellAggregationRule[] (new model, per-partnership or global)
           └── [computed totals derived dynamically from raw box values]

Global CellMapping (partnershipId = null) ── IRS default box definitions
Global CellAggregationRule (partnershipId = null) ── default summary rules
```

## New Enum

### K1ImportStatus

Tracks the lifecycle of a K-1 import session.

| Value        | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| `PROCESSING` | PDF uploaded, extraction in progress                           |
| `EXTRACTED`  | Extraction complete, awaiting user review                      |
| `VERIFIED`   | User has reviewed/edited values, ready for confirmation        |
| `CONFIRMED`  | User confirmed, model objects created (KDocument, Distributions) |
| `CANCELLED`  | User cancelled, no model objects created                       |
| `FAILED`     | Extraction failed (invalid PDF, OCR error, etc.)               |

## New Models

### K1ImportSession

A record of a single K-1 PDF import attempt, tracking the full lifecycle from upload through confirmation.

| Field              | Type             | Constraints                  | Description                                                     |
| ------------------ | ---------------- | ---------------------------- | --------------------------------------------------------------- |
| `id`               | `String`         | PK, UUID, auto-generated     | Unique identifier                                               |
| `partnershipId`    | `String`         | FK → Partnership.id, indexed | Target partnership for this K-1 import                         |
| `userId`           | `String`         | FK → User.id, indexed        | User who initiated the import                                   |
| `status`           | `K1ImportStatus` | Required, Default: PROCESSING | Current lifecycle status                                       |
| `taxYear`          | `Int`            | Required                     | Tax year extracted or specified by user                         |
| `fileName`         | `String`         | Required                     | Original filename of uploaded PDF                               |
| `fileSize`         | `Int`            | Required                     | File size in bytes                                              |
| `extractionMethod` | `String`         | Required                     | Method used: "pdf-parse", "azure", "tesseract"                 |
| `rawExtraction`    | `Json?`          | Optional                     | Raw extraction results before user edits                       |
| `verifiedData`     | `Json?`          | Optional                     | User-verified/edited extraction results (K1ExtractionResult)   |
| `documentId`       | `String?`        | FK → Document.id, optional   | Linked uploaded PDF Document record                            |
| `kDocumentId`      | `String?`        | FK → KDocument.id, optional  | Resulting KDocument (set on CONFIRMED status)                  |
| `errorMessage`     | `String?`        | Optional                     | Error details if status is FAILED                              |
| `createdAt`        | `DateTime`       | Default: now()               | Upload timestamp                                               |
| `updatedAt`        | `DateTime`       | Auto-updated                 | Last modification timestamp                                    |

**Relations**:

- `partnership` → `Partnership` (many-to-one, cascade delete)
- `user` → `User` (many-to-one, cascade delete)
- `document` → `Document?` (many-to-one, optional)
- `kDocument` → `KDocument?` (many-to-one, optional)

**Indexes**: `@@index([partnershipId, taxYear])` for import history queries per partnership/year.

### CellMapping

A configuration defining how K-1 box numbers map to labels. Supports a global IRS-default set (partnershipId = null) and per-partnership customizations.

| Field           | Type       | Constraints                            | Description                                          |
| --------------- | ---------- | -------------------------------------- | ---------------------------------------------------- |
| `id`            | `String`   | PK, UUID, auto-generated               | Unique identifier                                    |
| `partnershipId` | `String?`  | FK → Partnership.id, optional, indexed | Partnership this mapping applies to (null = global)  |
| `boxNumber`     | `String`   | Required                               | K-1 box identifier (e.g., "1", "6a", "19a", "20-A") |
| `label`         | `String`   | Required                               | Display label (e.g., "Ordinary business income")     |
| `description`   | `String?`  | Optional                               | Extended description or IRS instructions              |
| `isCustom`      | `Boolean`  | Default: false                         | Whether this is a user-added custom cell             |
| `sortOrder`     | `Int`      | Required                               | Display order in the verification screen             |
| `createdAt`     | `DateTime` | Default: now()                         | Creation timestamp                                   |
| `updatedAt`     | `DateTime` | Auto-updated                           | Last modification timestamp                          |

**Relations**:

- `partnership` → `Partnership?` (many-to-one, optional, cascade delete)

**Unique constraint**: `@@unique([partnershipId, boxNumber])` — one mapping per box per partnership (or per box globally when partnershipId is null).

### CellAggregationRule

A named rule that combines multiple K-1 cells into a computed summary value. Computed totals are NOT stored — they are derived dynamically from raw box values each time they are displayed (FR-039).

| Field           | Type       | Constraints                            | Description                                                     |
| --------------- | ---------- | -------------------------------------- | --------------------------------------------------------------- |
| `id`            | `String`   | PK, UUID, auto-generated               | Unique identifier                                               |
| `partnershipId` | `String?`  | FK → Partnership.id, optional, indexed | Partnership this rule applies to (null = global default)        |
| `name`          | `String`   | Required                               | Display name (e.g., "Income Summary", "Total Capital Gains")    |
| `operation`     | `String`   | Required, Default: "SUM"               | Aggregation operation (SUM for V1; future: AVG, MIN, MAX)       |
| `sourceCells`   | `Json`     | Required                               | Array of box numbers to aggregate (e.g., ["1", "2", "3"])      |
| `sortOrder`     | `Int`      | Required                               | Display order in the aggregation summary section                |
| `createdAt`     | `DateTime` | Default: now()                         | Creation timestamp                                              |
| `updatedAt`     | `DateTime` | Auto-updated                           | Last modification timestamp                                     |

**Relations**:

- `partnership` → `Partnership?` (many-to-one, optional, cascade delete)

**Unique constraint**: `@@unique([partnershipId, name])` — one rule per name per partnership (or globally).

**Note**: No `computedValue` column. Totals are always computed on-the-fly from the KDocument's raw box values using the `sourceCells` array and `operation`. This ensures summaries auto-update when underlying values change (e.g., estimated→final K-1 transition).

## Modifications to Existing Models

### Partnership (from spec 001)

Add back-references — no column changes:

| New Field            | Type                     | Description                          |
| -------------------- | ------------------------ | ------------------------------------ |
| `importSessions`     | `K1ImportSession[]`      | Import attempts for this partnership |
| `cellMappings`       | `CellMapping[]`          | Custom cell mapping configurations   |
| `aggregationRules`   | `CellAggregationRule[]`  | Custom aggregation rule definitions  |

### KDocument (from spec 001)

Add back-reference — no column changes:

| New Field        | Type                | Description                              |
| ---------------- | ------------------- | ---------------------------------------- |
| `importSession`  | `K1ImportSession?`  | Import session that created this record  |

## Application-Layer Types

### K1ExtractionResult (TypeScript interface)

The structure returned by the extraction service and stored in `K1ImportSession.rawExtraction` and `K1ImportSession.verifiedData`.

```typescript
interface K1ExtractionResult {
  /** Extracted metadata from the K-1 header */
  metadata: {
    partnershipName: string | null;
    partnershipEin: string | null;
    partnerName: string | null;
    partnerEin: string | null;
    taxYear: number | null;
    isAmended: boolean;
    isFinal: boolean;
  };

  /** Extracted box values — mapped to known cells */
  fields: K1ExtractedField[];

  /** Extracted values that didn't match any configured cell mapping */
  unmappedItems: K1UnmappedItem[];

  /** Overall extraction confidence (0.0–1.0) */
  overallConfidence: number;

  /** Extraction method used */
  method: 'pdf-parse' | 'azure' | 'tesseract';

  /** Number of pages processed */
  pagesProcessed: number;
}

interface K1ExtractedField {
  /** Box identifier (e.g., "1", "6a", "19a") */
  boxNumber: string;

  /** Display label from cell mapping */
  label: string;

  /** Custom label override by user (null if not overridden) */
  customLabel: string | null;

  /** Extracted raw text value */
  rawValue: string;

  /** Parsed numeric value (null if unparseable) */
  numericValue: number | null;

  /** Confidence score (0.0–1.0) */
  confidence: number;

  /** Confidence level for display */
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';

  /** Whether user has manually edited this value */
  isUserEdited: boolean;

  /** Whether user has explicitly reviewed this field (required for medium/low confidence) */
  isReviewed: boolean;
}

interface K1UnmappedItem {
  /** Raw text label extracted from the PDF */
  rawLabel: string;

  /** Raw text value extracted */
  rawValue: string;

  /** Parsed numeric value (null if unparseable) */
  numericValue: number | null;

  /** Confidence score (0.0–1.0) */
  confidence: number;

  /** Page number where this was extracted */
  pageNumber: number;

  /** User action: 'assigned' (to a cell), 'discarded', or null (pending) */
  resolution: 'assigned' | 'discarded' | null;

  /** If assigned, the box number it was assigned to */
  assignedBoxNumber: string | null;
}
```

### K1ConfirmationRequest (TypeScript interface)

The request body when the user confirms verified K-1 data.

```typescript
interface K1ConfirmationRequest {
  /** Import session ID */
  importSessionId: string;

  /** Tax year (may have been overridden by user) */
  taxYear: number;

  /** Filing status for the new KDocument */
  filingStatus: 'DRAFT' | 'ESTIMATED' | 'FINAL';

  /** Verified fields with any user edits applied */
  fields: K1ExtractedField[];

  /** Whether to update an existing KDocument (null = create new) */
  existingKDocumentAction: 'UPDATE' | 'CREATE_NEW' | null;
}
```

### Default IRS K-1 Cell Mapping

The standard box definitions seeded as global CellMapping records (partnershipId = null):

| boxNumber | label                                     | sortOrder |
| --------- | ----------------------------------------- | --------- |
| 1         | Ordinary business income (loss)            | 1         |
| 2         | Net rental real estate income (loss)       | 2         |
| 3         | Other net rental income (loss)             | 3         |
| 4         | Guaranteed payments for services           | 4         |
| 4a        | Guaranteed payments for capital            | 5         |
| 4b        | Total guaranteed payments                  | 6         |
| 5         | Interest income                            | 7         |
| 6a        | Ordinary dividends                         | 8         |
| 6b        | Qualified dividends                        | 9         |
| 6c        | Dividend equivalents                       | 10        |
| 7         | Royalties                                  | 11        |
| 8         | Net short-term capital gain (loss)         | 12        |
| 9a        | Net long-term capital gain (loss)          | 13        |
| 9b        | Collectibles (28%) gain (loss)             | 14        |
| 9c        | Unrecaptured section 1250 gain             | 15        |
| 10        | Net section 1231 gain (loss)               | 16        |
| 11        | Other income (loss)                        | 17        |
| 12        | Section 179 deduction                      | 18        |
| 13        | Other deductions                           | 19        |
| 14        | Self-employment earnings (loss)            | 20        |
| 15        | Credits                                    | 21        |
| 16        | Foreign transactions                       | 22        |
| 17        | Alternative minimum tax (AMT) items        | 23        |
| 18        | Tax-exempt income and nondeductible expenses | 24      |
| 19a       | Distributions — Cash and marketable securities | 25    |
| 19b       | Distributions — Other property             | 26        |
| 20        | Other information                          | 27        |
| 21        | Foreign taxes paid or accrued              | 28        |

## Validation Rules

1. **Import session partnership**: Must reference an existing partnership owned by the current user.
2. **Import session tax year**: Must be ≥ year of the partnership's inception date.
3. **File upload**: Must be a valid PDF, ≤ 25 MB. System rejects non-PDF MIME types.
4. **Extraction status transitions**: Only valid transitions: PROCESSING → EXTRACTED → VERIFIED → CONFIRMED/CANCELLED, or PROCESSING → FAILED. No backwards transitions.
5. **Cell mapping uniqueness**: One mapping per (partnershipId, boxNumber). Custom mappings for a partnership override the global default for that box number.
6. **Confirmation prerequisites**: Can only confirm when status is VERIFIED, partnership has at least one active member, and verifiedData is not null.
7. **Duplicate KDocument check**: Before creating a KDocument, check for existing (partnershipId, type=K1, taxYear). If found, require explicit user decision (update existing or reject).
8. **Distribution allocation**: Box 19a/19b amounts are allocated to members by ownership percentage as of the tax year's fiscal year end. Allocation amounts must sum exactly to the partnership-level total (handle rounding by adjusting the largest member's allocation).
9. **Aggregation rule source cells**: All box numbers in `sourceCells` must reference valid cell mapping entries. If a source cell has no value in the KDocument, it contributes 0 to the aggregate.
10. **Unmapped items resolution**: All unmapped items must be resolved (assigned to a cell or discarded) before the import session can transition to VERIFIED status.
11. **Review requirement**: All medium and low-confidence fields must have `isReviewed: true` before confirmation is allowed (FR-035). High-confidence fields are auto-set to `isReviewed: true`.
