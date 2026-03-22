import type { K1ExtractedField, K1ExtractionResult, K1UnmappedItem } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';

import { K1BoxDefinitionService } from '../k1-box-definition/k1-box-definition.service';
import { K1ConfidenceService } from './k1-confidence.service';

/**
 * Maps raw extraction results to K-1 box fields using K1BoxDefinition reference data.
 * Applies labels from box definitions, scoring, and auto-review logic.
 */
@Injectable()
export class K1FieldMapperService {
  private readonly logger = new Logger(K1FieldMapperService.name);

  public constructor(
    private readonly k1BoxDefinitionService: K1BoxDefinitionService,
    private readonly confidenceService: K1ConfidenceService
  ) {}

  /**
   * Map raw extraction results to fully labeled K1ExtractedFields using box definitions.
   * Also identifies unmapped items (extracted values that don't match any box definition).
   */
  public async mapFields(
    extractionResult: K1ExtractionResult,
    partnershipId: string
  ): Promise<K1ExtractionResult> {
    // Load resolved box definitions for this partnership (with overrides applied)
    const definitions = await this.k1BoxDefinitionService.resolve(partnershipId);
    const defMap = new Map(definitions.map((d) => [d.boxKey, d]));

    const mappedFields: K1ExtractedField[] = [];
    const unmappedItems: K1UnmappedItem[] = [
      ...extractionResult.unmappedItems
    ];

    for (const field of extractionResult.fields) {
      const def = defMap.get(field.boxNumber);

      if (def) {
        mappedFields.push({
          ...field,
          label: def.label,
          customLabel: def.customLabel ? def.label : field.customLabel,
          cellType: def.dataType
        } as any);
      } else {
        // Field has a box number but no corresponding box definition
        this.logger.debug(
          `No box definition for box ${field.boxNumber}, adding to unmapped items`
        );
        unmappedItems.push({
          rawLabel: field.label || `Box ${field.boxNumber}`,
          rawValue: field.rawValue,
          numericValue: field.numericValue,
          confidence: field.confidence,
          pageNumber: 1, // Default page number when unknown
          resolution: null,
          assignedBoxNumber: null
        });
      }
    }

    // Sort mapped fields by the box definition sort order
    const sortedFields = mappedFields.sort((a, b) => {
      const sortA = defMap.get(a.boxNumber)?.sortOrder ?? 999;
      const sortB = defMap.get(b.boxNumber)?.sortOrder ?? 999;
      return sortA - sortB;
    });

    // Apply confidence scoring
    const scoredFields = this.confidenceService.scoreFields(
      sortedFields,
      extractionResult.method
    );

    // Apply auto-review (high-confidence auto-accepted)
    const reviewedFields = this.confidenceService.applyAutoReview(scoredFields);

    // Recalculate overall confidence
    const overallConfidence =
      this.confidenceService.calculateOverallConfidence(reviewedFields);

    return {
      ...extractionResult,
      fields: reviewedFields,
      unmappedItems,
      overallConfidence
    };
  }

  /**
   * Add any box definitions that were NOT extracted as zero-value fields.
   * This ensures the verification screen shows all expected K-1 boxes.
   */
  public async fillMissingBoxes(
    result: K1ExtractionResult,
    partnershipId: string
  ): Promise<K1ExtractionResult> {
    const definitions = await this.k1BoxDefinitionService.resolve(partnershipId);
    const existingBoxes = new Set(result.fields.map((f) => f.boxNumber));

    const missingFields: K1ExtractedField[] = [];

    for (const def of definitions) {
      if (!existingBoxes.has(def.boxKey)) {
        missingFields.push({
          boxNumber: def.boxKey,
          label: def.label,
          customLabel: def.customLabel ?? null,
          rawValue: '',
          numericValue: null,
          confidence: 1.0, // Empty fields have full confidence
          confidenceLevel: 'HIGH',
          isUserEdited: false,
          isReviewed: true, // No review needed for empty fields
          cellType: def.dataType
        } as any);
      }
    }

    return {
      ...result,
      fields: [...result.fields, ...missingFields].sort((a, b) => {
        // Sort by natural box number order
        return this.compareBoxNumbers(a.boxNumber, b.boxNumber);
      })
    };
  }

  /**
   * Compare box numbers for natural ordering (1, 2, 3, 4, 4a, 4b, 5, 6a, ...).
   */
  private compareBoxNumbers(a: string, b: string): number {
    const parseBox = (box: string) => {
      const match = box.match(/^(\d+)([a-z]?)$/);
      if (!match) return { num: 999, sub: box };
      return { num: parseInt(match[1], 10), sub: match[2] || '' };
    };

    const pa = parseBox(a);
    const pb = parseBox(b);

    if (pa.num !== pb.num) return pa.num - pb.num;
    return pa.sub.localeCompare(pb.sub);
  }
}
