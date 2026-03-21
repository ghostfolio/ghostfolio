import type { K1ExtractedField, K1ExtractionResult, K1UnmappedItem } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';

import { CellMappingService } from '../cell-mapping/cell-mapping.service';
import { K1ConfidenceService } from './k1-confidence.service';

/**
 * Maps raw extraction results to K-1 box fields using cell mapping configuration.
 * Applies labels from cell mappings, scoring, and auto-review logic.
 */
@Injectable()
export class K1FieldMapperService {
  private readonly logger = new Logger(K1FieldMapperService.name);

  public constructor(
    private readonly cellMappingService: CellMappingService,
    private readonly confidenceService: K1ConfidenceService
  ) {}

  /**
   * Map raw extraction results to fully labeled K1ExtractedFields using cell mappings.
   * Also identifies unmapped items (extracted values that don't match any cell mapping).
   */
  public async mapFields(
    extractionResult: K1ExtractionResult,
    partnershipId: string
  ): Promise<K1ExtractionResult> {
    // Load cell mappings for this partnership (with global fallback)
    const mappings = await this.cellMappingService.getMappings(partnershipId);
    const mappingMap = new Map(mappings.map((m) => [m.boxNumber, m]));

    const mappedFields: K1ExtractedField[] = [];
    const unmappedItems: K1UnmappedItem[] = [
      ...extractionResult.unmappedItems
    ];

    for (const field of extractionResult.fields) {
      const mapping = mappingMap.get(field.boxNumber);

      if (mapping) {
        // Skip ignored fields — they are filtered out of extraction results
        if (mapping.isIgnored) {
          this.logger.debug(
            `Skipping ignored field: box ${field.boxNumber}`
          );
          continue;
        }

        mappedFields.push({
          ...field,
          label: mapping.label,
          customLabel: mapping.isCustom ? mapping.label : field.customLabel,
          cellType: mapping.cellType
        } as any);
      } else {
        // Field has a box number but no corresponding cell mapping
        this.logger.debug(
          `No cell mapping for box ${field.boxNumber}, adding to unmapped items`
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

    // Sort mapped fields by the cell mapping sort order
    const sortedFields = mappedFields.sort((a, b) => {
      const sortA = mappingMap.get(a.boxNumber)?.sortOrder ?? 999;
      const sortB = mappingMap.get(b.boxNumber)?.sortOrder ?? 999;
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
   * Add any mapped cell mapping boxes that were NOT extracted as zero-value fields.
   * This ensures the verification screen shows all expected K-1 boxes.
   */
  public async fillMissingBoxes(
    result: K1ExtractionResult,
    partnershipId: string
  ): Promise<K1ExtractionResult> {
    const mappings = await this.cellMappingService.getMappings(partnershipId);
    const existingBoxes = new Set(result.fields.map((f) => f.boxNumber));

    const missingFields: K1ExtractedField[] = [];

    for (const mapping of mappings) {
      // Skip ignored mappings — don't generate empty placeholder rows
      if (mapping.isIgnored) {
        continue;
      }

      if (!existingBoxes.has(mapping.boxNumber)) {
        missingFields.push({
          boxNumber: mapping.boxNumber,
          label: mapping.label,
          customLabel: mapping.isCustom ? mapping.label : null,
          rawValue: '',
          numericValue: null,
          confidence: 1.0, // Empty fields have full confidence
          confidenceLevel: 'HIGH',
          isUserEdited: false,
          isReviewed: true, // No review needed for empty fields
          cellType: mapping.cellType
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
