import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import type { K1ExtractionResult, K1ExtractedField } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';

import type { K1Extractor } from './k1-extractor.interface';

/**
 * Tier 2 extractor using Azure AI Document Intelligence (Layout model).
 * Primary cloud OCR for scanned K-1 PDFs.
 * Requires AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT and KEY to be configured.
 */
@Injectable()
export class AzureExtractor implements K1Extractor {
  private readonly logger = new Logger(AzureExtractor.name);

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public isAvailable(): boolean {
    const endpoint = this.configurationService.get(
      'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
    );
    const key = this.configurationService.get(
      'AZURE_DOCUMENT_INTELLIGENCE_KEY'
    );
    return !!(endpoint && key);
  }

  public async extract(
    buffer: Buffer,
    fileName: string
  ): Promise<K1ExtractionResult> {
    this.logger.log(`Extracting from scanned PDF via Azure DI: ${fileName}`);

    const endpoint = this.configurationService.get(
      'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
    );
    const key = this.configurationService.get(
      'AZURE_DOCUMENT_INTELLIGENCE_KEY'
    );

    if (!endpoint || !key) {
      throw new Error(
        'Azure Document Intelligence credentials not configured'
      );
    }

    // Dynamic import to avoid loading SDK when not configured
    const { AzureKeyCredential, DocumentAnalysisClient } = await import(
      '@azure/ai-form-recognizer'
    );

    const client = new DocumentAnalysisClient(
      endpoint,
      new AzureKeyCredential(key)
    );

    // Use prebuilt-layout model for general document analysis
    const poller = await client.beginAnalyzeDocument(
      'prebuilt-layout',
      buffer
    );
    const result = await poller.pollUntilDone();

    const fields: K1ExtractedField[] = [];
    const pageCount = result.pages?.length || 0;

    // Extract key-value pairs from the document
    if (result.keyValuePairs) {
      for (const kvPair of result.keyValuePairs) {
        const keyContent = kvPair.key?.content?.trim();
        const valueContent = kvPair.value?.content?.trim();
        const confidence = kvPair.confidence || 0;

        if (!keyContent || !valueContent) continue;

        // Try to match key to a K-1 box number
        const boxNumber = this.matchKeyToBoxNumber(keyContent);

        if (boxNumber) {
          const numericValue = this.parseNumericValue(valueContent);
          let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
          if (confidence >= 0.85) {
            confidenceLevel = 'HIGH';
          } else if (confidence >= 0.6) {
            confidenceLevel = 'MEDIUM';
          } else {
            confidenceLevel = 'LOW';
          }

          fields.push({
            boxNumber,
            label: '', // Will be filled by field mapper
            customLabel: null,
            rawValue: valueContent,
            numericValue,
            confidence: Math.round(confidence * 100) / 100,
            confidenceLevel,
            isUserEdited: false,
            isReviewed: false
          });
        }
      }
    }

    // Extract tables (K-1 forms often use tabular layout)
    if (result.tables) {
      for (const table of result.tables) {
        this.extractFieldsFromTable(table, fields);
      }
    }

    // Extract metadata from the full text
    const fullText = result.content || '';
    const metadata = this.extractMetadata(fullText);

    const totalConfidence = fields.reduce((sum, f) => sum + f.confidence, 0);
    const overallConfidence =
      fields.length > 0 ? totalConfidence / fields.length : 0;

    return {
      metadata,
      fields,
      unmappedItems: [],
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      method: 'azure',
      pagesProcessed: pageCount
    };
  }

