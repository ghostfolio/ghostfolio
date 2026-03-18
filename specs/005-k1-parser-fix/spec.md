# Feature Specification: Fix K-1 PDF Parser — Position-Based Extraction

**Feature Branch**: `005-k1-parser-fix`
**Created**: 2025-07-21
**Status**: Draft
**Input**: User description: "Fix K-1 PDF parser to correctly extract positional values from IRS Schedule K-1 (Form 1065) PDFs. The current regex-based parser matches cell numbers as values instead of actual data. Rewrite using position-based extraction with pdfjs-dist to reliably map form field values by their (x, y) coordinates and font discrimination. Support all Part I/II metadata fields, Part III income/deduction boxes (1-21), subtype codes, checkboxes, percentages, and 'SEE STMT' references. Allow users to manually map any ambiguous or unrecognized fields."

## Background

E-filed IRS Schedule K-1 (Form 1065) PDFs have a specific structure: form template text (labels, headings, instructions) and data values are rendered as separate text overlays on the same page. When extracted as plain text, all template text appears first, followed by all data values in a flat positional list — without any labels attached to the values. The current regex-based parser attempts to match labels to adjacent values, which fundamentally fails because labels and values are in completely different sections of the extracted text.

### PDF Structure Discovery

Analysis of a real e-filed K-1 PDF reveals:

- **467 total text items** on page 1
- **Zero AcroForm fields** — values are positioned text overlays, not fillable form fields
- **Font discrimination**: All data values use a distinct font (e.g., `g_d0_f8`) that differs from template text fonts
- **Position coordinates**: Each text item has precise (x, y) coordinates via the PDF transformation matrix
- **K-1 form layout**: Three distinct regions — Part I/II (left column, partnership/partner info), Part III left column (boxes 1-13), Part III right column (boxes 14-21)
- **Subtype codes**: Some boxes (11, 19, 20, 21) have letter/symbol codes as separate text items in the same y-band as their values
- **Checkboxes**: Represented as "X" text items at checkbox positions

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Accurate K-1 Value Extraction (Priority: P1)

As an investor uploading an e-filed K-1 PDF, I want the system to correctly extract all Part III box values (boxes 1-21) so that my income, deductions, and credits are accurately captured without manual correction.

**Why this priority**: This is the core value proposition. If Part III box values are wrong, the entire K-1 import feature is unusable. Every K-1 has Part III data, and getting it right eliminates the most painful manual data entry.

**Independent Test**: Upload a sample e-filed K-1 PDF and verify that all Part III boxes with values are correctly extracted with the right box number, value, and sign (parenthesized values as negative).

**Acceptance Scenarios**:

1. **Given** an e-filed K-1 PDF with box 1 value "498,211", **When** the PDF is uploaded and parsed, **Then** box 1 is extracted with `rawValue: "498,211"` and `numericValue: 498211`
2. **Given** an e-filed K-1 PDF with box 11 having subtype "ZZ*" and value "(409,615)", **When** parsed, **Then** box 11 is extracted with `boxNumber: "11"`, `subtype: "ZZ*"`, `rawValue: "(409,615)"`, and `numericValue: -409615`
3. **Given** an e-filed K-1 PDF with box 19 subtype "A" and value "4,493,757", **When** parsed, **Then** box 19 is extracted with `boxNumber: "19"`, `subtype: "A"`, `rawValue: "4,493,757"`, and `numericValue: 4493757`
4. **Given** an e-filed K-1 PDF with box 20 subtypes A, B, Z, and * all showing "SEE STMT", **When** parsed, **Then** four separate fields are extracted for box 20, each with the correct subtype code and `rawValue: "SEE STMT"`, `numericValue: null`
5. **Given** an e-filed K-1 PDF with box 21 having subtype "*" and value "196", **When** parsed, **Then** box 21 is extracted with `boxNumber: "21"`, `subtype: "*"`, `rawValue: "196"`, and `numericValue: 196`
6. **Given** a value in parentheses like "(409,811)", **When** parsed, **Then** the numericValue is `-409811` (negative)
7. **Given** an empty box (no value present), **When** parsed, **Then** the box is either omitted from results or included with `numericValue: 0`

---

### User Story 2 — Partnership & Partner Metadata Extraction (Priority: P1)

