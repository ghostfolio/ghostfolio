# Research: K-1 PDF Scan Import

**Phase 0 Output** | **Date**: 2026-03-18

## Decision 1: PDF Text Extraction (Tier 1 — Digital PDFs)

**Decision**: Use `pdf-parse` npm package for digitally-generated K-1 PDFs.

**Rationale**: Digitally-generated PDFs from fund administrators contain embedded text. `pdf-parse` extracts this text losslessly, is free, fully self-hosted, and instant. It has 3M+ weekly npm downloads and a stable API. No external API calls needed.

**Alternatives Considered**:
- `pdfjs-dist` (Mozilla pdf.js) — lower-level, requires more boilerplate for text extraction; `pdf-parse` wraps this already.
- Cloud OCR for all PDFs — unnecessary cost and latency for digital PDFs where text extraction is 100% accurate.

---

## Decision 2: OCR for Scanned PDFs (Tier 2)

**Decision**: Use Azure AI Document Intelligence (Layout model) as primary Tier 2 provider, with `tesseract.js` as self-hosted fallback.

**Rationale**:
- Azure has the best tax-form pedigree among cloud providers (prebuilt IRS models for W-2, 1098, 1099)
- Returns per-field confidence scores (0.0–1.0) natively, directly fulfilling FR-006/FR-009
- 500 free pages/month covers typical family office volume (10–50 K-1s/year)
- `@azure/ai-form-recognizer` has full TypeScript types, aligns with NestJS patterns
- `tesseract.js` runs as WASM in Node.js (no system install), provides ~75% accuracy fallback

**Alternatives Considered**:
- Google Document AI — good form parsing but no tax-specific models, more expensive for custom processors ($30/1K pages)
- AWS Textract — strong table extraction but less established for tax forms, requires IAM setup
- Tesseract.js only — accuracy drops to 70–85% for clean scans, no layout understanding; acceptable as fallback but not primary

---

## Decision 3: Two-Tier Extraction Architecture

**Decision**: Implement a PDF type detection step that routes digital PDFs to local extraction (free, instant) and scanned PDFs to cloud OCR.

**Rationale**: Most K-1s from fund administrators are digitally generated. The two-tier approach avoids unnecessary API calls and costs for the majority case, while still supporting scanned documents.

**Detection heuristic**: Extract text via `pdf-parse`; if extracted text length < 100 characters or does not contain K-1 keywords ("Schedule K-1", "Form 1065", "Partner's Share"), route to Tier 2 OCR.

**Alternatives Considered**:
- Cloud OCR for everything — simpler but adds cost ($0.15/page) and latency (3–10s) for digital PDFs that don't need it
- Local OCR only (Tesseract.js) — insufficient accuracy (75%) for production tax data; too many manual corrections needed

---

## Decision 4: K-1 Box Extraction Strategy

**Decision**: Use regex-based box extraction for Tier 1 (digital text), and key-value pair extraction from the OCR provider for Tier 2. Both feed into a shared K-1 field mapper that applies the cell mapping configuration.

**Rationale**: The IRS Schedule K-1 (Form 1065) has a consistent, standardized layout:
- Page 1: Header + Part I (partnership info) + Part II (partner info) + Boxes 1–11
- Page 2: Boxes 12–20+ with code/sub-code details
- Box values sit in a numbered two-column grid: number label → description → value field
- Layout has been structurally stable for years, making template/regex extraction reliable

**Challenges addressed**:
- Multi-line sub-codes (Boxes 11, 13, 15, 16, 17, 18, 20) — handle by extracting code-letter/value pairs within each box section
- Supplemental schedules — out of scope for V1 auto-extraction; captured as additional Document attachments
- Multi-entity PDFs — detect via repeated "Schedule K-1" headers; split and process each K-1 separately

**Alternatives Considered**:
- Fixed coordinate-based extraction — too brittle across different PDF generators (varying margins, fonts)
- Machine learning model — overkill for V1 given the standardized form layout

---

## Decision 5: Confidence Scoring Approach

**Decision**: Three-level confidence display (High/Medium/Low) derived from extraction method and validation heuristics.

**Rationale**:

For **Tier 1** (digital text):
- Base confidence: 0.90 (text extraction is inherently reliable)
- +0.05 if box number regex matched cleanly
- +0.05 if value format validated (currency, percentage, integer)
- -0.10 to -0.30 for potential adjacent-box text contamination

For **Tier 2** (cloud OCR):
- Use Azure's native per-field confidence score directly
- Layer cross-field validation (e.g., Box 6b ≤ Box 6a, sub-boxes sum to parent)

**Display mapping**:
- High (≥ 0.85): Green — no user attention needed
- Medium (0.60–0.84): Yellow — optional review
- Low (< 0.60): Red — highlighted, requires manual review (FR-009)

**Alternatives Considered**:
- Binary confidence (confident/not) — too coarse; doesn't guide the user's review attention
- Numeric score display — too technical for a non-engineer user; three levels with color coding is more actionable

---

## Decision 6: New Database Models

**Decision**: Add two new Prisma models (`K1ImportSession`, `CellMapping`) to support import tracking and cell mapping configuration, alongside the existing K-document models from spec 001.

