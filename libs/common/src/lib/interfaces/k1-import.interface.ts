export interface K1ExtractionResult {
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

export interface K1ExtractedField {
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

  /** Subtype code for boxes that support them (e.g., "ZZ*", "A", "B", "*"). Null for simple boxes. */
  subtype?: string | null;

  /** Field category: PART_III, METADATA, SECTION_J, SECTION_K, SECTION_L, SECTION_M, SECTION_N, CHECKBOX */
  fieldCategory?: string;

  /** Whether this field is a boolean checkbox value */
  isCheckbox?: boolean;
}

export interface K1UnmappedItem {
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

  /** X position in PDF points */
  x?: number;

  /** Y position in PDF points */
  y?: number;

  /** PDF font identifier for debugging */
  fontName?: string;
}

export interface K1ConfirmationRequest {
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

export interface K1ImportSessionSummary {
  id: string;
  partnershipId: string;
  status: string;
  taxYear: number;
  fileName: string;
  extractionMethod: string;
  kDocumentId: string | null;
  createdAt: string;
}

export interface K1AggregationResult {
  ruleId: string;
  name: string;
  operation: string;
  sourceCells: string[];
  computedValue: number;
  breakdown: Record<string, number>;
}
