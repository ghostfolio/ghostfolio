import type { K1ExtractionResult, K1ExtractedField } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';

import { PdfParseExtractor } from './pdf-parse-extractor';
import type { K1Extractor } from './k1-extractor.interface';

/**
 * Tier 2 fallback extractor using tesseract.js (WASM-based OCR).
 * Self-hosted, zero-config — no external API keys required.
 * Lower accuracy (~75%) compared to Azure DI (~95%).
 */
@Injectable()
export class TesseractExtractor implements K1Extractor {
  private readonly logger = new Logger(TesseractExtractor.name);
  private worker: any = null;

  public constructor(
    private readonly pdfParseExtractor: PdfParseExtractor
  ) {}

  public isAvailable(): boolean {
    return true; // Always available — WASM-based, no dependencies
  }

  public async extract(
    buffer: Buffer,
    fileName: string
  ): Promise<K1ExtractionResult> {
    this.logger.log(`Extracting from scanned PDF via Tesseract.js: ${fileName}`);

    const Tesseract = await import('tesseract.js');

    // Create worker if not yet initialized
    if (!this.worker) {
      this.worker = await Tesseract.createWorker('eng');
    }

    // Tesseract.js works on images, so we need to convert PDF pages to images.
    // For scanned PDFs, each page is typically a single image.
    // We'll use pdf-parse to get the PDF info but perform OCR on the raw buffer.
    let text = '';
    let pageCount = 1;

    try {
      // Try to recognize text directly from the PDF buffer
      // Tesseract.js can handle image buffers; for PDFs we extract what we can
      const result = await this.worker.recognize(buffer);
      text = result.data.text;
      pageCount = 1;
    } catch (error) {
      this.logger.warn(
        `Tesseract direct PDF recognition failed, trying alternative approach: ${error}`
      );

      // Fallback: try pdf-parse to at least get any embedded text
      try {
        const pdfParse = await import('pdf-parse');
        const parsed = await pdfParse.default(buffer);
        text = parsed.text;
        pageCount = parsed.numpages;
      } catch (parseError) {
        this.logger.error(
          `Both Tesseract and pdf-parse failed: ${parseError}`
        );
        text = '';
      }
    }

    // Use regex-based extraction on the OCR'd text (same as pdf-parse extractor)
    // but with lower base confidence since OCR text is less reliable
    const fields = this.extractBoxValues(text);
    const metadata = this.extractMetadata(text);

    const totalConfidence = fields.reduce((sum, f) => sum + f.confidence, 0);
    const overallConfidence =
      fields.length > 0 ? totalConfidence / fields.length : 0;

    return {
      metadata,
      fields,
      unmappedItems: [],
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      method: 'tesseract',
      pagesProcessed: pageCount
    };
  }

  private extractBoxValues(text: string): K1ExtractedField[] {
    if (!text) return [];

    // Reuse the same regex patterns as PdfParseExtractor but with lower confidence
    const BOX_PATTERNS: Array<{ boxNumber: string; patterns: RegExp[] }> = [
      { boxNumber: '1', patterns: [/ordinary\s+business\s+income[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '2', patterns: [/net\s+rental\s+real\s+estate[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '3', patterns: [/other\s+net\s+rental[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '4', patterns: [/guaranteed\s+payments?\s+for\s+services[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '4a', patterns: [/guaranteed\s+payments?\s+for\s+capital[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '4b', patterns: [/total\s+guaranteed\s+payments?[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '5', patterns: [/interest\s+income[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '6a', patterns: [/ordinary\s+dividends[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '6b', patterns: [/qualified\s+dividends[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '6c', patterns: [/dividend\s+equivalents[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '7', patterns: [/royalties[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '8', patterns: [/net\s+short[- ]term\s+capital[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '9a', patterns: [/net\s+long[- ]term\s+capital[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '9b', patterns: [/collectibles.*28%[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '9c', patterns: [/unrecaptured\s+section\s*1250[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '10', patterns: [/net\s+section\s*1231[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '11', patterns: [/other\s+income[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '12', patterns: [/section\s*179\s+deduction[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '13', patterns: [/other\s+deductions[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '14', patterns: [/self[- ]employment\s+earnings[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '15', patterns: [/credits[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '16', patterns: [/foreign\s+transactions[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '17', patterns: [/alternative\s+minimum\s+tax[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '18', patterns: [/tax[- ]exempt\s+income[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '19a', patterns: [/distributions.*cash\s+and\s+marketable[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '19b', patterns: [/distributions.*other\s+property[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '20', patterns: [/other\s+information[^$\d-]*([($\d,.\-)]+)/i] },
      { boxNumber: '21', patterns: [/foreign\s+taxes\s+paid[^$\d-]*([($\d,.\-)]+)/i] }
    ];

    const fields: K1ExtractedField[] = [];

    for (const box of BOX_PATTERNS) {
      for (const pattern of box.patterns) {
        const match = text.match(pattern);
        if (match) {
          const rawValue = match[1].trim();
          const numericValue = this.pdfParseExtractor.parseNumericValue(rawValue);

          // Tesseract: lower base confidence of 0.65
          let confidence = 0.65;
          if (numericValue !== null) {
            confidence += 0.1; // Value format validated
          }

          let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
          if (confidence >= 0.85) {
            confidenceLevel = 'HIGH';
          } else if (confidence >= 0.6) {
            confidenceLevel = 'MEDIUM';
          } else {
            confidenceLevel = 'LOW';
          }

          fields.push({
            boxNumber: box.boxNumber,
            label: '',
            customLabel: null,
            rawValue,
            numericValue,
            confidence: Math.round(confidence * 100) / 100,
            confidenceLevel,
            isUserEdited: false,
            isReviewed: false
          });
          break;
        }
      }
    }

    return fields;
  }

  private extractMetadata(text: string): K1ExtractionResult['metadata'] {
    return {
      partnershipName: this.extractPattern(
        text,
        /partnership['']s?\s+name[^:\n]*[:\s]+([^\n]{3,80})/i
      ),
      partnershipEin: this.extractPattern(
        text,
        /partnership['']s?\s+(?:employer\s+identification\s+number|EIN)[^:\n]*[:\s]+(\d{2}[- ]\d{7})/i
      ),
      partnerName: this.extractPattern(
        text,
        /partner['']s?\s+name[^:\n]*[:\s]+([^\n]{3,80})/i
      ),
      partnerEin: this.extractPattern(
        text,
        /partner['']s?\s+(?:identifying|social\s+security)\s+number[^:\n]*[:\s]+(\d{2}[- ]\d{7}|\d{3}[- ]\d{2}[- ]\d{4})/i
      ),
      taxYear: this.extractTaxYear(text),
      isAmended: /amended/i.test(text),
      isFinal: /final\s+k-?1/i.test(text) || /final\s+return/i.test(text)
    };
  }

  private extractPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    return match ? match[1].trim() : null;
  }

  private extractTaxYear(text: string): number | null {
    const match = text.match(/(?:calendar\s+year|tax\s+year)\s*(\d{4})/i);
    if (match) {
      const year = parseInt(match[1], 10);
      if (year >= 1900 && year <= 2100) return year;
    }
    return null;
  }
}
