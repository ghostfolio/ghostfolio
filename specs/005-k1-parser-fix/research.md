# Research: Fix K-1 PDF Parser

**Feature**: 005-k1-parser-fix | **Date**: 2026-03-18

## Research Summary

All technical unknowns resolved. Three key decisions made:

1. **pdfjs-dist** for position-based text extraction (already installed)
2. **Font discrimination + position region mapping** as the extraction strategy
3. **73 bounding box regions** defined covering all K-1 form fields

---

## Decision 1: PDF Parsing Library

**Decision**: Use `pdfjs-dist` v5.4.296 directly (already installed as transitive dependency of pdf-parse v2.4.5)

**Rationale**:
- Already installed — no new npm dependencies
- `page.getTextContent()` returns `TextItem` objects with precise (x, y) coordinates, font name, width, height
- `@napi-rs/canvas` v0.1.80 (also already installed) provides DOMMatrix polyfill for Node.js via the legacy build
- The legacy build at `pdfjs-dist/legacy/build/pdf.mjs` auto-polyfills `DOMMatrix`, `ImageData`, `Path2D`, and `navigator`

**Alternatives considered**:
- **pdf-parse v2.4.5** (currently used): Wraps pdfjs-dist but does NOT expose position coordinates. Only returns concatenated text strings. Insufficient for position-based extraction.
- **pdf-lib**: Can read AcroForm fields, but K-1 PDFs have zero AcroForm fields (values are text overlays). Not useful.
- **pdf2json**: Older PDF.js fork with positioned text. Redundant — pdfjs-dist v5.4 is already available and more current.

### API Details

**Import** (must use dynamic import — API project compiles to CommonJS via webpack):
```typescript
const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
```

**Worker configuration** (required in v5.4.x):
```typescript
const workerPath = 'file:///' + resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs').replace(/\\/g, '/');
GlobalWorkerOptions.workerSrc = workerPath;
```

**Document loading**:
```typescript
const loadingTask = getDocument({
  data: new Uint8Array(buffer),
  standardFontDataUrl: resolve('node_modules/pdfjs-dist/standard_fonts') + '/',
  cMapUrl: resolve('node_modules/pdfjs-dist/cmaps') + '/',
  cMapPacked: true,
  isEvalSupported: false,
  disableFontFace: true,
});
```

**Text extraction**:
```typescript
const page = await pdfDoc.getPage(1);
const textContent = await page.getTextContent({ includeMarkedContent: false });
// textContent.items: TextItem[] with { str, transform, width, height, fontName, hasEOL, dir }
// textContent.styles: { [fontName]: { fontFamily, ascent, descent, vertical } }
// transform[4] = x, transform[5] = y (PDF points, origin bottom-left)
```

**Cleanup** (required):
```typescript
await pdfDoc.destroy(); // Terminates worker, frees resources
```

### Gotchas

1. Must use `pdfjs-dist/legacy/build/pdf.mjs` — main build crashes with `DOMMatrix is not defined`
2. Must set `GlobalWorkerOptions.workerSrc` to the worker file path — empty string no longer works in v5.4.x
3. `workerSrc` must be a `file://` URL on Windows
4. Use `await import()` not static `import` — CommonJS compat via webpack
5. Y-coordinates are bottom-up: `transform[5]` = 792 is top of page, 0 is bottom
6. `page.view` gives `[0, 0, 612, 792]` — standard US Letter

---

## Decision 2: Extraction Strategy

**Decision**: Hybrid approach — font discrimination (primary) + position-based region mapping (secondary)

**Rationale**:
- Font filtering instantly isolates ~30 data values from 467 total text items on page 1
- Position mapping then determines exactly which K-1 field each value belongs to
- Two-phase filtering is more robust than either approach alone
- Resilient to minor position variations across different K-1 generators

**Alternatives considered**:
- **Regex label matching** (current approach): Fundamentally broken — pdf-parse outputs all template labels first, then all data values separately. Labels and values are never adjacent in the text stream.
- **Sequential positional parsing** (text order): Fragile — depends on exact text ordering which varies between generators. Also can't distinguish data values from template text.
- **Pure position-based** (no font check): Would work but requires matching against all 73 regions for all 467 items. Font filtering first reduces the problem to ~30 items × 73 regions.

### Font Discrimination Details

From the sample K-1 PDF, text items use these fonts:

| fontName | fontFamily | Usage | Count |
|----------|-----------|-------|-------|
| g_d0_f1 | serif | Template labels, headers | ~350 items |
| g_d0_f2 | sans-serif | "20" in tax year | 1 item |
| g_d0_f3 | sans-serif | "25" in tax year (data) | 1 item |
| g_d0_f5 | serif | Footnotes, small text | ~80 items |
| g_d0_f6 | sans-serif | Data values | ~10 items |
| g_d0_f7 | monospace | Checkboxes/codes | ~5 items |
| g_d0_f8 | sans-serif | Data values (primary) | ~20 items |

**Key insight**: Template labels exclusively use `serif` fonts. Data values exclusively use `sans-serif` or `monospace` fonts. Filtering by `fontFamily !== 'serif'` isolates all data values.

**Dynamic detection**: Since font names vary across generators, the algorithm should:
1. Get all unique fonts from `textContent.styles`
2. Identify template fonts: the fonts used by known template text items (items matching "Schedule K-1", "Form 1065", "Ordinary business income", etc.)
3. Non-template fonts = data fonts
4. Filter items to only those using data fonts

---

## Decision 3: Position Region Map

**Decision**: Define 73 bounding box regions covering all K-1 form fields with ±15 pt tolerance

