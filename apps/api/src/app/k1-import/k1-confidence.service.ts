import type { K1ExtractedField } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

/**
 * K-1 confidence scoring service.
 * Assigns three-level confidence (HIGH/MEDIUM/LOW) based on extraction method
 * and validation heuristics per research.md Decision 5.
 */
@Injectable()
export class K1ConfidenceService {
  /**
   * Apply confidence scoring to extracted fields.
   * Tier 1 (pdf-parse): Base 0.90, bonus for clean regex + valid format.
   * Tier 2 (Azure/Tesseract): Use provider's native confidence score.
   */
  public scoreFields(
    fields: K1ExtractedField[],
    _method: 'pdf-parse' | 'azure' | 'tesseract'
  ): K1ExtractedField[] {
    const scored = fields.map((field) => ({
      ...field,
      confidenceLevel: this.getConfidenceLevel(field.confidence)
    }));

    // Apply cross-field validation rules
    return this.applyCrossFieldValidation(scored);
  }

  /**
   * Map numeric confidence to three-level display.
   * HIGH (>= 0.85): Green — no user attention needed
   * MEDIUM (0.60–0.84): Yellow — optional review
   * LOW (< 0.60): Red — requires manual review
   */
  public getConfidenceLevel(
    confidence: number
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (confidence >= 0.85) return 'HIGH';
    if (confidence >= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Calculate overall extraction confidence.
   */
  public calculateOverallConfidence(fields: K1ExtractedField[]): number {
    if (fields.length === 0) return 0;

    const sum = fields.reduce((acc, f) => acc + f.confidence, 0);
    return Math.round((sum / fields.length) * 100) / 100;
  }

  /**
   * Apply cross-field validation heuristics:
   * - Box 6b (Qualified dividends) <= Box 6a (Ordinary dividends)
   * - Sub-boxes should sum to parent where applicable
   * Fields that fail validation get confidence reduced.
   */
  private applyCrossFieldValidation(
    fields: K1ExtractedField[]
  ): K1ExtractedField[] {
    const fieldMap = new Map(fields.map((f) => [f.boxNumber, f]));

    // Rule: Box 6b <= Box 6a
    const box6a = fieldMap.get('6a');
    const box6b = fieldMap.get('6b');
    if (
      box6a?.numericValue != null &&
      box6b?.numericValue != null &&
      box6b.numericValue > box6a.numericValue
    ) {
      // Reduce confidence on 6b — possible extraction error
      box6b.confidence = Math.max(box6b.confidence - 0.2, 0);
      box6b.confidenceLevel = this.getConfidenceLevel(box6b.confidence);
    }

    // Rule: Box 4b (total guaranteed) should approximately equal
    // Box 4 (services) + Box 4a (capital) if all three are present
    const box4 = fieldMap.get('4');
    const box4a = fieldMap.get('4a');
    const box4b = fieldMap.get('4b');
    if (
      box4?.numericValue != null &&
      box4a?.numericValue != null &&
      box4b?.numericValue != null
    ) {
      const expectedTotal = box4.numericValue + box4a.numericValue;
      const diff = Math.abs(box4b.numericValue - expectedTotal);
      // Allow 1% tolerance for rounding
      if (diff > Math.abs(expectedTotal * 0.01) + 1) {
        box4b.confidence = Math.max(box4b.confidence - 0.15, 0);
        box4b.confidenceLevel = this.getConfidenceLevel(box4b.confidence);
      }
    }

    return fields;
  }

  /**
   * Auto-set isReviewed for high-confidence fields per Decision 12.
   * High-confidence values are auto-accepted (pre-checked).
   * Medium/low require explicit user review.
   */
  public applyAutoReview(fields: K1ExtractedField[]): K1ExtractedField[] {
    return fields.map((field) => ({
      ...field,
      isReviewed: field.isReviewed || field.confidenceLevel === 'HIGH'
    }));
  }
}
