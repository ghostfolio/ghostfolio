# Feature Specification: Automated K-1 PDF Scanning & Model Object Creation

**Feature Branch**: `004-k1-scan-import`
**Created**: 2026-03-18
**Status**: Draft
**Input**: User description: "Automated K-1 PDF scanning and model object creation with cell mapping verification. User sets up Entities and Partnerships manually, then scans a K-1 PDF document and the system auto-creates model objects (KDocument, Distributions, etc.) based on K-1 cell mapping. V1 includes manual verification of mapped values with cell name override capability."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Upload & Scan K-1 PDF (Priority: P1)

A family office administrator has already set up their Entities and Partnerships in the system. They receive a K-1 PDF (Schedule K-1, Form 1065) from a fund administrator. They navigate to the partnership's K-1 section, upload the PDF, and the system extracts structured data from the document using OCR/document intelligence. The extracted values are mapped to the standard K-1 box numbers (Box 1 through Box 19) and presented to the administrator for review before saving.

**Why this priority**: This is the core value proposition — eliminating manual K-1 data entry. Without PDF scanning and extraction, the administrator must type every value by hand, which is the exact pain point this feature solves.

**Independent Test**: Can be fully tested by uploading a sample K-1 PDF for an existing partnership, verifying that extracted values appear in a review screen mapped to the correct box numbers, and confirming the extraction completes without errors.

**Acceptance Scenarios**:

1. **Given** an existing partnership with at least one member entity, **When** the administrator uploads a K-1 PDF file, **Then** the system processes the document and displays extracted values mapped to K-1 box numbers within 30 seconds.
2. **Given** a K-1 PDF in standard IRS format, **When** the system extracts data, **Then** the partner name, partnership name, EIN, tax year, and all populated box values (Box 1 through Box 19) are identified and displayed.
3. **Given** a scanned (image-based) K-1 PDF rather than a digitally-generated one, **When** the administrator uploads it, **Then** the system applies OCR and extracts values with the same box mapping.
4. **Given** a K-1 PDF where certain boxes are empty or contain zero, **When** the system extracts data, **Then** those boxes are displayed as zero/empty rather than showing incorrect values from adjacent cells.
5. **Given** a multi-page K-1 PDF (Form 1065 with supplemental schedules), **When** uploaded, **Then** the system extracts data from all relevant pages and consolidates into a single review view.

---

### User Story 2 - Review & Verify Extracted Values (Priority: P1)

After the K-1 PDF is scanned, the administrator sees a verification screen showing every extracted value alongside its mapped K-1 box/cell. Each row displays: the cell label (e.g., "Box 1 - Ordinary business income"), the extracted value, and a confidence indicator. The administrator can accept each value, edit it if the extraction was incorrect, or override the cell name/label if the mapping is wrong. The administrator must explicitly confirm before the data is saved to the system.

**Why this priority**: OCR is inherently imperfect. Without a verification step, incorrect values would silently corrupt K-1 records and tax data. This is the safety net that makes the feature trustworthy for V1.

**Independent Test**: Can be fully tested by scanning a K-1 PDF, modifying an extracted value and a cell label on the verification screen, confirming, and verifying the saved KDocument record reflects the corrections.

**Acceptance Scenarios**:

1. **Given** a scanned K-1 with extracted values, **When** the verification screen loads, **Then** each extracted value shows the box number, label, extracted amount, and a confidence score (high/medium/low).
2. **Given** the verification screen, **When** the administrator edits an extracted value (e.g., changes Box 1 from $50,000 to $52,000), **Then** the corrected value is reflected immediately and will be used when saving.
3. **Given** the verification screen, **When** the administrator overrides a cell name (e.g., renames "Box 11 - Other income" to "Box 11 - Section 1256 contracts"), **Then** the custom label is saved alongside the value.
4. **Given** a low-confidence extraction for a specific box, **When** the verification screen displays it, **Then** the field is visually highlighted to draw the administrator's attention for manual review.
5. **Given** all values have been reviewed on the verification screen, **When** the administrator clicks "Confirm & Save", **Then** the system creates a KDocument record with all verified values and links it to the partnership and tax year.
6. **Given** the verification screen, **When** the administrator clicks "Cancel" or navigates away, **Then** no data is saved and the uploaded PDF is discarded (or retained as an unprocessed document).

---

### User Story 3 - Auto-Create Model Objects from Verified K-1 Data (Priority: P1)

