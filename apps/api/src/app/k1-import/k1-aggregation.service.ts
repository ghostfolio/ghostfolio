import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type { K1AggregationResult } from '@ghostfolio/common/interfaces';

import { HttpException, Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

import {
  DEFAULT_AGGREGATION_RULES
} from '../k1-box-definition/k1-box-definition.service';

/**
 * Service for computing dynamic aggregation totals from K1LineItem data.
 * Replaces JSON iteration with SQL queries on the normalized K1LineItem table.
 * FR-034, FR-039: Computed dynamically using embedded aggregation rules.
 */
@Injectable()
export class K1AggregationService {
  public constructor(
    private readonly prismaService: PrismaService
  ) {}

  /**
   * Compute aggregation results for a set of extracted/verified fields.
   * Used during verification (live recalculation on cell edit).
   * Works with in-memory field data (not yet persisted to K1LineItem).
   */
  public async computeFromFields(
    fields: Array<{ boxNumber: string; numericValue: number | null }>,
    _partnershipId?: string
  ): Promise<K1AggregationResult[]> {
    return DEFAULT_AGGREGATION_RULES.map((rule, index) => {
      const sourceCells = [...rule.sourceBoxKeys];
      const breakdown: Record<string, number> = {};
      let computedValue = 0;

      for (const boxKey of sourceCells) {
        const field = fields.find((f) => f.boxNumber === boxKey);
        const value = field?.numericValue ?? 0;
        breakdown[boxKey] = value;

        if (rule.operation === 'SUM') {
          computedValue += value;
        }
      }

      return {
        ruleId: `default-${index + 1}`,
        name: rule.name,
        operation: rule.operation,
        sourceCells,
        computedValue,
        breakdown
      };
    });
  }

  /**
   * Compute aggregation results for a KDocument using K1LineItem data.
   * Queries the normalized K1LineItem table instead of iterating JSON.
   */
  public async computeForKDocument(
    kDocumentId: string,
    _partnershipId?: string
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

    // Fetch all active (non-superseded) line items for this document
    const lineItems = await this.prismaService.k1LineItem.findMany({
      where: {
        kDocumentId,
        isSuperseded: false
      },
      select: {
        boxKey: true,
        amount: true
      }
    });

    // Build a map of boxKey → numeric amount
    const amountMap = new Map<string, number>();
    for (const item of lineItems) {
      if (item.amount !== null) {
        amountMap.set(item.boxKey, Number(item.amount));
      }
    }

    return DEFAULT_AGGREGATION_RULES.map((rule, index) => {
      const sourceCells = [...rule.sourceBoxKeys];
      const breakdown: Record<string, number> = {};
      let computedValue = 0;

      for (const boxKey of sourceCells) {
        const value = amountMap.get(boxKey) ?? 0;
        breakdown[boxKey] = value;

        if (rule.operation === 'SUM') {
          computedValue += value;
        }
      }

      return {
        ruleId: `default-${index + 1}`,
        name: rule.name,
        operation: rule.operation,
        sourceCells,
        computedValue,
        breakdown
      };
    });
  }

  /**
   * Compute aggregation results across all KDocuments for a partnership and tax year.
   * Uses SQL GROUP BY on K1LineItem for efficient cross-document aggregation.
   */
  public async computeForPartnership(
    partnershipId: string,
    taxYear: number
  ): Promise<K1AggregationResult[]> {
    // Get all KDocument IDs for this partnership + tax year
    const kDocuments = await this.prismaService.kDocument.findMany({
      where: { partnershipId, taxYear },
      select: { id: true }
    });

    if (kDocuments.length === 0) {
      return DEFAULT_AGGREGATION_RULES.map((rule, index) => ({
        ruleId: `default-${index + 1}`,
        name: rule.name,
        operation: rule.operation,
        sourceCells: [...rule.sourceBoxKeys],
        computedValue: 0,
        breakdown: Object.fromEntries(
          rule.sourceBoxKeys.map((k) => [k, 0])
        )
      }));
    }

    const docIds = kDocuments.map((d) => d.id);

    // Aggregate amounts by boxKey across all documents
    const aggregated = await this.prismaService.k1LineItem.groupBy({
      by: ['boxKey'],
      where: {
        kDocumentId: { in: docIds },
        isSuperseded: false,
        amount: { not: null }
      },
      _sum: { amount: true }
    });

    const amountMap = new Map<string, number>();
    for (const row of aggregated) {
      if (row._sum.amount !== null) {
        amountMap.set(
          row.boxKey,
          row._sum.amount instanceof Decimal
            ? row._sum.amount.toNumber()
            : Number(row._sum.amount)
        );
      }
    }

    return DEFAULT_AGGREGATION_RULES.map((rule, index) => {
      const sourceCells = [...rule.sourceBoxKeys];
      const breakdown: Record<string, number> = {};
      let computedValue = 0;

      for (const boxKey of sourceCells) {
        const value = amountMap.get(boxKey) ?? 0;
        breakdown[boxKey] = value;

        if (rule.operation === 'SUM') {
          computedValue += value;
        }
      }

      return {
        ruleId: `default-${index + 1}`,
        name: rule.name,
        operation: rule.operation,
        sourceCells,
        computedValue,
        breakdown
      };
    });
  }
}
