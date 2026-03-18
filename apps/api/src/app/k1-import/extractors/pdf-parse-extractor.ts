import type { K1ExtractionResult, K1ExtractedField } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import type { K1Extractor } from './k1-extractor.interface';

/**
 * Tier 1 extractor for digitally-generated K-1 PDFs.
 * Uses pdf-parse to extract embedded text and regex-based box extraction.
 */
@Injectable()
export class PdfParseExtractor implements K1Extractor {
  private readonly logger = new Logger(PdfParseExtractor.name);

  // Regex patterns for K-1 box extraction
  private readonly BOX_PATTERNS: Array<{
    boxNumber: string;
    patterns: RegExp[];
  }> = [
    {
      boxNumber: '1',
      patterns: [
        /(?:box\s*1|line\s*1)[^a-z0-9]*ordinary\s+business\s+income[^$\d-]*([($\d,.\-)]+)/i,
        /ordinary\s+business\s+income\s*\(loss\)[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '2',
      patterns: [
        /(?:box\s*2|line\s*2)[^a-z0-9]*net\s+rental\s+real\s+estate[^$\d-]*([($\d,.\-)]+)/i,
        /net\s+rental\s+real\s+estate\s+income[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '3',
      patterns: [
        /(?:box\s*3|line\s*3)[^a-z0-9]*other\s+net\s+rental[^$\d-]*([($\d,.\-)]+)/i,
        /other\s+net\s+rental\s+income[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '4',
      patterns: [
        /guaranteed\s+payments?\s+for\s+services[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '4a',
      patterns: [
        /guaranteed\s+payments?\s+for\s+capital[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '4b',
      patterns: [
        /total\s+guaranteed\s+payments?[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '5',
      patterns: [
        /(?:box\s*5|line\s*5)[^a-z0-9]*interest\s+income[^$\d-]*([($\d,.\-)]+)/i,
        /interest\s+income[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '6a',
      patterns: [
        /(?:6a|box\s*6a)[^a-z0-9]*ordinary\s+dividends[^$\d-]*([($\d,.\-)]+)/i,
        /ordinary\s+dividends[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '6b',
      patterns: [
        /(?:6b|box\s*6b)[^a-z0-9]*qualified\s+dividends[^$\d-]*([($\d,.\-)]+)/i,
        /qualified\s+dividends[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '6c',
      patterns: [
        /(?:6c|box\s*6c)[^a-z0-9]*dividend\s+equivalents[^$\d-]*([($\d,.\-)]+)/i,
        /dividend\s+equivalents[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '7',
      patterns: [
        /(?:box\s*7|line\s*7)[^a-z0-9]*royalties[^$\d-]*([($\d,.\-)]+)/i,
        /royalties[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '8',
      patterns: [
        /(?:box\s*8|line\s*8)[^a-z0-9]*net\s+short[- ]term\s+capital[^$\d-]*([($\d,.\-)]+)/i,
        /net\s+short[- ]term\s+capital\s+gain[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '9a',
      patterns: [
        /(?:9a|box\s*9a)[^a-z0-9]*net\s+long[- ]term\s+capital[^$\d-]*([($\d,.\-)]+)/i,
        /net\s+long[- ]term\s+capital\s+gain[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '9b',
      patterns: [
        /(?:9b|box\s*9b)[^a-z0-9]*collectibles[^$\d-]*([($\d,.\-)]+)/i,
        /collectibles\s*\(28%\)\s*gain[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '9c',
      patterns: [
        /(?:9c|box\s*9c)[^a-z0-9]*unrecaptured\s+section\s*1250[^$\d-]*([($\d,.\-)]+)/i,
        /unrecaptured\s+section\s*1250\s+gain[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '10',
      patterns: [
        /(?:box\s*10|line\s*10)[^a-z0-9]*net\s+section\s*1231[^$\d-]*([($\d,.\-)]+)/i,
        /net\s+section\s*1231\s+gain[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '11',
      patterns: [
        /(?:box\s*11|line\s*11)[^a-z0-9]*other\s+income[^$\d-]*([($\d,.\-)]+)/i,
        /other\s+income\s*\(loss\)[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '12',
      patterns: [
        /(?:box\s*12|line\s*12)[^a-z0-9]*section\s*179[^$\d-]*([($\d,.\-)]+)/i,
        /section\s*179\s+deduction[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '13',
      patterns: [
        /(?:box\s*13|line\s*13)[^a-z0-9]*other\s+deductions[^$\d-]*([($\d,.\-)]+)/i,
        /other\s+deductions[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '14',
      patterns: [
        /(?:box\s*14|line\s*14)[^a-z0-9]*self[- ]employment[^$\d-]*([($\d,.\-)]+)/i,
        /self[- ]employment\s+earnings[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '15',
      patterns: [
        /(?:box\s*15|line\s*15)[^a-z0-9]*credits[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '16',
      patterns: [
        /(?:box\s*16|line\s*16)[^a-z0-9]*foreign\s+transactions[^$\d-]*([($\d,.\-)]+)/i,
        /foreign\s+transactions[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '17',
      patterns: [
        /(?:box\s*17|line\s*17)[^a-z0-9]*alternative\s+minimum\s+tax[^$\d-]*([($\d,.\-)]+)/i,
        /alternative\s+minimum\s+tax[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '18',
      patterns: [
        /(?:box\s*18|line\s*18)[^a-z0-9]*tax[- ]exempt[^$\d-]*([($\d,.\-)]+)/i,
        /tax[- ]exempt\s+income[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '19a',
      patterns: [
        /(?:19a|box\s*19a)[^a-z0-9]*distributions[^$\d-]*cash[^$\d-]*([($\d,.\-)]+)/i,
        /distributions.*cash\s+and\s+marketable[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '19b',
      patterns: [
        /(?:19b|box\s*19b)[^a-z0-9]*distributions[^$\d-]*other\s+property[^$\d-]*([($\d,.\-)]+)/i,
        /distributions.*other\s+property[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '20',
      patterns: [
        /(?:box\s*20|line\s*20)[^a-z0-9]*other\s+information[^$\d-]*([($\d,.\-)]+)/i,
        /other\s+information[^$\d-]*([($\d,.\-)]+)/i
      ]
    },
    {
      boxNumber: '21',
      patterns: [
        /(?:box\s*21|line\s*21)[^a-z0-9]*foreign\s+taxes[^$\d-]*([($\d,.\-)]+)/i,
        /foreign\s+taxes\s+paid[^$\d-]*([($\d,.\-)]+)/i
      ]
    }
  ];

  // Metadata extraction patterns
  private readonly METADATA_PATTERNS = {
    partnershipName: [
      /partnership['']s?\s+name[^:\n]*[:\s]+([^\n]{3,80})/i,
      /name\s+of\s+partnership[^:\n]*[:\s]+([^\n]{3,80})/i
    ],
    partnershipEin: [
      /partnership['']s?\s+(?:employer\s+identification\s+number|EIN)[^:\n]*[:\s]+(\d{2}[- ]\d{7})/i
    ],
    partnerName: [
      /partner['']s?\s+name[^:\n]*[:\s]+([^\n]{3,80})/i,
      /name\s+of\s+partner[^:\n]*[:\s]+([^\n]{3,80})/i
    ],
    partnerEin: [
      /partner['']s?\s+(?:identifying|social\s+security)\s+number[^:\n]*[:\s]+(\d{2}[- ]\d{7}|\d{3}[- ]\d{2}[- ]\d{4})/i
    ],
    taxYear: [
      /(?:calendar\s+year|tax\s+year)\s*(\d{4})/i,
      /for\s+(?:calendar\s+year|tax\s+year)\s*(\d{4})/i,
      /(?:beginning|ending)\s+.*?(\d{4})/i
    ]
  };

  public isAvailable(): boolean {
    return true; // Always available — no external dependencies
  }

  public async extract(
    buffer: Buffer,
    fileName: string
  ): Promise<K1ExtractionResult> {
    this.logger.log(`Extracting from digital PDF: ${fileName}`);

    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const text = parsed.text;
    const pageCount = parsed.total;

    // Extract metadata
    const metadata = this.extractMetadata(text);

    // Extract box values
    const fields = this.extractBoxValues(text);

    // Calculate overall confidence
    const totalConfidence = fields.reduce((sum, f) => sum + f.confidence, 0);
    const overallConfidence =
      fields.length > 0 ? totalConfidence / fields.length : 0;

    return {
      metadata,
      fields,
      unmappedItems: [],
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      method: 'pdf-parse',
      pagesProcessed: pageCount
    };
  }

  private extractMetadata(text: string): K1ExtractionResult['metadata'] {
    const metadata: K1ExtractionResult['metadata'] = {
      partnershipName: null,
      partnershipEin: null,
      partnerName: null,
      partnerEin: null,
      taxYear: null,
      isAmended: /amended/i.test(text),
      isFinal: /final\s+k-?1/i.test(text) || /final\s+return/i.test(text)
    };

    for (const pattern of this.METADATA_PATTERNS.partnershipName) {
      const match = text.match(pattern);
      if (match) {
        metadata.partnershipName = match[1].trim();
        break;
      }
    }

    for (const pattern of this.METADATA_PATTERNS.partnershipEin) {
      const match = text.match(pattern);
      if (match) {
        metadata.partnershipEin = match[1].trim();
        break;
      }
    }

    for (const pattern of this.METADATA_PATTERNS.partnerName) {
      const match = text.match(pattern);
      if (match) {
        metadata.partnerName = match[1].trim();
        break;
      }
    }

    for (const pattern of this.METADATA_PATTERNS.partnerEin) {
      const match = text.match(pattern);
      if (match) {
        metadata.partnerEin = match[1].trim();
        break;
      }
    }

    for (const pattern of this.METADATA_PATTERNS.taxYear) {
      const match = text.match(pattern);
      if (match) {
        const year = parseInt(match[1], 10);
        if (year >= 1900 && year <= 2100) {
          metadata.taxYear = year;
          break;
        }
      }
    }

    return metadata;
  }

  private extractBoxValues(text: string): K1ExtractedField[] {
    const fields: K1ExtractedField[] = [];

    for (const box of this.BOX_PATTERNS) {
      for (const pattern of box.patterns) {
        const match = text.match(pattern);
        if (match) {
          const rawValue = match[1].trim();
          const numericValue = this.parseNumericValue(rawValue);

          // Confidence: 0.90 base + 0.05 for regex match + 0.05 for validated format
          let confidence = 0.9;
          confidence += 0.05; // regex matched cleanly
          if (numericValue !== null) {
            confidence += 0.05; // value format validated
          }

          fields.push({
            boxNumber: box.boxNumber,
            label: '', // Will be filled by field mapper
            customLabel: null,
            rawValue,
            numericValue,
            confidence: Math.min(confidence, 1.0),
            confidenceLevel: 'HIGH',
            isUserEdited: false,
            isReviewed: false
          });
          break; // Use first matching pattern
        }
      }
    }

    return fields;
  }

  /**
   * Parse a K-1 dollar value string to a number.
   * Handles: $52,340  (52340)  ($1,200)  -$500  1200.50
   */
  public parseNumericValue(raw: string): number | null {
    if (!raw) return null;

    // Remove whitespace
    let cleaned = raw.replace(/\s/g, '');

    // Detect negative values: ($1,200) or ($1200)
    const isNegative =
      cleaned.startsWith('(') ||
      cleaned.startsWith('-') ||
      cleaned.startsWith('($');

    // Remove currency symbols, commas, parens
    cleaned = cleaned.replace(/[$,()]/g, '').replace(/^-/, '');

    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    return isNegative ? -num : num;
  }

  /**
   * Detect if the PDF is a digital (text-embedded) K-1 document.
   * Returns true if sufficient text is found with K-1 keywords.
   */
  public async isDigitalK1(buffer: Buffer): Promise<boolean> {
    try {
      const parser = new PDFParse({ data: buffer });
      const parsed = await parser.getText();
      const text = parsed.text || '';

      if (text.length < 100) return false;

      const k1Keywords = ['Schedule K-1', 'Form 1065', "Partner's Share"];
      return k1Keywords.some((kw) => text.includes(kw));
    } catch {
      return false;
    }
  }
}
