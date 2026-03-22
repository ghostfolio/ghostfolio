/**
 * K1LineItem — Normalized fact table for K-1 financial line items.
 * One row per box per K-1 document.
 * Replaces deserialized KDocument.data JSON for all queries and aggregations.
 *
 * @see specs/006-k1-model-review/data-model.md
 */

/**
 * Source coordinates from PDF extraction.
 * Bounding box of the extracted value on the source page.
 */
export interface K1SourceCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Core K1LineItem entity.
 */
export interface K1LineItem {
  id: string;
  kDocumentId: string;
  boxKey: string;
  amount: number | null; // Decimal(15,2) — null for non-numeric values
  textValue: string | null; // Non-numeric: "SEE STMT", "true", etc.
  rawText: string | null; // Original extracted text before parsing
  confidence: number | null; // 0.00–1.00 OCR confidence
  sourcePage: number | null; // PDF page number
  sourceCoords: K1SourceCoordinates | null; // Bounding box on page
  isUserEdited: boolean;
  isSuperseded: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * K1LineItem with resolved box definition metadata.
 * Returned by API when line items are fetched with their labels.
 */
export interface K1LineItemWithDefinition extends K1LineItem {
  boxDefinition: {
    boxKey: string;
    label: string;
    section?: string;
    dataType: string;
    sortOrder: number;
  };
}

/**
 * DTO for creating a K1LineItem during dual-write (FR-007).
 * Used internally by K1ImportService.confirm().
 */
export interface CreateK1LineItemDto {
  kDocumentId: string;
  boxKey: string;
  amount: number | null;
  textValue: string | null;
  rawText?: string;
  confidence?: number;
  sourcePage?: number;
  sourceCoords?: K1SourceCoordinates;
  isUserEdited?: boolean;
}

/**
 * Aggregation result from SQL queries on K1LineItem.
 * Replaces the in-memory JSON iteration in K1AggregationService.
 */
export interface K1AggregationResult {
  name: string;
  operation: string;
  total: number;
  sourceCells: string[];
  lineItemCount: number;
}

/**
 * Partnership-year summary from materialized view (FR-010).
 */
export interface K1PartnershipYearSummary {
  partnershipId: string;
  taxYear: number;
  boxKey: string;
  label: string;
  section: string;
  totalAmount: number;
  lineCount: number;
}

/**
 * Supersede operation result (FR-016).
 * Returned when ESTIMATED → FINAL transition marks old rows as superseded.
 */
export interface K1SupersedeResult {
  supersededCount: number; // Number of rows marked isSuperseded = true
  insertedCount: number; // Number of new active rows
  kDocumentId: string;
}

/**
 * Backfill progress/result (FR-006).
 */
export interface K1BackfillResult {
  processedDocuments: number;
  insertedLineItems: number;
  autoCreatedDefinitions: number; // K1BoxDefinition rows created via FR-017
  errors: Array<{ kDocumentId: string; error: string }>;
}
