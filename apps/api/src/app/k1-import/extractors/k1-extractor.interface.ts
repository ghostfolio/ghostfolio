import type { K1ExtractionResult } from '@ghostfolio/common/interfaces';

/**
 * Interface for K-1 PDF data extractors.
 * Each extractor implements a different extraction strategy
 * (pdf-parse for digital PDFs, Azure DI for scanned, tesseract as fallback).
 */
export interface K1Extractor {
  /**
   * Extract structured K-1 data from a PDF buffer.
   * @param buffer - The PDF file content as a Buffer
   * @param fileName - Original filename of the uploaded PDF
   * @returns Extracted K-1 fields with confidence scores
   */
  extract(buffer: Buffer, fileName: string): Promise<K1ExtractionResult>;

  /**
   * Check if this extractor is available/configured.
   * For example, Azure extractor requires API keys to be configured.
   */
  isAvailable(): boolean;
}
