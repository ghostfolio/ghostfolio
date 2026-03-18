import type {
  K1ExtractionResult,
  K1ExtractedField,
  K1UnmappedItem
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { resolve } from 'path';

import type { K1Extractor } from './k1-extractor.interface';
import {
  K1_POSITION_REGIONS,
  POSITION_TOLERANCE,
  SUBTYPE_Y_TOLERANCE,
  type K1PositionRegion
} from './k1-position-regions';

// ============================================================================
// Internal types for pdfjs-dist text extraction
// ============================================================================
interface PdfTextItem {
  str: string;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, x, y]
  width: number;
  height: number;
  fontName: string;
  hasEOL: boolean;
  dir: string;
}

interface PdfTextStyle {
  fontFamily: string;
  ascent: number;
  descent: number;
  vertical: boolean;
}

interface DataItem {
  text: string;
  x: number;
  y: number;
  fontName: string;
  fontFamily: string;
  matched: boolean;
}

/**
 * Tier 1 extractor for digitally-generated K-1 PDFs.
 * Uses pdfjs-dist position-based text extraction with font discrimination
 * to accurately map values to K-1 form fields by (x, y) coordinates.
 */
@Injectable()
export class PdfParseExtractor implements K1Extractor {
  private readonly logger = new Logger(PdfParseExtractor.name);

  public isAvailable(): boolean {
    return true; // Always available — no external dependencies
  }