**Rationale**:
- K-1 form layout is standardized by the IRS — position regions are consistent across generators
- 22 positions verified from actual PDF extraction with exact coordinates
- Remaining ~51 positions interpolated from verified anchors and standard IRS form spacing
- ±15 pt tolerance handles minor variations between generators

### Verified Anchor Points (from actual K-1 PDF)

| Value | x | y | Field |
|-------|-----|-------|-------|
| "X" | 324.3 | 746.2 | FINAL_K1 |
| "X" | 180.3 | 446.6 | G_LIMITED |
| "X" | 58.0 | 422.9 | H1_DOMESTIC |
| "3.032900" | 139.1 | 339.1 | J_PROFIT_BEGIN |
| "0.000000" | 250.1 | 339.1 | J_PROFIT_END |
| "498,211" | 180.8 | 254.5 | K_NONRECOURSE_BEGIN |
| "X" | 294.9 | 205.8 | K2_CHECKBOX |
| "4,903,568" | 257.8 | 157.4 | L_BEG_CAPITAL |
| "(409,811)" | 259.3 | 133.7 | L_CURR_YR_INCOME |
| "4,493,757" | 257.8 | 109.4 | L_WITHDRAWALS |
| "X" | 101.2 | 74.2 | M_NO |
| "(5,373)" | 271.5 | 49.7 | N_BEGINNING |
| "(409,811)" | 92.1 | 2.8 | N_ENDING |
| "ZZ*" | 314.2 | 314.4 | BOX_11_CODE |
| "(409,615)" | 403.9 | 314.4 | BOX_11_VALUE |
| "X" | 563.3 | 603.8 | BOX_16_K3 |
| "A" | 455.2 | 423.2 | BOX_19_CODE |
| "4,493,757" | 530.6 | 422.0 | BOX_19_VALUE |
| "*" | 456.4 | 267.1 | BOX_21_CODE |
| "196" | 555.6 | 266.1 | BOX_21_VALUE |

### Region Layout Summary

| Group | X range | Y range | Fields |
|-------|---------|---------|--------|
| Header | 120–450 | 731–785 | 5: TAX_YEAR, TAX_YEAR_BEGIN/END, FINAL_K1, AMENDED_K1 |
| Part I | 30–290 | 610–735 | 4: A_EIN, B_NAME, B_ADDR, C_IRS_CENTER |
| Part II | 30–306 | 350–610 | 12: D through I2 |
| Section J | 120–305 | 285–354 | 7: profit/loss/capital begin/end + decrease sale |
| Section K | 155–310 | 176–270 | 8: nonrecourse/qual/recourse begin/end + K2/K3 checkboxes |
| Section L | 220–306 | 83–173 | 6: beg/contributed/income/other/withdrawals/end |
| Section M | 50–120 | 59–89 | 2: M_YES, M_NO |
| Section N | 60–306 | 0–65 | 2: N_BEGINNING, N_ENDING |
| Part III Left | 300–455 | 245–698 | 19: boxes 1–13 (including a/b/c sub-boxes) |
| Part III Right | 440–595 | 245–710 | 8: boxes 14–21 |

### Subtype Handling

Boxes 11, 12, 13 (left column) and 14, 15, 17, 19, 20, 21 (right column) can have subtype codes:

- **Left column**: code at x ≈ 300–350, value at x ≈ 370–455
- **Right column**: code at x ≈ 440–475, value at x ≈ 510–595

Pairing algorithm: find code and value items on the same y-line (within ±8 pts).

Box 20 supports multiple subtype rows (A, B, V/Z, *) spaced ~23 pts apart within y range 275–395.

---

## Decision 4: Numeric Value Parsing

**Decision**: Parse all K-1 values using consistent rules

**Rationale**: IRS K-1 forms use standard US financial formatting. No ambiguity in the parsing rules.

**Rules**:
1. Remove commas: "4,903,568" → "4903568"
2. Parenthesized = negative: "(409,811)" → "-409811" → -409811
3. Leading minus = negative: "-5,373" → -5373
4. Dollar sign: strip "$" if present
5. Decimal percentages: "3.032900" → 3.032900 (preserve precision, do not round)
6. "SEE STMT" / "STMT" → `numericValue: null`, `rawValue: "SEE STMT"`
7. "X" (checkbox) → boolean true, `rawValue: "X"`
8. Empty / whitespace → omit field or `numericValue: 0`
9. "E-FILE" and other text values → `numericValue: null`, preserve as rawValue

---

## Decision 5: Interface Expansion

**Decision**: Add `subtype`, `fieldCategory`, and `isCheckbox` to `K1ExtractedField`; add position info to `K1UnmappedItem`

**Rationale**: The existing interface lacks fields needed for subtype codes (box 11 "ZZ*", box 20 "A"/"B"), field categorization (Part III vs Section J vs metadata), and checkbox discrimination. Adding these fields is backward-compatible (all optional/nullable).

**New fields on K1ExtractedField**:
- `subtype: string | null` — subtype code (e.g., "ZZ*", "A", "B", "*")
- `fieldCategory: 'PART_III' | 'METADATA' | 'SECTION_J' | 'SECTION_K' | 'SECTION_L' | 'SECTION_M' | 'SECTION_N' | 'CHECKBOX'`
- `isCheckbox: boolean` — whether this field is a boolean checkbox value

**New fields on K1UnmappedItem**:
- `x: number` — x position in PDF points
- `y: number` — y position in PDF points
- `fontName: string` — font identifier for debugging

---

## Open Items

None. All NEEDS CLARIFICATION items resolved.
