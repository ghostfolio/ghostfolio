# Contract: K1 Extractor Interface

**Feature**: 005-k1-parser-fix | **Date**: 2026-03-18

## Overview

The K1 extraction system uses a strategy pattern where multiple extractors implement the `K1Extractor` interface. This feature rewrites the `PdfParseExtractor` (Tier 1) internals while preserving the interface contract.

## K1Extractor Interface (unchanged)

```typescript
interface K1Extractor {
  extract(buffer: Buffer, fileName: string): Promise<K1ExtractionResult>;
  isAvailable(): boolean;
}
```

### extract(buffer, fileName)

**Input**:
- `buffer`: Raw PDF file content as a Node.js Buffer
- `fileName`: Original filename of the uploaded PDF (for logging/diagnostics)

**Output**: `K1ExtractionResult` containing:
- `metadata`: Partnership/partner info, tax year, filing status
- `fields`: Array of `K1ExtractedField` (mapped values)
- `unmappedItems`: Array of `K1UnmappedItem` (values that couldn't be mapped)
- `overallConfidence`: 0.0–1.0 aggregate confidence
- `method`: `'pdf-parse'` (this extractor)
- `pagesProcessed`: number (typically 1)

**Error handling**:
- Throws on non-PDF input (invalid buffer)
- Returns empty fields + low confidence for non-K-1 PDFs
- Never crashes on unexpected PDF content

### isAvailable()

Returns `true` always (no external dependencies or API keys needed).

## K1ExtractionResult Shape (expanded)

```typescript
interface K1ExtractionResult {
  metadata: {
    partnershipName: string | null;
    partnershipEin: string | null;
    partnerName: string | null;
    partnerEin: string | null;
    taxYear: number | null;
    isAmended: boolean;
    isFinal: boolean;
  };
  fields: K1ExtractedField[];
  unmappedItems: K1UnmappedItem[];
  overallConfidence: number;
  method: 'pdf-parse' | 'azure' | 'tesseract';
  pagesProcessed: number;
}
```

## K1ExtractedField Shape (expanded)

```typescript
interface K1ExtractedField {
  boxNumber: string;           // "1", "6a", "19", "20", "J_PROFIT_BEGIN", etc.
  label: string;               // Display label
  customLabel: string | null;  // User override
  rawValue: string;            // Raw text: "498,211", "(409,811)", "SEE STMT", "X"
  numericValue: number | null; // Parsed: 498211, -409811, null, null
  confidence: number;          // 0.0–1.0
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  isUserEdited: boolean;       // Default false
  isReviewed: boolean;         // Default false
  subtype: string | null;      // NEW: "ZZ*", "A", "B", "*", null
  fieldCategory: string;       // NEW: "PART_III", "METADATA", "SECTION_J", etc.
  isCheckbox: boolean;         // NEW: true for checkbox fields
}
```

## K1UnmappedItem Shape (expanded)

```typescript
interface K1UnmappedItem {
  rawLabel: string;
  rawValue: string;
  numericValue: number | null;
  confidence: number;
  pageNumber: number;
  resolution: 'assigned' | 'discarded' | null;
  assignedBoxNumber: string | null;
  x: number;                   // NEW: x position in PDF points
  y: number;                   // NEW: y position in PDF points
  fontName: string;            // NEW: PDF font identifier
}
```

## Behavioral Contract

1. **Font discrimination**: The extractor MUST dynamically identify which fonts carry data values vs. template text. It MUST NOT hardcode specific font names.
2. **Position matching**: Each data value MUST be mapped to a K-1 field by checking its (x, y) against defined bounding box regions.
3. **Subtype pairing**: For subtype boxes, code and value items at the same y-position (±8 pts) MUST be paired.
4. **Multi-subtype**: Boxes with multiple subtypes (e.g., box 20) MUST produce separate `K1ExtractedField` entries for each subtype row.
5. **Value parsing**: Parenthesized values MUST become negative. Commas MUST be stripped. "SEE STMT" MUST remain as-is with null numericValue.
6. **Unmapped fallback**: Any data value not matching a region MUST appear in `unmappedItems` — zero data loss.
7. **Cleanup**: The PDF document MUST be destroyed after extraction to free worker resources.
8. **Page scope**: Only page 1 is processed. Multi-page K-1s have supplemental statements on subsequent pages (out of scope).
