import { FamilyOfficePerformanceCalculator } from '@ghostfolio/api/app/portfolio/calculator/family-office/performance-calculator';
import {
  BenchmarkComparison,
  FamilyOfficeBenchmarkService
} from '@ghostfolio/api/services/benchmark/family-office-benchmark.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type {
  IFamilyOfficeDashboard,
  IFamilyOfficeReport
} from '@ghostfolio/common/interfaces';

import { HttpException, Injectable, Logger } from '@nestjs/common';
import Big from 'big.js';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

@Injectable()
export class FamilyOfficeService {
  private readonly logger = new Logger(FamilyOfficeService.name);

  public constructor(
    private readonly familyOfficeBenchmarkService: FamilyOfficeBenchmarkService,
    private readonly prismaService: PrismaService
  ) {}

  /**
   * Generate a consolidated periodic report for a user's family office.
   * Optionally scoped to a single entity.
   */
  public async generateReport({
    benchmarkIds,
    entityId,
    period,
    periodNumber,
    userId,
    year
  }: {
    benchmarkIds?: string[];
    entityId?: string;
    period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    periodNumber?: number;
    userId: string;
    year: number;
  }): Promise<IFamilyOfficeReport> {
    // Validate period parameters
    if (period === 'MONTHLY' && periodNumber !== undefined) {
      if (periodNumber < 1 || periodNumber > 12) {
        throw new HttpException(
          'periodNumber must be between 1 and 12 for MONTHLY period',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    if (period === 'QUARTERLY' && periodNumber !== undefined) {
      if (periodNumber < 1 || periodNumber > 4) {
        throw new HttpException(
          'periodNumber must be between 1 and 4 for QUARTERLY period',
          StatusCodes.BAD_REQUEST
        );
      }
    }

    if (year < 1900 || year > 2100) {
      throw new HttpException(
        'year must be between 1900 and 2100',
        StatusCodes.BAD_REQUEST
      );
    }

    const { endDate, startDate } = this.computePeriodDates({
      period,
      periodNumber,
      year
    });

    const ytdStart = new Date(year, 0, 1);

    // Determine report title
    let periodLabel: string;

    if (period === 'MONTHLY') {
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
      ];
      periodLabel = `${monthNames[(periodNumber ?? 1) - 1]} ${year}`;
    } else if (period === 'QUARTERLY') {
      periodLabel = `Q${periodNumber ?? 1} ${year}`;
    } else {
      periodLabel = `${year}`;
    }

    // Entity scope
    let entityInfo: { id: string; name: string } | undefined;

    if (entityId) {
      const entity = await this.prismaService.entity.findFirst({
        where: { id: entityId, userId }
      });

      if (!entity) {
        throw new HttpException(
          getReasonPhrase(StatusCodes.NOT_FOUND),
          StatusCodes.NOT_FOUND
        );
      }

      entityInfo = { id: entity.id, name: entity.name };
    }

    // Get all user partnerships (scoped by entity if provided)
    const partnerships = await this.getUserPartnerships({
      entityId,
      userId
    });

    // Compute value at period start and end
    const totalValueStart = await this.computeAggregateNav({
      asOfDate: startDate,
      partnerships
    });

    const totalValueEnd = await this.computeAggregateNav({
      asOfDate: endDate,
      partnerships
    });

    const periodChange = new Big(totalValueEnd)
      .minus(totalValueStart)
      .toNumber();
    const periodChangePercent =
      totalValueStart > 0
        ? new Big(periodChange).div(totalValueStart).round(4).toNumber()
        : 0;

    // YTD change
    const totalValueYtdStart = await this.computeAggregateNav({
      asOfDate: ytdStart,
      partnerships
    });

    const ytdChange = new Big(totalValueEnd)
      .minus(totalValueYtdStart)
      .toNumber();
    const ytdChangePercent =
      totalValueYtdStart > 0
        ? new Big(ytdChange).div(totalValueYtdStart).round(4).toNumber()
        : 0;

    // Asset allocation by asset type across all partnership assets
    const assetAllocation = await this.computeAssetAllocation({
      partnerships
    });

    // Partnership performance
    const partnershipPerformance = await this.computePartnershipPerformance({
      endDate,
      partnerships,
      startDate,
      userId
    });

    // Distribution summary for the period
    const distributionSummary = await this.computeDistributionSummary({
      endDate,
      entityId,
      startDate,
      userId
    });

    // Benchmark comparisons
    let benchmarkComparisons: BenchmarkComparison[] | undefined;

    if (benchmarkIds && benchmarkIds.length > 0) {
      // Compute overall portfolio return for the period
      const overallReturn = periodChangePercent;

      benchmarkComparisons =
        await this.familyOfficeBenchmarkService.computeBenchmarkComparisons({
          benchmarkIds,
          endDate,
          partnershipReturn: overallReturn,
          startDate
        });
    }

    return {
      assetAllocation,
      benchmarkComparisons,
      distributionSummary,
      entity: entityInfo,
      partnershipPerformance,
      period: {
        end: endDate.toISOString().split('T')[0],
        start: startDate.toISOString().split('T')[0]
      },
      reportTitle: `${periodLabel} Family Office Report`,
      summary: {
        periodChange: Math.round(periodChange * 100) / 100,
        periodChangePercent,
        totalValueEnd: Math.round(totalValueEnd * 100) / 100,
        totalValueStart: Math.round(totalValueStart * 100) / 100,
        ytdChangePercent
      }
    };
  }

  /**
   * Get consolidated dashboard data for the family office.
   */
  public async getDashboard({
    userId
  }: {
    userId: string;
  }): Promise<IFamilyOfficeDashboard> {
    // Count entities and partnerships
    const entities = await this.prismaService.entity.findMany({
      where: { userId },
      include: {
        memberships: {
          where: { endDate: null },
          include: {
            partnership: {
              include: {
                valuations: {
                  orderBy: { date: 'desc' },
                  take: 1
                },
                assets: {
                  include: {
                    valuations: {
                      orderBy: { date: 'desc' },
                      take: 1
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    const partnerships = await this.prismaService.partnership.findMany({
      where: { userId }
    });

    // Compute AUM by entity
    const allocationByEntity: IFamilyOfficeDashboard['allocationByEntity'] = [];
    let totalAum = new Big(0);

    for (const entity of entities) {
      let entityValue = new Big(0);

      for (const membership of entity.memberships) {
        const latestNav = membership.partnership.valuations[0]
          ? Number(membership.partnership.valuations[0].nav)
          : 0;
        const ownershipPct = Number(membership.ownershipPercent);
        const allocatedValue = new Big(latestNav).times(ownershipPct).div(100);
        entityValue = entityValue.plus(allocatedValue);
      }

      if (entityValue.gt(0)) {
        allocationByEntity.push({
          entityId: entity.id,
          entityName: entity.name,
          percentage: 0, // Will compute after totals
          value: entityValue.round(2).toNumber()
        });
      }

      totalAum = totalAum.plus(entityValue);
    }

    // Compute percentages
    const totalAumNumber = totalAum.round(2).toNumber();

    for (const allocation of allocationByEntity) {
      allocation.percentage =
        totalAumNumber > 0
          ? new Big(allocation.value)
              .div(totalAumNumber)
              .times(100)
              .round(1)
              .toNumber()
          : 0;
    }

    // Allocation by asset class — from partnership assets
    const allAssets = await this.prismaService.partnershipAsset.findMany({
      where: {
        partnership: { userId }
      },
      include: {
        valuations: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    });

    const assetClassMap = new Map<string, Big>();

    for (const asset of allAssets) {
      const value = asset.valuations[0]
        ? new Big(Number(asset.valuations[0].value))
        : asset.currentValue
          ? new Big(Number(asset.currentValue))
          : new Big(0);
      const assetType = asset.assetType;
      const current = assetClassMap.get(assetType) ?? new Big(0);
      assetClassMap.set(assetType, current.plus(value));
    }

    const allocationByAssetClass: IFamilyOfficeDashboard['allocationByAssetClass'] =
      [];
    const totalAssetValue = Array.from(assetClassMap.values()).reduce(
      (sum, v) => sum.plus(v),
      new Big(0)
    );

    for (const [assetClass, value] of assetClassMap) {
      allocationByAssetClass.push({
        assetClass,
        percentage: totalAssetValue.gt(0)
          ? value.div(totalAssetValue).times(100).round(1).toNumber()
          : 0,
        value: value.round(2).toNumber()
      });
    }

    // Allocation by structure type (entity type)
    const structureMap = new Map<string, Big>();

    for (const entity of entities) {
      let entityValue = new Big(0);

      for (const membership of entity.memberships) {
        const latestNav = membership.partnership.valuations[0]
          ? Number(membership.partnership.valuations[0].nav)
          : 0;
        const ownershipPct = Number(membership.ownershipPercent);
        entityValue = entityValue.plus(
          new Big(latestNav).times(ownershipPct).div(100)
        );
      }

      const current = structureMap.get(entity.type) ?? new Big(0);
      structureMap.set(entity.type, current.plus(entityValue));
    }

    const allocationByStructure: IFamilyOfficeDashboard['allocationByStructure'] =
      [];

    for (const [structureType, value] of structureMap) {
      if (value.gt(0)) {
        allocationByStructure.push({
          percentage: totalAum.gt(0)
            ? value.div(totalAum).times(100).round(1).toNumber()
            : 0,
          structureType,
          value: value.round(2).toNumber()
        });
      }
    }

    // Recent distributions (last 5)
    const userEntityIds = entities.map((e) => e.id);

    const recentDistributions = await this.prismaService.distribution.findMany({
      include: {
        partnership: { select: { name: true } }
      },
      orderBy: { date: 'desc' },
      take: 5,
      where: {
        entityId: { in: userEntityIds }
      }
    });

    // K-document status for current tax year
    const currentYear = new Date().getFullYear();

    const kDocuments = await this.prismaService.kDocument.findMany({
      where: {
        partnership: { userId },
        taxYear: currentYear
      }
    });

    const kDocumentStatus = {
      draft: kDocuments.filter((k) => k.filingStatus === 'DRAFT').length,
      estimated: kDocuments.filter((k) => k.filingStatus === 'ESTIMATED')
        .length,
      final: kDocuments.filter((k) => k.filingStatus === 'FINAL').length,
      taxYear: currentYear,
      total: kDocuments.length
    };

    return {
      allocationByAssetClass,
      allocationByEntity,
      allocationByStructure,
      currency: 'USD',
      entitiesCount: entities.length,
      kDocumentStatus,
      partnershipsCount: partnerships.length,
      recentDistributions: recentDistributions.map((d) => ({
        amount: Number(d.amount),
        date: d.date.toISOString().split('T')[0],
        id: d.id,
        partnershipName: d.partnership?.name ?? 'N/A',
        type: d.type
      })),
      totalAum: totalAumNumber
    };
  }

  // --- Private helpers ---

  private computePeriodDates({
    period,
    periodNumber,
    year
  }: {
    period: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    periodNumber?: number;
    year: number;
  }): { endDate: Date; startDate: Date } {
    if (period === 'MONTHLY') {
      const month = (periodNumber ?? 1) - 1; // 0-indexed
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0); // Last day of month
      return { endDate, startDate };
    }

    if (period === 'QUARTERLY') {
      const quarter = periodNumber ?? 1;
      const startMonth = (quarter - 1) * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0);
      return { endDate, startDate };
    }

    // YEARLY
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    return { endDate, startDate };
  }

  private async getUserPartnerships({
    entityId,
    userId
  }: {
    entityId?: string;
    userId: string;
  }) {
    if (entityId) {
      // Get partnerships where this entity is a member
      const memberships =
        await this.prismaService.partnershipMembership.findMany({
          include: {
            partnership: true
          },
          where: {
            endDate: null,
            entityId,
            partnership: { userId }
          }
        });

      return memberships.map((m) => m.partnership);
    }

    return this.prismaService.partnership.findMany({
      where: { userId }
    });
  }

  private async computeAggregateNav({
    asOfDate,
    partnerships
  }: {
    asOfDate: Date;
    partnerships: { id: string }[];
  }): Promise<number> {
    let total = new Big(0);

    for (const partnership of partnerships) {
      const valuation = await this.prismaService.partnershipValuation.findFirst(
        {
          orderBy: { date: 'desc' },
          where: {
            date: { lte: asOfDate },
            partnershipId: partnership.id
          }
        }
      );

      if (valuation) {
        total = total.plus(Number(valuation.nav));
      }
    }

    return total.toNumber();
  }

  private async computeAssetAllocation({
    partnerships
  }: {
    partnerships: { id: string }[];
  }): Promise<Record<string, { value: number; percentage: number }>> {
    const partnershipIds = partnerships.map((p) => p.id);

    const assets = await this.prismaService.partnershipAsset.findMany({
      include: {
        valuations: {
          orderBy: { date: 'desc' },
          take: 1
        }
      },
      where: {
        partnershipId: { in: partnershipIds }
      }
    });

    const typeMap = new Map<string, Big>();
    let totalValue = new Big(0);

    for (const asset of assets) {
      const value = asset.valuations[0]
        ? new Big(Number(asset.valuations[0].value))
        : asset.currentValue
          ? new Big(Number(asset.currentValue))
          : new Big(0);

      const current = typeMap.get(asset.assetType) ?? new Big(0);
      typeMap.set(asset.assetType, current.plus(value));
      totalValue = totalValue.plus(value);
    }

    const result: Record<string, { value: number; percentage: number }> = {};

    for (const [assetType, value] of typeMap) {
      result[assetType] = {
        percentage: totalValue.gt(0)
          ? value.div(totalValue).times(100).round(1).toNumber()
          : 0,
        value: value.round(2).toNumber()
      };
    }

    return result;
  }

  private async computePartnershipPerformance({
    endDate,
    partnerships,
    startDate,
    userId
  }: {
    endDate: Date;
    partnerships: { id: string; name?: string }[];
    startDate: Date;
    userId: string;
  }) {
    const results: IFamilyOfficeReport['partnershipPerformance'] = [];

    for (const partnership of partnerships) {
      try {
        const p = await this.prismaService.partnership.findFirst({
          include: {
            distributions: true,
            members: {
              where: { endDate: null }
            },
            valuations: {
              orderBy: { date: 'asc' }
            }
          },
          where: { id: partnership.id, userId }
        });

        if (!p) {
          continue;
        }

        const valuations = p.valuations
          .filter((v) => v.date >= startDate && v.date <= endDate)
          .map((v) => ({ date: v.date, nav: Number(v.nav) }));

        const totalContributions = p.members.reduce(
          (sum, m) => sum + Number(m.capitalContributed || 0),
          0
        );

        const totalDistributions = p.distributions.reduce(
          (sum, d) => sum + Number(d.amount),
          0
        );

        const latestNav =
          valuations.length > 0 ? valuations[valuations.length - 1].nav : 0;

        // Cash flows for XIRR
        const cashFlows = [
          ...(totalContributions > 0
            ? [{ amount: -totalContributions, date: p.inceptionDate }]
            : []),
          ...p.distributions.map((d) => ({
            amount: Number(d.amount),
            date: d.date
          })),
          ...(valuations.length > 0
            ? [
                {
                  amount: latestNav,
                  date: valuations[valuations.length - 1].date
                }
              ]
            : [])
        ];

        const irr = FamilyOfficePerformanceCalculator.computeXIRR(cashFlows);
        const tvpi = FamilyOfficePerformanceCalculator.computeTVPI(
          totalDistributions,
          latestNav,
          totalContributions
        );
        const dpi = FamilyOfficePerformanceCalculator.computeDPI(
          totalDistributions,
          totalContributions
        );

        // Period return via Modified Dietz if we have start/end valuations
        let periodReturn = 0;

        if (valuations.length >= 2) {
          const periods = [
            {
              cashFlows: p.distributions
                .filter((d) => d.date >= startDate && d.date <= endDate)
                .map((d) => ({ amount: Number(d.amount), date: d.date })),
              endDate: valuations[valuations.length - 1].date,
              endValue: valuations[valuations.length - 1].nav,
              startDate: valuations[0].date,
              startValue: valuations[0].nav
            }
          ];

          const returns =
            FamilyOfficePerformanceCalculator.computeModifiedDietzReturns(
              periods
            );
          periodReturn = returns[0]?.return ?? 0;
        }

        results.push({
          dpi,
          irr: irr !== null ? Math.round(irr * 10000) / 10000 : 0,
          partnershipId: p.id,
          partnershipName: p.name,
          periodReturn,
          tvpi
        });
      } catch (error) {
        this.logger.warn(
          `Failed to compute performance for partnership ${partnership.id}: ${error.message}`
        );
      }
    }

    return results;
  }

  private async computeDistributionSummary({
    endDate,
    entityId,
    startDate,
    userId
  }: {
    endDate: Date;
    entityId?: string;
    startDate: Date;
    userId: string;
  }): Promise<IFamilyOfficeReport['distributionSummary']> {
    const userEntities = await this.prismaService.entity.findMany({
      select: { id: true },
      where: { userId }
    });
    const entityIds = entityId ? [entityId] : userEntities.map((e) => e.id);

    const distributions = await this.prismaService.distribution.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        },
        entityId: { in: entityIds }
      }
    });

    const periodTotal = distributions.reduce(
      (sum, d) => sum + Number(d.amount),
      0
    );

    const byType: Record<string, number> = {};

    for (const d of distributions) {
      byType[d.type] = (byType[d.type] || 0) + Number(d.amount);
    }

    return {
      byType,
      periodTotal: Math.round(periodTotal * 100) / 100
    };
  }
}
