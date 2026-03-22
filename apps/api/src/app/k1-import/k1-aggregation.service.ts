import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type { K1AggregationResult } from '@ghostfolio/common/interfaces';

import { HttpException, Injectable } from '@nestjs/common';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import { CellMappingService } from '../cell-mapping/cell-mapping.service';

/**
 * Service for computing dynamic aggregation totals
 * from CellAggregationRule records.
 * FR-034, FR-039: Computed dynamically, only rules persisted.
 */
@Injectable()
export class K1AggregationService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly cellMappingService: CellMappingService
  ) {}

  /**
   * Compute aggregation results for a set of extracted/verified fields.
   * Used during verification (live recalculation on cell edit) and
   * after confirmation.
   */
  public async computeFromFields(
    fields: Array<{ boxNumber: string; numericValue: number | null }>,
    partnershipId?: string
  ): Promise<K1AggregationResult[]> {
    const rules =
      await this.cellMappingService.getAggregationRules(partnershipId);

    return rules.map((rule) => {
      const sourceCells = (rule.sourceCells as string[]) || [];
      const breakdown: Record<string, number> = {};
      let computedValue = 0;

      for (const boxNumber of sourceCells) {
        const field = fields.find((f) => f.boxNumber === boxNumber);
        const value = field?.numericValue ?? 0;
        breakdown[boxNumber] = value;

        if (rule.operation === 'SUM') {
          computedValue += value;
        }
      }

      return {
        ruleId: rule.id,
        name: rule.name,
        operation: rule.operation,
        sourceCells,
        computedValue,
        breakdown
      };
    });
  }

  /**
   * Compute aggregation results for a KDocument (stored box values).
   * GET /aggregation-rules/compute
   */
  public async computeForKDocument(
    kDocumentId: string,
    partnershipId?: string
  ): Promise<K1AggregationResult[]> {
    const kDocument = await this.prismaService.kDocument.findUnique({
      where: { id: kDocumentId }
    });

    if (!kDocument) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.NOT_FOUND),
        StatusCodes.NOT_FOUND
      );
    }

    // Extract box values from the KDocument data
    const data = (kDocument.data as any) || {};
    const fields: Array<{ boxNumber: string; numericValue: number | null }> =
      [];

    // kDocument.data stores box values as { "1": 50000, "9a": -1200, ... }
    for (const [boxNumber, value] of Object.entries(data)) {
      fields.push({
        boxNumber,
        numericValue: typeof value === 'number' ? value : null
      });
    }

    return this.computeFromFields(
      fields,
      partnershipId || kDocument.partnershipId
    );
  }
}