After the administrator confirms the verified K-1 data, the system automatically creates and updates the downstream model objects. Specifically: a KDocument is created with the structured box data and linked to the partnership and tax year; the K-1 amounts are allocated to each partnership member based on their ownership percentages; and Distribution records are created for Box 19 (distributions) entries. The uploaded PDF is saved as a Document record and linked to the KDocument.

**Why this priority**: This is the automation payoff — the reason for scanning in the first place. Without auto-creation of downstream objects, the user would still need to manually create KDocuments and allocate amounts, negating the benefit of scanning.

**Independent Test**: Can be fully tested by confirming verified K-1 data for a partnership with 2 members (60%/40% split), then verifying that a KDocument exists with correct box values, member allocations are computed correctly, Distribution records were created for Box 19, and the PDF Document is linked.

**Acceptance Scenarios**:

1. **Given** confirmed K-1 data for a partnership with two members (60%/40%), **When** the system processes the confirmation, **Then** a KDocument record is created with type K1, the correct tax year, filing status DRAFT, and all box values stored in the structured data field.
2. **Given** confirmed K-1 data with Box 19a (cash distributions) of $100,000, **When** the system creates downstream objects, **Then** Distribution records are created for each member: $60,000 for the 60% member and $40,000 for the 40% member, both with type RETURN_OF_CAPITAL and the appropriate date.
3. **Given** confirmed K-1 data, **When** the system allocates amounts, **Then** each member's allocated K-1 values (ordinary income, capital gains, deductions, etc.) match their ownership percentage of the partnership-level amounts.
4. **Given** the uploaded PDF file, **When** the KDocument is created, **Then** a Document record is created with type K1, the PDF file is stored, and the Document is linked to the KDocument via `documentFileId`.
5. **Given** a partnership that already has a KDocument for the same tax year and type (K1), **When** the administrator scans a new K-1 PDF for that same year, **Then** the system prompts whether to update the existing record or create a new version, and the existing record's status history is preserved.

---

### User Story 4 - Cell Mapping Configuration (Priority: P2)

The administrator can view and customize the K-1 cell mapping configuration that the system uses to extract and label values. The default mapping follows the standard IRS Schedule K-1 (Form 1065) layout, but the administrator can add custom cell labels, rename existing cells, or define custom extraction regions for non-standard K-1 formats. The configuration is saved per partnership or globally and reused for future K-1 imports for that partnership.

**Why this priority**: While the default IRS mapping covers most K-1s, some fund administrators use supplemental schedules or non-standard formats. Custom mapping ensures the system works across the administrator's full portfolio of partnerships. This is P2 because the default mapping handles the majority case.

**Independent Test**: Can be fully tested by modifying the cell mapping for a specific partnership (e.g., adding a custom "Box 20 - Section 199A" field), scanning a K-1 PDF, and verifying the custom field appears in the verification screen with extracted data.

**Acceptance Scenarios**:

1. **Given** the cell mapping configuration screen, **When** the administrator views it, **Then** all standard K-1 boxes (1-19) are listed with their IRS-defined labels and box numbers.
2. **Given** the cell mapping configuration, **When** the administrator adds a custom cell (e.g., "Box 20 - Qualified Business Income"), **Then** the custom cell is saved and included in future extraction results for that partnership.
3. **Given** a partnership with a custom cell mapping, **When** a K-1 PDF is scanned for that partnership, **Then** the extraction uses the custom mapping configuration instead of the global default.
4. **Given** a modified cell label (e.g., Box 11 renamed to "Section 1256 Contracts"), **When** the extraction runs, **Then** the renamed label is displayed on the verification screen alongside the extracted value.
5. **Given** the administrator wants to reset to defaults, **When** they select "Reset to IRS Default Mapping", **Then** all custom labels and additional cells are removed and the standard mapping is restored.

---

### User Story 5 - K-1 Import History & Re-Processing (Priority: P3)

The administrator can view a history of all K-1 imports for a partnership, including the date of import, the uploaded PDF, the extraction results, and whether the data was accepted or rejected. They can re-process a previously uploaded PDF (e.g., after updating the cell mapping) or re-upload a corrected PDF. The system maintains an audit trail of changes between estimated and final K-1 data.

**Why this priority**: Import history and re-processing are important for tax season workflows (estimated → final K-1 transitions) but depend on the core scan/verify/create pipeline being complete first.

**Independent Test**: Can be fully tested by scanning two K-1 PDFs for the same partnership/year (one estimated, one final), verifying both appear in the import history, and confirming the KDocument status transitions from ESTIMATED to FINAL with the updated values.

**Acceptance Scenarios**:

1. **Given** a partnership with multiple K-1 imports over time, **When** the administrator views the import history, **Then** each import is listed with date, filename, tax year, status (accepted/rejected), and current KDocument status (draft/estimated/final).
2. **Given** a previously imported K-1 PDF, **When** the administrator selects "Re-process", **Then** the system re-runs extraction using the current cell mapping configuration and shows the verification screen with updated results.
3. **Given** an existing KDocument with status ESTIMATED, **When** the administrator scans the final K-1 PDF and confirms, **Then** the KDocument status updates to FINAL and the values are updated, with the previous estimated values preserved in the change history.
4. **Given** a rejected import, **When** the administrator views it in history, **Then** they can see why it was rejected and can re-upload a corrected PDF to try again.

---

### Edge Cases

- What happens when the uploaded file is not a valid PDF? The system must reject the file with a clear error message before attempting extraction.
- What happens when the K-1 PDF is password-protected? The system must detect this and prompt the user to provide the password or upload an unprotected version.
- What happens when the OCR extraction returns zero values for all boxes? The system must warn the user that extraction may have failed and recommend checking if the PDF is readable.
- What happens when the extracted partner name or EIN does not match any existing entity in the system? The system must flag the mismatch on the verification screen and allow the user to manually select the correct entity/partnership.
- What happens when multiple K-1s are received for different members of the same partnership in a single multi-page PDF? The system must detect multiple K-1 forms within one document and process each separately.
- What happens when the extracted tax year does not match the expected year? The system must highlight the discrepancy and allow the user to confirm or override the tax year.
- What happens when ownership percentages have changed during the tax year? The system must use the ownership percentage as of the K-1's tax year end date for allocation calculations.
- What happens when the upload exceeds the maximum file size (e.g., large scanned documents)? The system must enforce a file size limit and provide a clear error message.

## Requirements _(mandatory)_

### Functional Requirements

**K-1 PDF Upload & Processing**

- **FR-001**: System MUST accept PDF file uploads (both digitally-generated and scanned/image-based) for K-1 document processing.
- **FR-002**: System MUST extract structured data from K-1 PDFs using document intelligence/OCR, identifying standard IRS Schedule K-1 (Form 1065) fields: partner information, partnership information, tax year, and box values (Box 1 through Box 19).
- **FR-003**: System MUST validate that uploaded files are valid PDFs before processing and reject non-PDF files with a clear error message.
- **FR-004**: System MUST handle both single-page and multi-page K-1 PDFs, including supplemental schedules.
- **FR-005**: System MUST complete extraction and present results within 30 seconds for a standard K-1 PDF.

**Verification & Manual Review**

- **FR-006**: System MUST display a verification screen after extraction showing each extracted value with its mapped K-1 box number, label, value, and confidence level (high/medium/low).
- **FR-007**: System MUST allow the administrator to edit any extracted value before confirmation.
- **FR-008**: System MUST allow the administrator to override/rename any cell label on the verification screen.
- **FR-009**: System MUST visually highlight low-confidence extractions to draw attention for manual review.
- **FR-010**: System MUST require explicit confirmation ("Confirm & Save") before creating any model objects from extracted data.
- **FR-011**: System MUST allow the administrator to cancel/discard the extraction without saving any data.

**Automatic Model Object Creation**

- **FR-012**: Upon confirmation, system MUST create a KDocument record with the verified box values, linked to the correct partnership and tax year, with filing status DRAFT.
- **FR-013**: Upon confirmation, system MUST allocate K-1 line item amounts to each partnership member based on their active ownership percentage as of the tax year end date.
- **FR-014**: Upon confirmation, system MUST create Distribution records for Box 19a (cash distributions) and Box 19b (property distributions) amounts, allocated proportionally to each member.
- **FR-015**: Upon confirmation, system MUST create a Document record for the uploaded PDF with type K1 and link it to the KDocument via `documentFileId`.
- **FR-016**: When a KDocument already exists for the same partnership, type, and tax year, system MUST prompt whether to update the existing record or reject the import, preserving the previous data for audit purposes.

**Cell Mapping Configuration**

- **FR-017**: System MUST provide a default cell mapping based on the standard IRS Schedule K-1 (Form 1065) box layout (Box 1 through Box 19 with IRS-defined labels).
- **FR-018**: System MUST allow the administrator to add custom cells beyond the standard K-1 boxes (e.g., Box 20 for QBI, state-specific items).
- **FR-019**: System MUST allow the administrator to rename/relabel any cell in the mapping.
- **FR-020**: System MUST support saving cell mapping configurations per partnership for reuse across tax years.
- **FR-021**: System MUST allow resetting a partnership's cell mapping to the IRS default.