As an investor, I want the system to extract Part I (partnership info) and Part II (partner info) metadata — including names, EINs, addresses, tax year, and filing status — so I can match K-1 documents to the correct partnership and tax period.

**Why this priority**: Metadata is essential for identifying which partnership and partner the K-1 belongs to, and for the tax year assignment. Without this, K-1 data cannot be properly filed.

**Independent Test**: Upload a K-1 PDF and verify that partnership name, EIN, partner name, EIN, tax year, and final/amended status are correctly extracted.

**Acceptance Scenarios**:

1. **Given** an e-filed K-1 that is marked "Final K-1", **When** parsed, **Then** `metadata.isFinal` is `true`
2. **Given** an e-filed K-1 for tax year 2025, **When** parsed, **Then** `metadata.taxYear` is `2025`
3. **Given** a K-1 with IRS Center field showing "E-FILE", **When** parsed, **Then** the IRS center metadata field is captured as "E-FILE"

---

### User Story 3 — Part I/II Financial Fields Extraction (Priority: P2)

As an investor, I want the system to extract Part I/II financial fields — Section J (profit/loss/capital percentages), Section K (liabilities), Section L (capital account analysis), Section M (contributed property), and Section N (partner share of net income) — so that my partnership interest details are fully captured.

**Why this priority**: These fields provide the partnership interest context (ownership percentages, capital account, liabilities) needed for tax reporting. They are secondary to Part III income boxes but still required for a complete K-1 record.

**Independent Test**: Upload a K-1 PDF and verify J/K/L/M/N sections are extracted with correct begin/end values and signs.

**Acceptance Scenarios**:

1. **Given** a K-1 with Section J showing profit beginning "3.032900" and ending "0.000000", **When** parsed, **Then** fields are extracted: J_PROFIT_BEGIN = 3.032900, J_PROFIT_END = 0.000000
2. **Given** a K-1 with Section J loss and capital rows identical to profit, **When** parsed, **Then** J_LOSS_BEGIN, J_LOSS_END, J_CAPITAL_BEGIN, J_CAPITAL_END are all correctly extracted
3. **Given** a K-1 with Section K showing nonrecourse beginning "498,211", **When** parsed, **Then** K_NONRECOURSE_BEGIN = 498211
4. **Given** a K-1 with Section L showing beginning capital "4,903,568", withdrawals "4,493,757", and current year net income/loss "(409,811)", **When** parsed, **Then** L_BEG_CAP = 4903568, L_WITHD_DIST = 4493757, L_CURR_YR_INCOME = -409811
5. **Given** a K-1 with Section M checkbox "No" marked, **When** parsed, **Then** M_CONTRIBUTED_PROPERTY = false (or "NO")
6. **Given** a K-1 with Section N showing beginning "(5,373)" and ending "(409,811)", **When** parsed, **Then** N_BEG = -5373, N_END = -409811

---

### User Story 4 — Checkbox and Boolean Field Extraction (Priority: P2)

As an investor, I want checkbox fields (Final K-1, Amended K-1, General/Limited partner, Domestic/Foreign partner, K-2/K-3 attached indicators) to be correctly identified as boolean values so they accurately reflect my filing status.

**Why this priority**: Checkboxes determine filing status and partner classification. Misidentifying them can lead to incorrect tax treatment. They are simpler to extract (just "X" at a position) but critical to get right.

**Independent Test**: Upload a K-1 PDF with known checkbox states and verify all checkboxes are correctly identified as checked or unchecked.

**Acceptance Scenarios**:

1. **Given** a K-1 with "Final K-1" checked and "Amended K-1" unchecked, **When** parsed, **Then** `isFinal: true`, `isAmended: false`
2. **Given** a K-1 with "Limited partner" checked, **When** parsed, **Then** the partner type field reflects "Limited"
3. **Given** a K-1 with "Domestic partner" checked, **When** parsed, **Then** the partner domestic/foreign field reflects "Domestic"
4. **Given** a K-1 with box 16 "K-3 attached" checked, **When** parsed, **Then** box 16 reflects `true`

---

### User Story 5 — Manual Mapping Fallback for Ambiguous Fields (Priority: P3)

As an investor, when the parser cannot confidently map a value to a specific K-1 field (due to unexpected positioning, font, or layout variation), I want to see those values listed as "unmapped" so I can manually assign them to the correct fields through the review interface.

