# Data Model: Fix K-1 PDF Parser

**Feature**: 005-k1-parser-fix | **Date**: 2026-03-18

## Overview

This feature modifies no database tables. All changes are to in-memory TypeScript interfaces in `@ghostfolio/common`. The extraction result flows through: PDF → extractor → K1ExtractionResult → review UI → confirm → persist to existing KDocument/K1Cell tables.

## Entity Changes

### K1ExtractedField (modified)

Existing interface at `libs/common/src/lib/interfaces/k1-import.interface.ts`. Three new fields added:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| boxNumber | string | yes | Existing: "1", "6a", "19", "20" |
| label | string | yes | Existing: display label from cell mapping |
| customLabel | string \| null | no | Existing: user override |
| rawValue | string | yes | Existing: raw extracted text ("498,211", "(409,811)", "SEE STMT", "X") |
| numericValue | number \| null | no | Existing: parsed numeric value |
| confidence | number | yes | Existing: 0.0–1.0 |
| confidenceLevel | 'HIGH' \| 'MEDIUM' \| 'LOW' | yes | Existing |
| isUserEdited | boolean | yes | Existing: default false |
| isReviewed | boolean | yes | Existing: default false |
| **subtype** | **string \| null** | **no** | **NEW**: subtype code (e.g., "ZZ*", "A", "B", "*"). Null for simple boxes. |
| **fieldCategory** | **string** | **yes** | **NEW**: "PART_III", "METADATA", "SECTION_J", "SECTION_K", "SECTION_L", "SECTION_M", "SECTION_N", "CHECKBOX" |
| **isCheckbox** | **boolean** | **yes** | **NEW**: true if field is a boolean checkbox value. Default false. |

### K1UnmappedItem (modified)

Existing interface. Three new fields for position debugging:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| rawLabel | string | yes | Existing |
| rawValue | string | yes | Existing |
| numericValue | number \| null | no | Existing |
| confidence | number | yes | Existing |
| pageNumber | number | yes | Existing |
| resolution | 'assigned' \| 'discarded' \| null | no | Existing |
| assignedBoxNumber | string \| null | no | Existing |
| **x** | **number** | **yes** | **NEW**: x position in PDF points |
| **y** | **number** | **yes** | **NEW**: y position in PDF points |
| **fontName** | **string** | **yes** | **NEW**: PDF font identifier |

### K1ExtractionResult (unchanged)

No changes to the top-level extraction result interface. The `metadata`, `fields`, `unmappedItems`, `overallConfidence`, `method`, and `pagesProcessed` structure remains the same.

### K1PositionRegion (new — internal to extractor)

This is NOT a shared interface — it lives inside the extractor module. It defines a bounding box for a K-1 form field region.

| Field | Type | Description |
|-------|------|-------------|
| fieldId | string | Unique identifier (e.g., "BOX_1", "J_PROFIT_BEGIN", "FINAL_K1") |
| boxNumber | string | K-1 box number for Part III fields; section identifier for others |
| label | string | Display label |
| fieldCategory | string | "PART_III", "METADATA", "SECTION_J", etc. |
| valueType | string | "numeric", "text", "checkbox", "percentage" |
| xMin | number | Left edge in PDF points |
| xMax | number | Right edge in PDF points |
| yMin | number | Bottom edge in PDF points |
| yMax | number | Top edge in PDF points |
| hasSubtype | boolean | Whether this region supports subtype codes |
| subtypeXMin | number \| null | Code column left edge (if hasSubtype) |
| subtypeXMax | number \| null | Code column right edge (if hasSubtype) |

### K1PositionRegion Count: 73 regions

See [research.md](research.md) Decision 3 for the complete region map.

## Validation Rules

1. `boxNumber` must be a valid K-1 box identifier (1-21, a/b/c sub-boxes, or section identifiers J/K/L/M/N)
2. `numericValue` must be null for "SEE STMT" and checkbox fields
3. `isCheckbox: true` requires `rawValue: "X"` and `numericValue: null`
4. `subtype` is only set for boxes that support subtypes (11, 12, 13, 14, 15, 17, 19, 20, 21)
5. Parenthesized values MUST have negative `numericValue`
6. Percentage values (Section J) MUST preserve decimal precision (no rounding)
7. `confidence` must be 0.0–1.0 with HIGH ≥ 0.90, MEDIUM 0.70–0.89, LOW 0.50–0.69

## State Transitions

No state machine changes. The existing K1ImportSession status flow remains:
```
UPLOADING → EXTRACTING → NEEDS_REVIEW → CONFIRMED → COMPLETED
                       ↘ EXTRACTION_FAILED
```

## Database Impact

**None.** No Prisma schema changes. The existing `K1Cell` table stores `boxNumber`, `value`, `label` etc. The new `subtype` field on K1ExtractedField can be concatenated into the existing boxNumber field for storage (e.g., "11-ZZ*", "20-A") or stored via the existing `metadata` JSON column.