**Rationale**: 
- `K1ImportSession` tracks the full import lifecycle (upload → processing → extracted → verified → confirmed/cancelled), enabling import history (FR-022) and re-processing (FR-023)
- `CellMapping` stores per-partnership cell label customizations (FR-017 through FR-021) separate from the KDocument data itself

**Alternatives Considered**:
- Store import sessions as JSON metadata on KDocument — would conflate document data with import workflow state; makes import history harder to query
- Store cell mappings as JSON on Partnership — would work but loses the ability to query/manage mappings independently and doesn't support a global default set

---

## Decision 7: File Storage

**Decision**: Use the existing `uploads/` directory and `Document` model from spec 001. Uploaded K-1 PDFs are stored on the local filesystem, with metadata in the `Document` table.

**Rationale**: The existing upload infrastructure (UploadController with `FileInterceptor`, Document model, `uploads/` directory) is already in place. No need to add a new storage mechanism.

**Alternatives Considered**:
- S3/cloud storage — would require new infrastructure; the self-hosted philosophy favors local storage
- Database blob storage — increases database size and backup time for binary files

---

## Decision 8: New Environment Variables

**Decision**: Add two optional environment variables for Azure Document Intelligence, following the existing `ConfigurationService` pattern with `str({ default: '' })`.

```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT  — Azure resource endpoint URL
AZURE_DOCUMENT_INTELLIGENCE_KEY       — Azure API key
```

**Rationale**: When both are empty (default), the system falls back to `tesseract.js` for scanned PDFs. This makes Azure optional — the feature works fully self-hosted with degraded OCR accuracy.

**Alternatives Considered**:
- Separate feature flag — unnecessary; empty credentials are sufficient to indicate "not configured"
- Google/AWS credentials — Azure recommended as primary; could add additional providers later

---

## Decision 9: New npm Dependencies

**Decision**: Add the following packages:

| Package | Purpose | Tier |
|---|---|---|
| `pdf-parse` | Text extraction from digital PDFs | Tier 1 (required) |
| `@azure/ai-form-recognizer` | Cloud OCR for scanned PDFs | Tier 2 (optional) |
| `tesseract.js` | Self-hosted OCR fallback | Tier 2 fallback |

**Rationale**: `pdf-parse` is essential for the Tier 1 (free, local) path. Azure SDK is optional (only loaded when credentials are configured). `tesseract.js` provides a zero-config fallback that runs as WASM — no system dependencies needed, works in the existing `node:22-slim` Docker image.

**Alternatives Considered**:
- `pdfjs-dist` directly instead of `pdf-parse` — more boilerplate, `pdf-parse` wraps it with a simpler API
- Only cloud OCR — loses the self-hosted story and adds cost for digital PDFs

---

## Decision 10: Cell Aggregation Rules — Dynamic Computation

**Decision**: Persist only aggregation rule definitions (name, source cells, operation). Compute totals dynamically from raw K-1 box values at display time. Do NOT store computed totals.

**Rationale**:
- K-1 values can change during the import lifecycle (estimated → final transitions, manual edits after confirmation)
- Storing computed totals creates a denormalization risk — stale aggregates when underlying values change
- Computation is trivial (summing a handful of numbers) with no performance concern at family office scale
- Keeps a single source of truth: the raw box values in K1Data
- Aggregation rules are displayed on both the verification screen (FR-033) and KDocument detail view (FR-036)

**Alternatives Considered**:
- Persist computed totals alongside raw data — creates stale data risk, requires update triggers
- Persist both (snapshot + live) for audit — adds complexity V1 doesn't need; audit trail exists in import session history

---

## Decision 11: Unmapped Items Handling

**Decision**: Display extracted values that don't match any configured cell mapping in a separate "Unmapped Items" section on the verification screen. Administrator can assign to an existing cell, create a new custom cell, or discard.

**Rationale**:
- OCR/extraction may pull supplemental schedule items, footnotes, state-specific addenda
- Silently discarding loses potentially important data
- Auto-creating cells for every unmatched value creates noise
- Explicit user decision preserves data integrity while keeping mapped cells clean
- Assigned unmapped items update the cell mapping for future imports (learning effect)

**Alternatives Considered**:
- Silent discard — loses data, violates user's expectation of completeness
- Auto-create custom cells — too noisy; PDF footnotes and headers would create junk cells

---

## Decision 12: Verification Auto-Accept Strategy

**Decision**: Auto-accept (pre-check) high-confidence values on the verification screen. Require explicit review (acknowledge or edit) for medium and low-confidence values before allowing confirmation.

**Rationale**:
- V1 is "partially manual, partially automated" per user intent
- High-confidence values (≥ 0.85) from digital PDFs are reliably accurate (90%+ per SC-002)
- Forcing explicit review of every cell wastes time on correct values
- Blocking confirmation until medium/low-confidence fields are reviewed catches the errors
- All values remain visible and editable — user can override any pre-accepted value

**Alternatives Considered**:
- Every cell requires explicit accept — too slow for 15+ fields, doesn't match "partially automated" intent
- Spot-check model (everything auto-accepted) — too risky for tax data; OCR errors would go unreviewed
