import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, OnModuleInit } from '@nestjs/common';

/** Default IRS K-1 (Form 1065) cell mappings */
const IRS_DEFAULT_MAPPINGS: Array<{
  boxNumber: string;
  label: string;
  description: string;
  sortOrder: number;
}> = [
  { boxNumber: '1', label: 'Ordinary business income (loss)', description: 'IRS Schedule K-1 Box 1', sortOrder: 1 },
  { boxNumber: '2', label: 'Net rental real estate income (loss)', description: 'IRS Schedule K-1 Box 2', sortOrder: 2 },
  { boxNumber: '3', label: 'Other net rental income (loss)', description: 'IRS Schedule K-1 Box 3', sortOrder: 3 },
  { boxNumber: '4', label: 'Guaranteed payments for services', description: 'IRS Schedule K-1 Box 4', sortOrder: 4 },
  { boxNumber: '4a', label: 'Guaranteed payments for capital', description: 'IRS Schedule K-1 Box 4a', sortOrder: 5 },
  { boxNumber: '4b', label: 'Total guaranteed payments', description: 'IRS Schedule K-1 Box 4b', sortOrder: 6 },
  { boxNumber: '5', label: 'Interest income', description: 'IRS Schedule K-1 Box 5', sortOrder: 7 },
  { boxNumber: '6a', label: 'Ordinary dividends', description: 'IRS Schedule K-1 Box 6a', sortOrder: 8 },
  { boxNumber: '6b', label: 'Qualified dividends', description: 'IRS Schedule K-1 Box 6b', sortOrder: 9 },
  { boxNumber: '6c', label: 'Dividend equivalents', description: 'IRS Schedule K-1 Box 6c', sortOrder: 10 },
  { boxNumber: '7', label: 'Royalties', description: 'IRS Schedule K-1 Box 7', sortOrder: 11 },
  { boxNumber: '8', label: 'Net short-term capital gain (loss)', description: 'IRS Schedule K-1 Box 8', sortOrder: 12 },
  { boxNumber: '9a', label: 'Net long-term capital gain (loss)', description: 'IRS Schedule K-1 Box 9a', sortOrder: 13 },
  { boxNumber: '9b', label: 'Collectibles (28%) gain (loss)', description: 'IRS Schedule K-1 Box 9b', sortOrder: 14 },
  { boxNumber: '9c', label: 'Unrecaptured section 1250 gain', description: 'IRS Schedule K-1 Box 9c', sortOrder: 15 },
  { boxNumber: '10', label: 'Net section 1231 gain (loss)', description: 'IRS Schedule K-1 Box 10', sortOrder: 16 },
  { boxNumber: '11', label: 'Other income (loss)', description: 'IRS Schedule K-1 Box 11', sortOrder: 17 },
  { boxNumber: '12', label: 'Section 179 deduction', description: 'IRS Schedule K-1 Box 12', sortOrder: 18 },
  { boxNumber: '13', label: 'Other deductions', description: 'IRS Schedule K-1 Box 13', sortOrder: 19 },
  { boxNumber: '14', label: 'Self-employment earnings (loss)', description: 'IRS Schedule K-1 Box 14', sortOrder: 20 },
  { boxNumber: '15', label: 'Credits', description: 'IRS Schedule K-1 Box 15', sortOrder: 21 },
  { boxNumber: '16', label: 'Foreign transactions', description: 'IRS Schedule K-1 Box 16', sortOrder: 22 },
  { boxNumber: '17', label: 'Alternative minimum tax (AMT) items', description: 'IRS Schedule K-1 Box 17', sortOrder: 23 },
  { boxNumber: '18', label: 'Tax-exempt income and nondeductible expenses', description: 'IRS Schedule K-1 Box 18', sortOrder: 24 },
  { boxNumber: '19a', label: 'Distributions — Cash and marketable securities', description: 'IRS Schedule K-1 Box 19a', sortOrder: 25 },
  { boxNumber: '19b', label: 'Distributions — Other property', description: 'IRS Schedule K-1 Box 19b', sortOrder: 26 },
  { boxNumber: '20', label: 'Other information', description: 'IRS Schedule K-1 Box 20', sortOrder: 27 },
  { boxNumber: '21', label: 'Foreign taxes paid or accrued', description: 'IRS Schedule K-1 Box 21', sortOrder: 28 }
];