  private matchKeyToBoxNumber(key: string): string | null {
    // Match patterns like "1", "6a", "19a", "Box 1", "Line 1"
    const boxPatterns: Array<{ pattern: RegExp; box: string }> = [
      { pattern: /^(?:box\s*)?1(?:\s|$|\b)/i, box: '1' },
      { pattern: /^(?:box\s*)?2(?:\s|$|\b)/i, box: '2' },
      { pattern: /^(?:box\s*)?3(?:\s|$|\b)/i, box: '3' },
      { pattern: /^(?:box\s*)?4a(?:\s|$|\b)/i, box: '4a' },
      { pattern: /^(?:box\s*)?4b(?:\s|$|\b)/i, box: '4b' },
      { pattern: /^(?:box\s*)?4(?:\s|$|\b)/i, box: '4' },
      { pattern: /^(?:box\s*)?5(?:\s|$|\b)/i, box: '5' },
      { pattern: /^(?:box\s*)?6a(?:\s|$|\b)/i, box: '6a' },
      { pattern: /^(?:box\s*)?6b(?:\s|$|\b)/i, box: '6b' },
      { pattern: /^(?:box\s*)?6c(?:\s|$|\b)/i, box: '6c' },
      { pattern: /^(?:box\s*)?7(?:\s|$|\b)/i, box: '7' },
      { pattern: /^(?:box\s*)?8(?:\s|$|\b)/i, box: '8' },
      { pattern: /^(?:box\s*)?9a(?:\s|$|\b)/i, box: '9a' },
      { pattern: /^(?:box\s*)?9b(?:\s|$|\b)/i, box: '9b' },
      { pattern: /^(?:box\s*)?9c(?:\s|$|\b)/i, box: '9c' },
      { pattern: /^(?:box\s*)?10(?:\s|$|\b)/i, box: '10' },
      { pattern: /^(?:box\s*)?11(?:\s|$|\b)/i, box: '11' },
      { pattern: /^(?:box\s*)?12(?:\s|$|\b)/i, box: '12' },
      { pattern: /^(?:box\s*)?13(?:\s|$|\b)/i, box: '13' },
      { pattern: /^(?:box\s*)?14(?:\s|$|\b)/i, box: '14' },
      { pattern: /^(?:box\s*)?15(?:\s|$|\b)/i, box: '15' },
      { pattern: /^(?:box\s*)?16(?:\s|$|\b)/i, box: '16' },
      { pattern: /^(?:box\s*)?17(?:\s|$|\b)/i, box: '17' },
      { pattern: /^(?:box\s*)?18(?:\s|$|\b)/i, box: '18' },
      { pattern: /^(?:box\s*)?19a(?:\s|$|\b)/i, box: '19a' },
      { pattern: /^(?:box\s*)?19b(?:\s|$|\b)/i, box: '19b' },
      { pattern: /^(?:box\s*)?20(?:\s|$|\b)/i, box: '20' },
      { pattern: /^(?:box\s*)?21(?:\s|$|\b)/i, box: '21' }
    ];

    // Also match by label keywords
    const labelPatterns: Array<{ pattern: RegExp; box: string }> = [
      { pattern: /ordinary\s+business\s+income/i, box: '1' },
      { pattern: /net\s+rental\s+real\s+estate/i, box: '2' },
      { pattern: /other\s+net\s+rental/i, box: '3' },
      { pattern: /guaranteed\s+payments?\s+for\s+services/i, box: '4' },
      { pattern: /guaranteed\s+payments?\s+for\s+capital/i, box: '4a' },
      { pattern: /total\s+guaranteed\s+payments/i, box: '4b' },
      { pattern: /interest\s+income/i, box: '5' },
      { pattern: /ordinary\s+dividends/i, box: '6a' },
      { pattern: /qualified\s+dividends/i, box: '6b' },
      { pattern: /dividend\s+equivalents/i, box: '6c' },
      { pattern: /royalties/i, box: '7' },
      { pattern: /net\s+short[- ]term\s+capital/i, box: '8' },
      { pattern: /net\s+long[- ]term\s+capital/i, box: '9a' },
      { pattern: /collectibles.*28%/i, box: '9b' },
      { pattern: /unrecaptured\s+section\s*1250/i, box: '9c' },
      { pattern: /net\s+section\s*1231/i, box: '10' },
      { pattern: /section\s+179\s+deduction/i, box: '12' },
      { pattern: /self[- ]employment\s+earnings/i, box: '14' },
      { pattern: /foreign\s+taxes\s+paid/i, box: '21' }
    ];

    for (const { pattern, box } of boxPatterns) {
      if (pattern.test(key)) return box;
    }

    for (const { pattern, box } of labelPatterns) {
      if (pattern.test(key)) return box;
    }

    return null;
  }

  private extractFieldsFromTable(table: any, fields: K1ExtractedField[]) {
    if (!table.cells) return;

    const existingBoxes = new Set(fields.map((f) => f.boxNumber));

    // Group cells by row
    const rows = new Map<number, any[]>();
    for (const cell of table.cells) {
      const rowIndex = cell.rowIndex;
      if (!rows.has(rowIndex)) {
        rows.set(rowIndex, []);
      }
      rows.get(rowIndex).push(cell);
    }

    for (const [, rowCells] of rows) {
      if (rowCells.length < 2) continue;

      // Sort by column index
      rowCells.sort((a: any, b: any) => a.columnIndex - b.columnIndex);

      const keyCell = rowCells[0]?.content?.trim();
      const valueCell = rowCells[rowCells.length - 1]?.content?.trim();

      if (!keyCell || !valueCell) continue;

      const boxNumber = this.matchKeyToBoxNumber(keyCell);
      if (boxNumber && !existingBoxes.has(boxNumber)) {
        const numericValue = this.parseNumericValue(valueCell);
        fields.push({
          boxNumber,
          label: '',
          customLabel: null,
          rawValue: valueCell,
          numericValue,
          confidence: 0.7, // Table extraction is less reliable
          confidenceLevel: 'MEDIUM',
          isUserEdited: false,
          isReviewed: false
        });
        existingBoxes.add(boxNumber);
      }
    }
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
    const yearPatterns = [
      /(?:calendar\s+year|tax\s+year)\s*(\d{4})/i,
      /for\s+(?:calendar\s+year|tax\s+year)\s*(\d{4})/i
    ];

    for (const pattern of yearPatterns) {
      const match = text.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        if (year >= 1900 && year <= 2100) return year;
      }
    }
    return null;
  }

  private parseNumericValue(raw: string): number | null {
    if (!raw) return null;
    let cleaned = raw.replace(/\s/g, '');
    const isNegative =
      cleaned.startsWith('(') ||
      cleaned.startsWith('-') ||
      cleaned.startsWith('($');
    cleaned = cleaned.replace(/[$,()]/g, '').replace(/^-/, '');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;
    return isNegative ? -num : num;
  }
}