**Why this priority**: No parser is perfect. Different K-1 generators may produce slightly different layouts. Providing a manual mapping fallback ensures data is never lost and users always have control, even when automatic extraction is imperfect.

**Independent Test**: Upload a K-1 PDF where some values fall outside expected position regions, and verify those values appear in the unmapped items list for manual assignment.

**Acceptance Scenarios**:

1. **Given** a K-1 PDF where a value appears at an unexpected position, **When** parsed, **Then** that value appears in the `unmappedItems` list with its raw text, position, and page number
2. **Given** an unmapped item in the review interface, **When** the user assigns it to box "4", **Then** it moves to the extracted fields list as box 4 with the assigned value
3. **Given** an unmapped item, **When** the user marks it as "discarded", **Then** it is excluded from the final import

---

### Edge Cases

- **Multi-page K-1**: Some K-1s span multiple pages. The parser should handle page 1 (the standard K-1 form) and recognize that subsequent pages are supplemental statements, not additional K-1 data to parse.
- **All-empty K-1**: A K-1 with zero data values (all boxes empty) should produce an extraction result with no fields and no errors.
- **Negative values**: Parenthesized values like "(40,029)" must be parsed as negative numbers (-40029). Plain minus signs (e.g., "-5,373") should also be handled.
- **"SEE STMT" references**: Some boxes contain "SEE STMT" (See Statement) instead of a numeric value. These should be captured as-is with `numericValue: null`.
- **Tab-separated subtype/value pairs**: Values like "ZZ*\t(409,615)" or "A\t4,493,757" contain a subtype code tab-separated from the value. Both parts must be captured.
- **Multiple subtypes per box**: Box 20 can have multiple rows (A, B, Z, *), each with its own value. All must be extracted as separate fields.
- **Non-standard fonts**: Different K-1 generators may use different font names. The parser should identify data fonts dynamically rather than hardcoding a specific font name.
- **Corrupted or non-K-1 PDFs**: If a PDF has no recognizable K-1 structure (no matching template text), extraction should fail gracefully with a meaningful error message, not crash.
- **Percentage values**: Section J values are decimal percentages (e.g., "3.032900"). These should be preserved as-is without rounding.

## Requirements _(mandatory)_

### Functional Requirements

#### Core Extraction

- **FR-001**: System MUST extract all Part III box values (boxes 1 through 21) from e-filed K-1 PDFs using position-based text extraction rather than regex label matching
- **FR-002**: System MUST extract each text item's position coordinates (x, y) and font information from the PDF to determine which form field a value belongs to
- **FR-003**: System MUST discriminate between template text (labels/headings) and data values using font characteristics as the primary differentiator, with position and content pattern as secondary signals
- **FR-004**: System MUST define position regions (bounding boxes) for each K-1 form field and map extracted data values to the correct field based on which region their coordinates fall within
- **FR-005**: System MUST parse parenthesized values as negative numbers: "(409,811)" → -409811
- **FR-006**: System MUST handle comma-separated thousands in numeric values: "4,903,568" → 4903568
- **FR-007**: System MUST preserve "SEE STMT" values as raw text with a null numeric value and not attempt numeric parsing

#### Subtype and Multi-Value Fields

- **FR-008**: System MUST extract subtype codes for boxes that support them (boxes 11, 12, 13, 14, 19, 20, 21) where a letter or symbol code appears as a separate text item in the same vertical band as the value
- **FR-009**: System MUST support multiple subtype rows per box (e.g., box 20 with subtypes A, B, Z, and *)
- **FR-010**: System MUST capture tab-separated subtype/value pairs where the code and value appear on the same text line

#### Metadata and Part I/II

- **FR-011**: System MUST extract Part I/II metadata including: partnership name, partnership EIN, partner name, partner EIN, tax year, IRS center, and filing status (final/amended)
- **FR-012**: System MUST extract Section J percentage fields (profit, loss, capital — beginning and ending)
- **FR-013**: System MUST extract Section K liability fields (nonrecourse, qualified nonrecourse, recourse — beginning and ending as available)
- **FR-014**: System MUST extract Section L capital account fields (beginning capital, capital contributed, current year net income/loss, other increase/decrease, withdrawals/distributions, ending capital)
- **FR-015**: System MUST extract Section M (contributed property indicator) and Section N (partner share of net unrecognized 704(c) gain/loss — beginning and ending)