**Import History & Audit**

- **FR-022**: System MUST maintain a history of all K-1 import attempts per partnership, including upload date, filename, tax year, and outcome (accepted/cancelled).
- **FR-023**: System MUST support re-processing a previously uploaded K-1 PDF with the current cell mapping configuration.
- **FR-024**: System MUST support KDocument status transitions (DRAFT → ESTIMATED → FINAL) when re-importing updated K-1s for the same partnership and tax year.
- **FR-025**: System MUST preserve previous K-1 values when updating from estimated to final, maintaining an audit trail.

**Validation & Error Handling**

- **FR-026**: System MUST validate that the extracted or user-selected partnership exists in the system before creating model objects.
- **FR-027**: System MUST validate that the partnership has active members before attempting allocation.
- **FR-028**: System MUST enforce a maximum file size limit for uploaded PDFs and communicate the limit clearly.
- **FR-029**: System MUST detect password-protected PDFs and prompt the user to provide an unprotected version.

### Key Entities

- **K1ImportSession**: A record of a single K-1 PDF import attempt. Tracks the uploaded file, extraction status (processing/extracted/verified/confirmed/cancelled), raw extraction results, verified results after user edits, and the resulting KDocument if confirmed. Linked to a Partnership and a User. Enables import history and re-processing.
- **CellMapping**: A configuration defining how K-1 box numbers map to labels and extraction regions. Has a default IRS-standard set and supports per-partnership customization. Key attributes: box number, label, description, custom flag, partnership (optional — null means global default).
- **KDocument** (existing from 001-family-office-transform): Extended to be auto-created from verified scan data rather than only manual entry. The structured `data` JSON field stores the K1Data interface values.
- **Distribution** (existing from 001-family-office-transform): Auto-created from Box 19 data during K-1 import confirmation, allocated to members by ownership percentage.
- **Document** (existing from 001-family-office-transform): Created automatically for the uploaded K-1 PDF and linked to the KDocument.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Administrator can upload a K-1 PDF and see extracted values on the verification screen within 30 seconds of upload.
- **SC-002**: For a digitally-generated (non-scanned) K-1 PDF in standard IRS format, the system correctly extracts at least 90% of populated box values without manual correction.
- **SC-003**: For a scanned (image-based) K-1 PDF, the system correctly extracts at least 75% of populated box values without manual correction.
- **SC-004**: Administrator can review, edit, and confirm all extracted values in under 5 minutes for a standard K-1 with 10-15 populated boxes.
- **SC-005**: After confirmation, all downstream model objects (KDocument, Document, Distributions, member allocations) are created within 5 seconds.
- **SC-006**: Member allocation amounts are accurate to the cent — matching each member's ownership percentage multiplied by the partnership-level K-1 values.
- **SC-007**: The complete K-1 import workflow (upload → extract → verify → confirm) saves at least 70% of the time compared to manual data entry for the same K-1 data.
- **SC-008**: Re-processing a previously uploaded K-1 PDF produces results within 30 seconds and shows the updated extraction on the verification screen.
- **SC-009**: Cell mapping customizations persist across sessions and are correctly applied to subsequent K-1 imports for the same partnership.
- **SC-010**: Import history accurately reflects all import attempts, with correct status and links to resulting KDocuments.

## Assumptions

- Entities and Partnerships are already created in the system before K-1 import is attempted. This feature does not create entities or partnerships — only KDocuments, Distributions, Documents, and member allocations.
- The existing KDocument, Distribution, Document, and PartnershipMembership models from spec 001-family-office-transform are implemented and available.
- K-1 PDFs follow one of two formats: digitally-generated (text-based PDF with selectable text) or scanned (image-based PDF requiring OCR). Both must be supported.
- The standard IRS Schedule K-1 (Form 1065) layout is the baseline. K-1s from Form 1041 (trusts/estates) and Form 1120-S (S-corps) are out of scope for V1.
- Document intelligence/OCR processing is handled by a third-party service or library. The specific provider is an implementation detail.
- File storage for uploaded PDFs uses the existing Document storage mechanism from spec 001.
- Confidence scores for extractions are derived from the OCR/document intelligence provider's confidence metrics.
- The administrator has a single active browser session; concurrent K-1 imports for the same partnership are not a V1 requirement.
- Exchange rate handling for K-1 amounts follows the existing currency conversion approach — K-1 values are always in USD as they are IRS tax documents.