  // ==========================================================================
  // T003: Main extraction entry point — pdfjs-dist scaffold
  // ==========================================================================
  public async extract(
    buffer: Buffer,
    fileName: string
  ): Promise<K1ExtractionResult> {
    this.logger.log(`Extracting from digital PDF: ${fileName}`);

    // Dynamic import — API project compiles to CommonJS via webpack
    const { getDocument, GlobalWorkerOptions } = await import(
      'pdfjs-dist/legacy/build/pdf.mjs'
    );

    // Configure worker
    const workerPath =
      'file:///' +
      resolve(
        'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
      ).replace(/\\/g, '/');
    GlobalWorkerOptions.workerSrc = workerPath;

    let pdfDoc: any = null;

    try {
      const loadingTask = getDocument({
        data: new Uint8Array(buffer),
        standardFontDataUrl:
          resolve('node_modules/pdfjs-dist/standard_fonts') + '/',
        cMapUrl: resolve('node_modules/pdfjs-dist/cmaps') + '/',
        cMapPacked: true,
        isEvalSupported: false,
        disableFontFace: true
      });

      pdfDoc = await loadingTask.promise;
      const pageCount = pdfDoc.numPages;

      // T024: Process only page 1 (FR-024)
      const page = await pdfDoc.getPage(1);
      const textContent = await page.getTextContent({
        includeMarkedContent: false
      });

      const items = textContent.items as PdfTextItem[];
      const styles = textContent.styles as Record<string, PdfTextStyle>;

      if (items.length === 0) {
        this.logger.warn(`No text items found in ${fileName}`);
        return this.emptyResult(pageCount);
      }

      // T004: Font discrimination
      const dataItems = this.filterDataItems(items, styles);

      if (dataItems.length === 0) {
        this.logger.warn(
          `No data-font items found in ${fileName} (${items.length} total items)`
        );
        return this.emptyResult(pageCount);
      }

      this.logger.log(
        `Found ${dataItems.length} data items out of ${items.length} total (${fileName})`
      );

      // Extract all field categories
      const fields: K1ExtractedField[] = [];
      const metadata = this.initMetadata();

      // T007-T010 (US1): Part III extraction
      this.extractPartIII(dataItems, fields);

      // T011-T014 (US2): Header + Part I/II metadata
      this.extractMetadata(dataItems, fields, metadata);

      // T015-T018 (US3): Sections J/K/L/M/N
      this.extractSections(dataItems, fields);

      // T019-T020 (US4): Checkbox detection
      this.extractCheckboxes(dataItems, fields, metadata);

      // T021 (US5): Unmapped items
      const unmappedItems = this.collectUnmappedItems(dataItems);

      // T024: Confidence scoring
      const overallConfidence = this.computeOverallConfidence(fields);

      return {
        metadata,
        fields,
        unmappedItems,
        overallConfidence,
        method: 'pdf-parse',
        pagesProcessed: pageCount
      };
    } catch (error: unknown) {
      // T023: Graceful error handling
      const message =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Extraction failed for ${fileName}: ${message}`
      );
      return this.emptyResult(1);
    } finally {
      // T025: Cleanup — always destroy
      if (pdfDoc) {
        try {
          await pdfDoc.destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  // ==========================================================================
  // T004: Font discrimination — identify data fonts vs template fonts
  // ==========================================================================
  private filterDataItems(
    items: PdfTextItem[],
    styles: Record<string, PdfTextStyle>
  ): DataItem[] {
    const dataItems: DataItem[] = [];

    for (const item of items) {
      const text = item.str.trim();
      if (!text) continue;

      const style = styles[item.fontName];
      if (!style) continue;

      const fontFamily = style.fontFamily.toLowerCase();

      // Template text uses serif fonts; data values use sans-serif or monospace
      if (fontFamily === 'serif') continue;

      dataItems.push({
        text,
        x: item.transform[4],
        y: item.transform[5],
        fontName: item.fontName,
        fontFamily,
        matched: false
      });
    }

    return dataItems;
  }

  // ==========================================================================
  // T006: Value parsing utility
  // ==========================================================================

  /**
   * Parse a K-1 value string to a number.
   * Rules:
   * 1. Remove commas
   * 2. Parenthesized = negative
   * 3. Leading minus = negative
   * 4. Strip dollar sign
   * 5. Preserve decimal percentages
   * 6. "SEE STMT" → null
   * 7. "X" (checkbox) → null
   * 8. Empty → null
   * 9. Text like "E-FILE" → null
   */
  public parseNumericValue(raw: string): number | null {
    if (!raw) return null;

    const trimmed = raw.trim();
    if (!trimmed) return null;

    // Non-numeric text values
    const upper = trimmed.toUpperCase();
    if (
      upper === 'SEE STMT' ||
      upper === 'STMT' ||
      upper === 'SEE STATEMENT' ||
      upper === 'X' ||
      upper === 'E-FILE' ||
      upper === 'YES' ||
      upper === 'NO'
    ) {
      return null;
    }

    let cleaned = trimmed;

    // Detect negative: parenthesized
    const isParenNegative = /^\(.*\)$/.test(cleaned);

    // Strip $, commas, parens
    cleaned = cleaned.replace(/[$,()]/g, '');

    // Detect leading minus
    const isMinusNegative = cleaned.startsWith('-');
    if (isMinusNegative) {
      cleaned = cleaned.substring(1);
    }

    // Try parsing
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    return isParenNegative || isMinusNegative ? -num : num;
  }

  // ==========================================================================
  // T024: Confidence scoring based on position distance
  // ==========================================================================
  private computeConfidence(
    x: number,
    y: number,
    region: K1PositionRegion
  ): { confidence: number; confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' } {
    const regionCenterX = (region.xMin + region.xMax) / 2;
    const regionCenterY = (region.yMin + region.yMax) / 2;
    const dx = Math.abs(x - regionCenterX);
    const dy = Math.abs(y - regionCenterY);
    const distance = Math.max(dx, dy);

    // Half the region size is the "ideal" zone
    const regionHalfW = (region.xMax - region.xMin) / 2;
    const regionHalfH = (region.yMax - region.yMin) / 2;
    const idealRadius = Math.max(regionHalfW, regionHalfH);

    if (distance <= idealRadius) {
      return { confidence: 0.95, confidenceLevel: 'HIGH' };
    } else if (distance <= idealRadius + 5) {
      return { confidence: 0.85, confidenceLevel: 'MEDIUM' };
    } else {
      return { confidence: 0.65, confidenceLevel: 'LOW' };
    }
  }

  private computeOverallConfidence(fields: K1ExtractedField[]): number {
    if (fields.length === 0) return 0;
    const total = fields.reduce((sum, f) => sum + f.confidence, 0);
    return Math.round((total / fields.length) * 100) / 100;
  }

  // ==========================================================================
  // T023: Empty result helper for error/empty cases
  // ==========================================================================
  private emptyResult(pageCount: number): K1ExtractionResult {
    return {
      metadata: this.initMetadata(),
      fields: [],
      unmappedItems: [],
      overallConfidence: 0,
      method: 'pdf-parse',
      pagesProcessed: pageCount
    };
  }

  private initMetadata(): K1ExtractionResult['metadata'] {
    return {
      partnershipName: null,
      partnershipEin: null,
      partnerName: null,
      partnerEin: null,
      taxYear: null,
      isAmended: false,
      isFinal: false
    };
  }

  // ==========================================================================
  // T007-T010 (US1): Part III extraction — boxes 1-21 with subtypes
  // ==========================================================================
  private extractPartIII(
    dataItems: DataItem[],
    fields: K1ExtractedField[]
  ): void {
    const partIIIRegions = K1_POSITION_REGIONS.filter(
      (r) =>
        r.fieldCategory === 'PART_III' &&
        r.valueType !== 'checkbox'
    );

    for (const region of partIIIRegions) {
      if (region.hasSubtype) {
        // T008-T009: Subtype pairing
        this.extractSubtypeField(dataItems, fields, region);
      } else {
        // Simple value matching
        this.extractSimpleField(dataItems, fields, region);
      }
    }
  }

  /**
   * T008: Pair subtype code + value for a region.
   * T009: Handle multi-subtype boxes (e.g., box 20 with A, B, Z, *).
   */
  private extractSubtypeField(
    dataItems: DataItem[],
    fields: K1ExtractedField[],
    region: K1PositionRegion
  ): void {
    // Find all code items in the subtype column within this region's y-range
    const codes: DataItem[] = [];
    const values: DataItem[] = [];

    for (const item of dataItems) {
      if (item.matched) continue;

      const inYRange =
        item.y >= region.yMin - POSITION_TOLERANCE &&
        item.y <= region.yMax + POSITION_TOLERANCE;

      if (!inYRange) continue;

      // Is it in the subtype code column?
      if (
        region.subtypeXMin !== null &&
        region.subtypeXMax !== null &&
        item.x >= region.subtypeXMin - POSITION_TOLERANCE &&
        item.x <= region.subtypeXMax + POSITION_TOLERANCE
      ) {
        codes.push(item);
      }
      // Is it in the value column?
      else if (
        item.x >= region.xMin - POSITION_TOLERANCE &&
        item.x <= region.xMax + POSITION_TOLERANCE
      ) {
        values.push(item);
      }
    }

    // If we have codes, pair each code with the closest value at same y
    if (codes.length > 0) {
      for (const code of codes) {
        // Find value at same y-band (±8pts)
        const pairedValue = values.find(
          (v) =>
            !v.matched &&
            Math.abs(v.y - code.y) <= SUBTYPE_Y_TOLERANCE
        );

        const rawValue = pairedValue ? pairedValue.text : '';
        const numericValue = this.parseNumericValue(rawValue);
        const { confidence, confidenceLevel } = this.computeConfidence(
          code.x,
          code.y,
          region
        );

        fields.push({
          boxNumber: region.boxNumber,
          label: region.label,
          customLabel: null,
          rawValue,
          numericValue,
          confidence,
          confidenceLevel,
          isUserEdited: false,
          isReviewed: false,
          subtype: code.text.trim(),
          fieldCategory: region.fieldCategory,
          isCheckbox: false
        });

        code.matched = true;
        if (pairedValue) pairedValue.matched = true;
      }
    }
    // If no codes but we have values, treat as simple single-value field
    else if (values.length > 0) {
      const item = values[0];
      const numericValue = this.parseNumericValue(item.text);
      const { confidence, confidenceLevel } = this.computeConfidence(
        item.x,
        item.y,
        region
      );

      fields.push({
        boxNumber: region.boxNumber,
        label: region.label,
        customLabel: null,
        rawValue: item.text,
        numericValue,
        confidence,
        confidenceLevel,
        isUserEdited: false,
        isReviewed: false,
        subtype: null,
        fieldCategory: region.fieldCategory,
        isCheckbox: false
      });

      item.matched = true;
    }
  }

  /**
   * Simple non-subtype field extraction — match the closest data item
   * within the region's bounding box.
   */
  private extractSimpleField(
    dataItems: DataItem[],
    fields: K1ExtractedField[],
    region: K1PositionRegion
  ): void {
    const item = this.findBestItemInRegion(dataItems, region);
    if (!item) return;

    const numericValue =
      region.valueType === 'checkbox'
        ? null
        : this.parseNumericValue(item.text);
    const { confidence, confidenceLevel } = this.computeConfidence(
      item.x,
      item.y,
      region
    );

    fields.push({
      boxNumber: region.boxNumber,
      label: region.label,
      customLabel: null,
      rawValue: item.text,
      numericValue,
      confidence,
      confidenceLevel,
      isUserEdited: false,
      isReviewed: false,
      subtype: null,
      fieldCategory: region.fieldCategory,
      isCheckbox: region.valueType === 'checkbox'
    });

    item.matched = true;
  }

  // ==========================================================================
  // T011-T014 (US2): Metadata extraction — header, Part I, Part II
  // ==========================================================================
  private extractMetadata(
    dataItems: DataItem[],
    fields: K1ExtractedField[],
    metadata: K1ExtractionResult['metadata']
  ): void {
    // Header regions: tax year
    const taxYearItems: DataItem[] = [];
    for (const item of dataItems) {
      if (item.matched) continue;
      // Tax year region: near top of page (y > 760), x around 245-310
      if (item.y > 745 && item.x > 200 && item.x < 350) {
        // Look for 2-digit or 4-digit year fragments
        if (/^\d{2,4}$/.test(item.text)) {
          taxYearItems.push(item);
        }
      }
    }

    // Combine year fragments (e.g., "20" + "25" → 2025)
    if (taxYearItems.length >= 2) {
      // Sort by x position
      taxYearItems.sort((a, b) => a.x - b.x);
      const combined = taxYearItems.map((i) => i.text).join('');
      const year = parseInt(combined, 10);
      if (year >= 1900 && year <= 2100) {
        metadata.taxYear = year;
        for (const item of taxYearItems) {
          item.matched = true;
        }
      }
    } else if (taxYearItems.length === 1) {
      const text = taxYearItems[0].text;
      const year = parseInt(text, 10);
      if (text.length === 4 && year >= 1900 && year <= 2100) {
        metadata.taxYear = year;
        taxYearItems[0].matched = true;
      }
    }

    // Part I: Partnership info
    this.extractTextMetadata(dataItems, 'A_EIN', metadata, 'partnershipEin');
    this.extractTextMetadata(dataItems, 'B_NAME', metadata, 'partnershipName');
    this.extractTextMetadata(dataItems, 'C_IRS_CENTER', metadata, null);

    // Part II: Partner info
    this.extractTextMetadata(dataItems, 'D_PARTNER_EIN', metadata, 'partnerEin');
    this.extractTextMetadata(dataItems, 'E_NAME', metadata, 'partnerName');
    this.extractTextMetadata(dataItems, 'F_ADDR', metadata, null);

    // Extract remaining metadata text fields into the fields array
    const metadataRegions = K1_POSITION_REGIONS.filter(
      (r) =>
        r.fieldCategory === 'METADATA' &&
        r.valueType === 'text'
    );

    for (const region of metadataRegions) {
      this.extractSimpleField(dataItems, fields, region);
    }
  }

  /**
   * Match data items to a metadata region and set the corresponding
   * metadata property. Collects multiple items in the same region
   * (e.g., multi-line names/addresses).
   */
  private extractTextMetadata(
    dataItems: DataItem[],
    regionFieldId: string,
    metadata: K1ExtractionResult['metadata'],
    metadataKey: keyof K1ExtractionResult['metadata'] | null
  ): void {
    const region = K1_POSITION_REGIONS.find(
      (r) => r.fieldId === regionFieldId
    );
    if (!region) return;

    const matches: DataItem[] = [];
    for (const item of dataItems) {
      if (item.matched) continue;
      if (
        item.x >= region.xMin - POSITION_TOLERANCE &&
        item.x <= region.xMax + POSITION_TOLERANCE &&
        item.y >= region.yMin - POSITION_TOLERANCE &&
        item.y <= region.yMax + POSITION_TOLERANCE
      ) {
        matches.push(item);
      }
    }

    if (matches.length === 0) return;

    // Sort by y descending (top of page first in PDF coords)
    matches.sort((a, b) => b.y - a.y);
    const combinedText = matches.map((m) => m.text).join(' ').trim();

    if (metadataKey && combinedText) {
      if (metadataKey === 'taxYear') {
        const year = parseInt(combinedText, 10);
        if (year >= 1900 && year <= 2100) {
          metadata.taxYear = year;
        }
      } else if (
        metadataKey === 'isFinal' ||
        metadataKey === 'isAmended'
      ) {
        (metadata as any)[metadataKey] = true;
      } else {
        (metadata as any)[metadataKey] = combinedText;
      }
    }

    for (const item of matches) {
      item.matched = true;
    }
  }

  // ==========================================================================
  // T015-T018 (US3): Section J/K/L/M/N extraction
  // ==========================================================================
  private extractSections(
    dataItems: DataItem[],
    fields: K1ExtractedField[]
  ): void {
    const sectionCategories = [
      'SECTION_J',
      'SECTION_K',
      'SECTION_L',
      'SECTION_M',
      'SECTION_N'
    ];

    for (const category of sectionCategories) {
      const regions = K1_POSITION_REGIONS.filter(
        (r) => r.fieldCategory === category
      );
      for (const region of regions) {
        if (region.valueType === 'checkbox') {
          // Handled in extractCheckboxes
          continue;
        }
        this.extractSimpleField(dataItems, fields, region);
      }
    }
  }

  // ==========================================================================
  // T019-T020 (US4): Checkbox extraction
  // ==========================================================================
  private extractCheckboxes(
    dataItems: DataItem[],
    fields: K1ExtractedField[],
    metadata: K1ExtractionResult['metadata']
  ): void {
    const checkboxRegions = K1_POSITION_REGIONS.filter(
      (r) => r.valueType === 'checkbox'
    );

    for (const region of checkboxRegions) {
      const item = this.findBestItemInRegion(dataItems, region);
      const isChecked =
        item !== null &&
        (item.text.toUpperCase() === 'X' ||
          item.text.toUpperCase() === '✓' ||
          item.text.toUpperCase() === '✗');

      if (isChecked && item) {
        const { confidence, confidenceLevel } = this.computeConfidence(
          item.x,
          item.y,
          region
        );

        fields.push({
          boxNumber: region.boxNumber,
          label: region.label,
          customLabel: null,
          rawValue: 'X',
          numericValue: null,
          confidence,
          confidenceLevel,
          isUserEdited: false,
          isReviewed: false,
          subtype: null,
          fieldCategory: 'CHECKBOX',
          isCheckbox: true
        });

        item.matched = true;

        // Set metadata flags for known checkboxes
        if (region.fieldId === 'FINAL_K1') {
          metadata.isFinal = true;
        } else if (region.fieldId === 'AMENDED_K1') {
          metadata.isAmended = true;
        }
      }
    }
  }

  // ==========================================================================
  // T021 (US5): Unmapped items collection
  // ==========================================================================
  private collectUnmappedItems(dataItems: DataItem[]): K1UnmappedItem[] {
    const unmapped: K1UnmappedItem[] = [];

    for (const item of dataItems) {
      if (item.matched) continue;

      // Skip very short items that are likely noise (single digits, etc.)
      if (item.text.length <= 1 && !/\d/.test(item.text) && item.text !== 'X') {
        continue;
      }

      const numericValue = this.parseNumericValue(item.text);

      unmapped.push({
        rawLabel: '',
        rawValue: item.text,
        numericValue,
        confidence: 0.5,
        pageNumber: 1,
        resolution: null,
        assignedBoxNumber: null,
        x: Math.round(item.x * 10) / 10,
        y: Math.round(item.y * 10) / 10,
        fontName: item.fontName
      });
    }

    return unmapped;
  }

  // ==========================================================================
  // T005: Position matching helper
  // ==========================================================================
  private findBestItemInRegion(
    dataItems: DataItem[],
    region: K1PositionRegion
  ): DataItem | null {
    let bestItem: DataItem | null = null;
    let bestDistance = Infinity;

    const regionCenterX = (region.xMin + region.xMax) / 2;
    const regionCenterY = (region.yMin + region.yMax) / 2;

    for (const item of dataItems) {
      if (item.matched) continue;

      if (
        item.x >= region.xMin - POSITION_TOLERANCE &&
        item.x <= region.xMax + POSITION_TOLERANCE &&
        item.y >= region.yMin - POSITION_TOLERANCE &&
        item.y <= region.yMax + POSITION_TOLERANCE
      ) {
        const dx = Math.abs(item.x - regionCenterX);
        const dy = Math.abs(item.y - regionCenterY);
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestItem = item;
        }
      }
    }

    return bestItem;
  }

  // ==========================================================================
  // Preserved: isDigitalK1 — used by isAvailable() and external callers
  // ==========================================================================

  /**
   * Detect if the PDF is a digital (text-embedded) K-1 document.
   * Returns true if sufficient text is found with K-1 keywords.
   */
  public async isDigitalK1(buffer: Buffer): Promise<boolean> {
    try {
      const { getDocument, GlobalWorkerOptions } = await import(
        'pdfjs-dist/legacy/build/pdf.mjs'
      );

      const workerPath =
        'file:///' +
        resolve(
          'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
        ).replace(/\\/g, '/');
      GlobalWorkerOptions.workerSrc = workerPath;

      const loadingTask = getDocument({
        data: new Uint8Array(buffer),
        isEvalSupported: false,
        disableFontFace: true
      });

      const pdfDoc = await loadingTask.promise;
      try {
        const page = await pdfDoc.getPage(1);
        const textContent = await page.getTextContent({
          includeMarkedContent: false
        });

        const text = (textContent.items as PdfTextItem[])
          .map((item) => item.str)
          .join(' ');

        if (text.length < 100) return false;

        const k1Keywords = [
          'Schedule K-1',
          'Form 1065',
          "Partner's Share"
        ];
        return k1Keywords.some((kw) => text.includes(kw));
      } finally {
        await pdfDoc.destroy();
      }
    } catch {
      return false;
    }
  }
}