#### Checkbox Fields

- **FR-016**: System MUST identify checkbox fields marked with "X" at known checkbox positions (Final K-1, Amended K-1, General/Limited partner, Domestic/Foreign partner, K-2/K-3 attached)
- **FR-017**: System MUST represent checkbox values as boolean (true = "X" present at the checkbox position, false = absent)

#### Confidence and Unmapped Items

- **FR-018**: System MUST assign a confidence level (HIGH, MEDIUM, LOW) to each extracted field based on how precisely the value's position matches the expected region
- **FR-019**: System MUST place any extracted value that does not fall within a defined position region into the "unmapped items" list, capturing the raw text, position, and page number
- **FR-020**: System MUST allow users to manually assign unmapped items to specific box numbers through the existing review interface
- **FR-021**: System MUST allow users to discard unmapped items they determine are irrelevant

#### Robustness

- **FR-022**: System MUST handle K-1 PDFs from different e-filing generators that may use different font names by dynamically identifying which font is used for data values
- **FR-023**: System MUST gracefully handle PDFs that are not K-1 forms or have unrecognizable layouts, returning a meaningful error rather than crashing
- **FR-024**: System MUST process only page 1 of the K-1 PDF for standard form data extraction (supplemental statement pages are out of scope for this feature)
- **FR-025**: System MUST preserve the existing extraction interface contract so that upstream services (K1 import service, review UI) continue to work without changes

### Key Entities

- **K1ExtractedField**: A single parsed value from the K-1 form. Key attributes: box number, optional subtype code, raw text value, parsed numeric value, confidence level, field category (Part III box, Part I/II metadata, Section J/K/L/M/N), and whether it's a checkbox.
- **K1PositionRegion**: A defined bounding area on the K-1 form page corresponding to a specific field. Attributes: field identifier, x-min, x-max, y-min, y-max, expected value type (numeric, text, checkbox, percentage).
- **K1UnmappedItem**: A data value extracted from the PDF that couldn't be mapped to any defined position region. Attributes: raw text, x/y position, page number, user resolution (assigned/discarded/pending).
- **K1ExtractionResult**: The complete output of parsing a K-1 PDF. Contains metadata (partnership, partner, tax year, filing status), mapped fields array, unmapped items array, overall confidence, and extraction method identifier.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For a standard e-filed K-1 PDF, all Part III boxes with values are extracted with the correct box number and value in a single upload — no manual corrections needed for the reference test PDF
- **SC-002**: Numeric values including negative (parenthesized) amounts are parsed correctly with 100% accuracy for well-formed values
- **SC-003**: All subtype codes (e.g., box 11 "ZZ*", box 19 "A", box 20 "A"/"B"/"Z"/"*") are correctly paired with their values
- **SC-004**: Part I/II metadata (tax year, filing status, partner type) is extracted correctly
- **SC-005**: Section J percentages, Section K liabilities, Section L capital account, and Section N values are extracted with correct signs and decimal precision
- **SC-006**: Users can review and correct any extraction result through the existing review interface within 2 minutes
- **SC-007**: Values that cannot be automatically mapped appear in the unmapped items list, ensuring zero data loss during extraction
- **SC-008**: Non-K-1 PDFs produce a clear error message rather than incorrect/garbage data
- **SC-009**: Extraction completes within 5 seconds for a single-page K-1 PDF

## Assumptions

- All K-1 PDFs follow the standard IRS Schedule K-1 (Form 1065) layout for 2025 and adjacent tax years. Custom or non-standard K-1 formats are not in scope.
- E-filed K-1 PDFs render values as positioned text overlays (not AcroForm fields). The system does not need to support fillable PDF form field extraction.
- The existing review/confirmation UI and data flow (upload → extract → review → confirm) remains unchanged. Only the extraction logic is being rewritten.
- Font names vary across K-1 generators; the parser will dynamically identify the data font rather than hardcoding a specific font name.
- "SEE STMT" references indicate supplemental statement pages exist but parsing those supplemental pages is out of scope for this feature.
- PDF page coordinates use standard PDF coordinate system (origin at bottom-left, y increases upward).
- The position region map is calibrated for the standard IRS K-1 form layout; minor position adjustments may be needed over time as different generators are encountered.