/** Default aggregation rules */
const DEFAULT_AGGREGATION_RULES: Array<{
  name: string;
  operation: string;
  sourceCells: string[];
  sortOrder: number;
}> = [
  {
    name: 'Total Ordinary Income',
    operation: 'SUM',
    sourceCells: ['1'],
    sortOrder: 1
  },
  {
    name: 'Total Capital Gains',
    operation: 'SUM',
    sourceCells: ['8', '9a', '9b', '9c', '10'],
    sortOrder: 2
  },
  {
    name: 'Total Deductions',
    operation: 'SUM',
    sourceCells: ['12', '13'],
    sortOrder: 3
  }
];

@Injectable()
export class CellMappingService implements OnModuleInit {
  public constructor(private readonly prismaService: PrismaService) {}

  public async onModuleInit() {
    await this.seedDefaultMappings();
    await this.seedDefaultAggregationRules();
  }

  /**
   * Seed default IRS cell mappings (partnershipId = null) if they don't exist
   */
  public async seedDefaultMappings() {
    const existingCount = await this.prismaService.cellMapping.count({
      where: { partnershipId: null }
    });

    if (existingCount > 0) {
      return;
    }

    await this.prismaService.cellMapping.createMany({
      data: IRS_DEFAULT_MAPPINGS.map((mapping) => ({
        ...mapping,
        partnershipId: null,
        isCustom: false
      }))
    });
  }

  /**
   * Seed default aggregation rules (partnershipId = null) if they don't exist
   */
  public async seedDefaultAggregationRules() {
    const existingCount = await this.prismaService.cellAggregationRule.count({
      where: { partnershipId: null }
    });

    if (existingCount > 0) {
      return;
    }

    await this.prismaService.cellAggregationRule.createMany({
      data: DEFAULT_AGGREGATION_RULES.map((rule) => ({
        ...rule,
        partnershipId: null
      }))
    });
  }

  /**
   * Get cell mappings for a partnership (with global defaults for unmapped boxes)
   */
  public async getMappings(partnershipId?: string) {
    if (!partnershipId) {
      return this.prismaService.cellMapping.findMany({
        where: { partnershipId: null },
        orderBy: { sortOrder: 'asc' }
      });
    }

    // Get partnership-specific mappings
    const partnershipMappings = await this.prismaService.cellMapping.findMany({
      where: { partnershipId },
      orderBy: { sortOrder: 'asc' }
    });

    // Get global defaults for any boxes not overridden
    const globalMappings = await this.prismaService.cellMapping.findMany({
      where: { partnershipId: null },
      orderBy: { sortOrder: 'asc' }
    });

    const partnershipBoxNumbers = new Set(
      partnershipMappings.map((m) => m.boxNumber)
    );

    const mergedMappings = [
      ...partnershipMappings,
      ...globalMappings.filter((g) => !partnershipBoxNumbers.has(g.boxNumber))
    ];

    return mergedMappings.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get aggregation rules for a partnership (with global defaults)
   */
  public async getAggregationRules(partnershipId?: string) {
    if (!partnershipId) {
      return this.prismaService.cellAggregationRule.findMany({
        where: { partnershipId: null },
        orderBy: { sortOrder: 'asc' }
      });
    }

    const partnershipRules =
      await this.prismaService.cellAggregationRule.findMany({
        where: { partnershipId },
        orderBy: { sortOrder: 'asc' }
      });

    if (partnershipRules.length > 0) {
      return partnershipRules;
    }

    // Fall back to global defaults
    return this.prismaService.cellAggregationRule.findMany({
      where: { partnershipId: null },
      orderBy: { sortOrder: 'asc' }
    });
  }
}
