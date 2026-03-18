import { FamilyOfficePerformanceCalculator } from '@ghostfolio/api/app/portfolio/calculator/family-office/performance-calculator';
import {
  BenchmarkComparison,
  FamilyOfficeBenchmarkService
} from '@ghostfolio/api/services/benchmark/family-office-benchmark.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import {
  getFamilyOfficeAssetTypeLabel
} from '@ghostfolio/common/helper';
import type {
  IActivityDetail,
  IActivityRow,
  IAssetClassSummary,
  IFamilyOfficeDashboard,
  IFamilyOfficeReport,
  IPerformanceRow,
  IPortfolioSummary
} from '@ghostfolio/common/interfaces';
import type { K1Data } from '@ghostfolio/common/interfaces';

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

  // --- Portfolio Performance Views ---

  /**
   * T015: Get portfolio summary — entity-level rollup of performance metrics.
   * Supports optional quarterly granularity.
   */
  public async getPortfolioSummary({
    quarter,
    userId,
    valuationYear
  }: {
    quarter?: number;
    userId: string;
    valuationYear: number;
  }): Promise<IPortfolioSummary> {
    const yearEnd = this.computeValuationEndDate(valuationYear, quarter);

    const entities = await this.prismaService.entity.findMany({
      include: {
        memberships: {
          include: {
            partnership: {
              include: {
                distributions: {
                  where: { date: { lte: yearEnd } }
                },
                valuations: {
                  orderBy: { date: 'desc' },
                  where: { date: { lte: yearEnd } },
                  take: 1
                }
              }
            }
          },
          where: { endDate: null }
        }
      },
      where: { userId }
    });

    const entityRows = entities.map((entity) => {
      const row = this.computePerformanceRowForMemberships({
        memberships: entity.memberships,
        yearEnd
      });

      return {
        ...row,
        entityId: entity.id,
        entityName: entity.name
      };
    });

    const totals = this.aggregatePerformanceRows(
      entityRows
    );

    return {
      entities: entityRows,
      quarter,
      totals,
      valuationYear
    };
  }

  /**
   * T024: Get asset class summary — group partnerships by dominant asset type.
   * Supports optional quarterly granularity.
   */
  public async getAssetClassSummary({
    quarter,
    userId,
    valuationYear
  }: {
    quarter?: number;
    userId: string;
    valuationYear: number;
  }): Promise<IAssetClassSummary> {
    const yearEnd = this.computeValuationEndDate(valuationYear, quarter);

    // Load all memberships with partnership details
    const memberships =
      await this.prismaService.partnershipMembership.findMany({
        include: {
          entity: true,
          partnership: {
            include: {
              assets: true,
              distributions: {
                where: { date: { lte: yearEnd } }
              },
              valuations: {
                orderBy: { date: 'desc' },
                take: 1,
                where: { date: { lte: yearEnd } }
              }
            }
          }
        },
        where: {
          endDate: null,
          entity: { userId }
        }
      });

    // Group memberships by partnership asset class
    const groupedByAssetClass = new Map<
      string,
      typeof memberships
    >();

    for (const membership of memberships) {
      const assetClass = this.determinePartnershipAssetClass(
        membership.partnership.assets
      );

      if (!groupedByAssetClass.has(assetClass)) {
        groupedByAssetClass.set(assetClass, []);
      }

      groupedByAssetClass.get(assetClass)!.push(membership);
    }

    const assetClassRows = Array.from(groupedByAssetClass.entries()).map(
      ([assetClass, classMemberships]) => {
        const row = this.computePerformanceRowForMemberships({
          memberships: classMemberships as any,
          yearEnd
        });

        return {
          ...row,
          assetClass,
          assetClassLabel: getFamilyOfficeAssetTypeLabel(
            assetClass as unknown as any
          )
        };
      }
    );

    const totals = this.aggregatePerformanceRows(
      assetClassRows
    );

    return {
      assetClasses: assetClassRows,
      quarter,
      totals,
      valuationYear
    };
  }

  /**
   * T032: Get activity detail — per entity/partnership/year K-1 ledger.
   */
  public async getActivity({
    entityId,
    partnershipId,
    skip = 0,
    take = 50,
    userId,
    year
  }: {
    entityId?: string;
    partnershipId?: string;
    skip?: number;
    take?: number;
    userId: string;
    year?: number;
  }): Promise<IActivityDetail> {
    if (take > 200) {
      take = 200;
    }

    // Get all user entities
    const userEntities = await this.prismaService.entity.findMany({
      select: { id: true, name: true },
      where: { userId }
    });

    const entityIds = entityId
      ? [entityId]
      : userEntities.map((e) => e.id);

    // Get memberships linking entities to partnerships
    const membershipWhere: any = {
      endDate: null,
      entityId: { in: entityIds }
    };

    if (partnershipId) {
      membershipWhere.partnershipId = partnershipId;
    }

    const memberships =
      await this.prismaService.partnershipMembership.findMany({
        include: {
          entity: { select: { id: true, name: true } },
          partnership: {
            select: { id: true, name: true }
          }
        },
        where: membershipWhere
      });

    // Get K-documents for the relevant partnerships
    const partnershipIds = [
      ...new Set(memberships.map((m) => m.partnershipId))
    ];

    const kDocWhere: any = {
      partnershipId: { in: partnershipIds },
      type: 'K1'
    };

    if (year) {
      kDocWhere.taxYear = year;
    }

    const kDocuments = await this.prismaService.kDocument.findMany({
      where: kDocWhere
    });

    // Get distributions for relevant entities and partnerships
    const distWhere: any = {
      entityId: { in: entityIds }
    };

    if (partnershipId) {
      distWhere.partnershipId = partnershipId;
    }

    const distributions = await this.prismaService.distribution.findMany({
      where: distWhere
    });

    // Build activity rows
    const rows: IActivityRow[] = [];

    // Index K-docs by partnershipId+taxYear
    const kDocIndex = new Map<string, typeof kDocuments[0]>();

    for (const kDoc of kDocuments) {
      kDocIndex.set(`${kDoc.partnershipId}_${kDoc.taxYear}`, kDoc);
    }

    // Collect all unique years from K-docs and distributions
    const allYears = new Set<number>();

    for (const kDoc of kDocuments) {
      allYears.add(kDoc.taxYear);
    }

    for (const dist of distributions) {
      allYears.add(dist.date.getFullYear());
    }

    const sortedYears = [...allYears].sort((a, b) => b - a);
    const targetYears = year ? [year] : sortedYears;

    for (const membership of memberships) {
      for (const taxYear of targetYears) {
        const kDoc = kDocIndex.get(
          `${membership.partnershipId}_${taxYear}`
        );

        // Sum distributions for this entity+partnership+year
        const yearDistributions = distributions.filter(
          (d) =>
            d.entityId === membership.entityId &&
            d.partnershipId === membership.partnershipId &&
            d.date.getFullYear() === taxYear
        );

        const distributionTotal = yearDistributions.reduce(
          (sum, d) => sum + Number(d.amount),
          0
        );

        // If no K-doc and no distributions for this combination, skip
        if (!kDoc && yearDistributions.length === 0) {
          continue;
        }

        const k1Data = (kDoc?.data as unknown as K1Data) ?? null;

        const income = this.mapK1DataToIncomeComponents(k1Data);
        const beginningBasis = k1Data?.beginningTaxBasis ?? 0;
        const contributions =
          taxYear === new Date(membership.effectiveDate).getFullYear()
            ? Number(membership.capitalContributed || 0)
            : 0;
        const otherAdj = k1Data?.otherAdjustments ?? 0;
        const endingTaxBasis = k1Data?.endingTaxBasis ?? 0;
        const endingGLBalance = k1Data?.endingGLBalance ?? null;
        const k1CapitalAccount = k1Data?.k1CapitalAccount ?? null;

        const derived = this.computeActivityDerivedFields({
          beginningBasis,
          contributions,
          distributions: distributionTotal,
          endingGLBalance,
          endingTaxBasis,
          k1CapitalAccount,
          otherAdjustments: otherAdj,
          totalIncome: income.totalIncome
        });

        rows.push({
          beginningBasis,
          bookToTaxAdj: derived.bookToTaxAdj,
          capitalGains: income.capitalGains,
          contributions,
          deltaEndingBasis: derived.deltaEndingBasis,
          distributions: distributionTotal,
          dividends: income.dividends,
          endingGLBalance,
          endingK1CapitalAccount: k1CapitalAccount,
          endingTaxBasis,
          entityId: membership.entityId,
          entityName: membership.entity.name,
          excessDistribution: derived.excessDistribution,
          interest: income.interest,
          k1CapitalVsTaxBasisDiff: derived.k1CapitalVsTaxBasisDiff,
          negativeBasis: derived.negativeBasis,
          notes: k1Data?.activityNotes ?? null,
          otherAdjustments: otherAdj,
          partnershipId: membership.partnershipId,
          partnershipName: membership.partnership.name,
          remainingK1IncomeDed: income.remainingK1IncomeDed,
          totalIncome: income.totalIncome,
          year: taxYear
        });
      }
    }

    // Sort by year desc, then entity name, then partnership name
    rows.sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }

      if (a.entityName !== b.entityName) {
        return a.entityName.localeCompare(b.entityName);
      }

      return a.partnershipName.localeCompare(b.partnershipName);
    });

    const totalCount = rows.length;
    const paginatedRows = rows.slice(skip, skip + take);

    // Build filter options
    const entityMap = new Map<string, string>();
    const partnershipMap = new Map<string, string>();
    const yearSet = new Set<number>();

    for (const row of rows) {
      entityMap.set(row.entityId, row.entityName);
      partnershipMap.set(row.partnershipId, row.partnershipName);
      yearSet.add(row.year);
    }

    return {
      filters: {
        entities: [...entityMap.entries()].map(([id, name]) => ({
          id,
          name
        })),
        partnerships: [...partnershipMap.entries()].map(([id, name]) => ({
          id,
          name
        })),
        years: [...yearSet].sort((a, b) => b - a)
      },
      rows: paginatedRows,
      totalCount
    };
  }

  // --- Private helpers ---

  /**
   * T009: Determine partnership's dominant asset class from its assets.
   */
  private determinePartnershipAssetClass(
    assets: { assetType: string }[]
  ): string {
    if (!assets || assets.length === 0) {
      return 'OTHER';
    }

    const typeCounts = new Map<string, number>();

    for (const asset of assets) {
      typeCounts.set(
        asset.assetType,
        (typeCounts.get(asset.assetType) ?? 0) + 1
      );
    }

    let dominantType = 'OTHER';
    let maxCount = 0;

    for (const [assetType, count] of typeCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantType = assetType;
      }
    }

    return dominantType;
  }

  /**
   * T010/T011: Compute IPerformanceRow from a set of memberships.
   */
  private computePerformanceRowForMemberships({
    memberships
  }: {
    memberships: {
      capitalCommitment: any;
      capitalContributed: any;
      effectiveDate: Date;
      ownershipPercent: any;
      partnership: {
        distributions: { amount: any; date: Date }[];
        valuations: { nav: any; date: Date }[];
      };
    }[];
    yearEnd: Date;
  }): IPerformanceRow {
    let totalCommitment = new Big(0);
    let totalPaidIn = new Big(0);
    let totalDistributions = new Big(0);
    let totalResidual = new Big(0);

    const allCashFlows: { amount: number; date: Date }[] = [];

    for (const membership of memberships) {
      const commitment = new Big(Number(membership.capitalCommitment || 0));
      const contributed = new Big(Number(membership.capitalContributed || 0));
      const ownershipPct = new Big(Number(membership.ownershipPercent || 0));

      totalCommitment = totalCommitment.plus(commitment);
      totalPaidIn = totalPaidIn.plus(contributed);

      // Distributions through year-end
      const distTotal = membership.partnership.distributions.reduce(
        (sum, d) => sum.plus(Number(d.amount)),
        new Big(0)
      );

      totalDistributions = totalDistributions.plus(distTotal);

      // Latest NAV × ownership%
      const latestValuation = membership.partnership.valuations[0];
      const nav = latestValuation ? Number(latestValuation.nav) : 0;
      const allocatedNav = new Big(nav)
        .times(ownershipPct)
        .div(100);
      totalResidual = totalResidual.plus(allocatedNav);

      // Build cash flows for XIRR
      if (contributed.gt(0)) {
        allCashFlows.push({
          amount: -contributed.toNumber(),
          date: membership.effectiveDate
        });
      }

      for (const dist of membership.partnership.distributions) {
        allCashFlows.push({
          amount: Number(dist.amount),
          date: dist.date
        });
      }

      // Terminal NAV entry
      if (latestValuation && allocatedNav.gt(0)) {
        allCashFlows.push({
          amount: allocatedNav.toNumber(),
          date: latestValuation.date
        });
      }
    }

    const paidInNum = totalPaidIn.toNumber();
    const distNum = totalDistributions.toNumber();
    const residualNum = totalResidual.round(2).toNumber();
    const commitmentNum = totalCommitment.toNumber();

    const percentCalled =
      commitmentNum > 0
        ? new Big(paidInNum).div(commitmentNum).times(100).round(2).toNumber()
        : null;

    const dpi = FamilyOfficePerformanceCalculator.computeDPI(
      distNum,
      paidInNum
    );
    const rvpi = FamilyOfficePerformanceCalculator.computeRVPI(
      residualNum,
      paidInNum
    );
    const tvpi = FamilyOfficePerformanceCalculator.computeTVPI(
      distNum,
      residualNum,
      paidInNum
    );
    const irr = FamilyOfficePerformanceCalculator.computeXIRR(allCashFlows);

    return {
      distributions: Math.round(distNum * 100) / 100,
      dpi,
      irr,
      originalCommitment: Math.round(commitmentNum * 100) / 100,
      paidIn: Math.round(paidInNum * 100) / 100,
      percentCalled,
      residualUsed: residualNum,
      rvpi,
      tvpi,
      unfundedCommitment: Math.round(
        new Big(commitmentNum).minus(paidInNum).toNumber() * 100
      ) / 100
    };
  }

  /**
   * Build aggregate totals row from individual performance rows.
   */
  private aggregatePerformanceRows(
    rows: IPerformanceRow[]
  ): IPerformanceRow {
    if (rows.length === 0) {
      return {
        distributions: 0,
        dpi: 0,
        irr: null,
        originalCommitment: 0,
        paidIn: 0,
        percentCalled: null,
        residualUsed: 0,
        rvpi: 0,
        tvpi: 0,
        unfundedCommitment: 0
      };
    }

    const totalCommitment = rows.reduce(
      (sum, r) => sum + r.originalCommitment,
      0
    );
    const totalPaidIn = rows.reduce((sum, r) => sum + r.paidIn, 0);
    const totalDist = rows.reduce((sum, r) => sum + r.distributions, 0);
    const totalResidual = rows.reduce((sum, r) => sum + r.residualUsed, 0);

    const percentCalled =
      totalCommitment > 0
        ? Math.round(
            new Big(totalPaidIn)
              .div(totalCommitment)
              .times(100)
              .toNumber() * 100
          ) / 100
        : null;

    return {
      distributions: Math.round(totalDist * 100) / 100,
      dpi: FamilyOfficePerformanceCalculator.computeDPI(
        totalDist,
        totalPaidIn
      ),
      irr: null, // Aggregate XIRR requires re-computation from all cash flows
      originalCommitment: Math.round(totalCommitment * 100) / 100,
      paidIn: Math.round(totalPaidIn * 100) / 100,
      percentCalled,
      residualUsed: Math.round(totalResidual * 100) / 100,
      rvpi: FamilyOfficePerformanceCalculator.computeRVPI(
        totalResidual,
        totalPaidIn
      ),
      tvpi: FamilyOfficePerformanceCalculator.computeTVPI(
        totalDist,
        totalResidual,
        totalPaidIn
      ),
      unfundedCommitment: Math.round(
        (totalCommitment - totalPaidIn) * 100
      ) / 100
    };
  }

  /**
   * T012: Map K1Data fields to activity row income components.
   */
  private mapK1DataToIncomeComponents(k1Data: K1Data | null): {
    capitalGains: number;
    dividends: number;
    interest: number;
    remainingK1IncomeDed: number;
    totalIncome: number;
  } {
    if (!k1Data) {
      return {
        capitalGains: 0,
        dividends: 0,
        interest: 0,
        remainingK1IncomeDed: 0,
        totalIncome: 0
      };
    }

    const interest = k1Data.interestIncome ?? 0;
    const dividends = k1Data.dividends ?? 0;

    const capitalGains =
      (k1Data.capitalGainLossShortTerm ?? 0) +
      (k1Data.capitalGainLossLongTerm ?? 0) +
      (k1Data.unrecaptured1250Gain ?? 0) +
      (k1Data.section1231GainLoss ?? 0);

    const remainingK1IncomeDed =
      (k1Data.ordinaryIncome ?? 0) +
      (k1Data.netRentalIncome ?? 0) +
      (k1Data.otherRentalIncome ?? 0) +
      (k1Data.guaranteedPayments ?? 0) +
      (k1Data.royalties ?? 0) +
      (k1Data.otherIncome ?? 0) +
      (k1Data.selfEmploymentEarnings ?? 0) -
      (k1Data.section179Deduction ?? 0) -
      (k1Data.otherDeductions ?? 0) -
      (k1Data.foreignTaxesPaid ?? 0);

    const totalIncome = interest + dividends + capitalGains + remainingK1IncomeDed;

    return {
      capitalGains: Math.round(capitalGains * 100) / 100,
      dividends: Math.round(dividends * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      remainingK1IncomeDed: Math.round(remainingK1IncomeDed * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100
    };
  }

  /**
   * T013: Compute activity row derived fields.
   */
  private computeActivityDerivedFields({
    beginningBasis,
    contributions,
    distributions,
    endingGLBalance,
    endingTaxBasis,
    k1CapitalAccount,
    otherAdjustments,
    totalIncome
  }: {
    beginningBasis: number;
    contributions: number;
    distributions: number;
    endingGLBalance: number | null;
    endingTaxBasis: number;
    k1CapitalAccount: number | null;
    otherAdjustments: number;
    totalIncome: number;
  }): {
    bookToTaxAdj: number | null;
    deltaEndingBasis: number;
    excessDistribution: number;
    k1CapitalVsTaxBasisDiff: number | null;
    negativeBasis: boolean;
  } {
    const bookToTaxAdj =
      endingGLBalance !== null ? endingGLBalance - endingTaxBasis : null;

    const k1CapitalVsTaxBasisDiff =
      k1CapitalAccount !== null ? k1CapitalAccount - endingTaxBasis : null;

    const excessDistributionCalc =
      distributions -
      (beginningBasis + contributions + totalIncome + otherAdjustments);
    const excessDistribution = Math.max(0, excessDistributionCalc);

    const negativeBasis = endingTaxBasis < 0;
    const deltaEndingBasis = endingTaxBasis - beginningBasis;

    return {
      bookToTaxAdj:
        bookToTaxAdj !== null ? Math.round(bookToTaxAdj * 100) / 100 : null,
      deltaEndingBasis: Math.round(deltaEndingBasis * 100) / 100,
      excessDistribution: Math.round(excessDistribution * 100) / 100,
      k1CapitalVsTaxBasisDiff:
        k1CapitalVsTaxBasisDiff !== null
          ? Math.round(k1CapitalVsTaxBasisDiff * 100) / 100
          : null,
      negativeBasis
    };
  }

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

  /**
   * Compute the end date for a valuation period.
   * If quarter is provided (1-4), returns the last day of that quarter.
   * Otherwise returns Dec 31 of the year.
   */
  private computeValuationEndDate(year: number, quarter?: number): Date {
    if (quarter && quarter >= 1 && quarter <= 4) {
      // Last day of the quarter: Q1=Mar 31, Q2=Jun 30, Q3=Sep 30, Q4=Dec 31
      const endMonth = quarter * 3; // 3,6,9,12
      return new Date(year, endMonth, 0); // Day 0 of next month = last day
    }

    return new Date(year, 11, 31);
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
