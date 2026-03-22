import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { HttpException, Injectable, OnModuleInit } from '@nestjs/common';
import { StatusCodes } from 'http-status-codes';

/** Allowed cell types */
type CellType = 'number' | 'string' | 'percentage' | 'boolean';

/** Default IRS K-1 (Form 1065) cell mappings */
const IRS_DEFAULT_MAPPINGS: Array<{
  boxNumber: string;
  label: string;
  description: string;
  cellType: CellType;
  sortOrder: number;
}> = [
  // ── Header / Metadata ──────────────────────────────────────────────────
  { boxNumber: 'K1_DOCUMENT_ID', label: 'K-1 Document ID', description: 'Large-font ID at top right of K-1 form', cellType: 'string', sortOrder: 0 },
  { boxNumber: 'TAX_YEAR', label: 'Tax Year', description: 'Calendar year or tax year beginning/ending', cellType: 'string', sortOrder: 1 },
  { boxNumber: 'FINAL_K1', label: 'Final K-1', description: 'Check if this is a final K-1', cellType: 'boolean', sortOrder: 2 },
  { boxNumber: 'AMENDED_K1', label: 'Amended K-1', description: 'Check if this is an amended K-1', cellType: 'boolean', sortOrder: 3 },

  // ── Part I — Information About the Partnership ─────────────────────────
  { boxNumber: 'A', label: "Partnership's EIN", description: 'Part I, Line A — Employer identification number', cellType: 'string', sortOrder: 10 },
  { boxNumber: 'B', label: "Partnership's name, address, city, state, ZIP", description: 'Part I, Line B', cellType: 'string', sortOrder: 11 },
  { boxNumber: 'C', label: 'IRS center where partnership filed return', description: 'Part I, Line C', cellType: 'string', sortOrder: 12 },
  { boxNumber: 'D', label: 'Publicly traded partnership (PTP)', description: 'Part I, Line D — Check if PTP', cellType: 'boolean', sortOrder: 13 },

  // ── Part II — Information About the Partner ────────────────────────────
  { boxNumber: 'E', label: "Partner's identifying number", description: 'Part II, Line E — SSN or TIN', cellType: 'string', sortOrder: 20 },
  { boxNumber: 'F', label: "Partner's name, address, city, state, ZIP", description: 'Part II, Line F', cellType: 'string', sortOrder: 21 },
  { boxNumber: 'G_GENERAL', label: 'General partner or LLC member-manager', description: 'Part II, Line G — General partner checkbox', cellType: 'boolean', sortOrder: 22 },
  { boxNumber: 'G_LIMITED', label: 'Limited partner or other LLC member', description: 'Part II, Line G — Limited partner checkbox', cellType: 'boolean', sortOrder: 23 },
  { boxNumber: 'H1_DOMESTIC', label: 'Domestic partner', description: 'Part II, Line H1 — Domestic', cellType: 'boolean', sortOrder: 24 },
  { boxNumber: 'H1_FOREIGN', label: 'Foreign partner', description: 'Part II, Line H1 — Foreign', cellType: 'boolean', sortOrder: 25 },
  { boxNumber: 'H2', label: 'Disregarded entity (DE)', description: 'Part II, Line H2 — DE checkbox', cellType: 'boolean', sortOrder: 26 },
  { boxNumber: 'H2_TIN', label: 'Disregarded entity TIN', description: 'Part II, Line H2 — DE taxpayer ID', cellType: 'string', sortOrder: 27 },
  { boxNumber: 'I1', label: 'Type of entity', description: 'Part II, Line I1 — Entity type of partner', cellType: 'string', sortOrder: 28 },
  { boxNumber: 'I2', label: 'Retirement plan (IRA/SEP/Keogh)', description: 'Part II, Line I2 — Retirement plan checkbox', cellType: 'boolean', sortOrder: 29 },

  // ── Section J — Partner's Share of Profit, Loss, and Capital ───────────
  { boxNumber: 'J_PROFIT_BEGIN', label: 'Profit — Beginning %', description: 'Section J — Profit share beginning of year', cellType: 'percentage', sortOrder: 30 },
  { boxNumber: 'J_PROFIT_END', label: 'Profit — Ending %', description: 'Section J — Profit share end of year', cellType: 'percentage', sortOrder: 31 },
  { boxNumber: 'J_LOSS_BEGIN', label: 'Loss — Beginning %', description: 'Section J — Loss share beginning of year', cellType: 'percentage', sortOrder: 32 },
  { boxNumber: 'J_LOSS_END', label: 'Loss — Ending %', description: 'Section J — Loss share end of year', cellType: 'percentage', sortOrder: 33 },
  { boxNumber: 'J_CAPITAL_BEGIN', label: 'Capital — Beginning %', description: 'Section J — Capital share beginning of year', cellType: 'percentage', sortOrder: 34 },
  { boxNumber: 'J_CAPITAL_END', label: 'Capital — Ending %', description: 'Section J — Capital share end of year', cellType: 'percentage', sortOrder: 35 },
  { boxNumber: 'J_SALE', label: 'Decrease due to sale', description: 'Section J — Check if decrease is due to sale', cellType: 'boolean', sortOrder: 36 },
  { boxNumber: 'J_EXCHANGE', label: 'Exchange of partnership interest', description: 'Section J — Check if exchange', cellType: 'boolean', sortOrder: 37 },

  // ── Section K — Partner's Share of Liabilities ─────────────────────────
  { boxNumber: 'K_NONRECOURSE_BEGIN', label: 'Nonrecourse — Beginning', description: 'Section K — Nonrecourse liabilities beginning', cellType: 'number', sortOrder: 40 },
  { boxNumber: 'K_NONRECOURSE_END', label: 'Nonrecourse — Ending', description: 'Section K — Nonrecourse liabilities ending', cellType: 'number', sortOrder: 41 },
  { boxNumber: 'K_QUAL_NONRECOURSE_BEGIN', label: 'Qualified nonrecourse — Beginning', description: 'Section K — Qualified nonrecourse financing beginning', cellType: 'number', sortOrder: 42 },
  { boxNumber: 'K_QUAL_NONRECOURSE_END', label: 'Qualified nonrecourse — Ending', description: 'Section K — Qualified nonrecourse financing ending', cellType: 'number', sortOrder: 43 },
  { boxNumber: 'K_RECOURSE_BEGIN', label: 'Recourse — Beginning', description: 'Section K — Recourse liabilities beginning', cellType: 'number', sortOrder: 44 },
  { boxNumber: 'K_RECOURSE_END', label: 'Recourse — Ending', description: 'Section K — Recourse liabilities ending', cellType: 'number', sortOrder: 45 },
  { boxNumber: 'K2', label: 'Includes lower-tier partnership liabilities', description: 'Section K2 — Checkbox', cellType: 'boolean', sortOrder: 46 },
  { boxNumber: 'K3', label: 'Liability subject to guarantees', description: 'Section K3 — Checkbox', cellType: 'boolean', sortOrder: 47 },

  // ── Section L — Partner's Capital Account Analysis ─────────────────────
  { boxNumber: 'L_BEG_CAPITAL', label: 'Beginning capital account', description: 'Section L — Beginning capital', cellType: 'number', sortOrder: 50 },
  { boxNumber: 'L_CONTRIBUTED', label: 'Capital contributed during year', description: 'Section L — Capital contributed', cellType: 'number', sortOrder: 51 },
  { boxNumber: 'L_CURR_YR_INCOME', label: 'Current year net income (loss)', description: 'Section L — Current year income/loss', cellType: 'number', sortOrder: 52 },
  { boxNumber: 'L_OTHER', label: 'Other increase (decrease)', description: 'Section L — Other adjustments', cellType: 'number', sortOrder: 53 },
  { boxNumber: 'L_WITHDRAWALS', label: 'Withdrawals and distributions', description: 'Section L — Withdrawals/distributions', cellType: 'number', sortOrder: 54 },
  { boxNumber: 'L_END_CAPITAL', label: 'Ending capital account', description: 'Section L — Ending capital', cellType: 'number', sortOrder: 55 },

  // ── Section M — Contributed Property ───────────────────────────────────
  { boxNumber: 'M_YES', label: 'Contributed property with built-in gain/loss — Yes', description: 'Section M — Yes checkbox', cellType: 'boolean', sortOrder: 60 },
  { boxNumber: 'M_NO', label: 'Contributed property with built-in gain/loss — No', description: 'Section M — No checkbox', cellType: 'boolean', sortOrder: 61 },

  // ── Section N — Net Unrecognized Section 704(c) ────────────────────────
  { boxNumber: 'N_BEGINNING', label: 'Net 704(c) gain/loss — Beginning', description: 'Section N — Beginning balance', cellType: 'number', sortOrder: 62 },
  { boxNumber: 'N_ENDING', label: 'Net 704(c) gain/loss — Ending', description: 'Section N — Ending balance', cellType: 'number', sortOrder: 63 },

  // ── Part III — Partner's Share of Current Year Income, Deductions, etc. ─
  { boxNumber: '1', label: 'Ordinary business income (loss)', description: 'IRS Schedule K-1 Box 1', cellType: 'number', sortOrder: 100 },
  { boxNumber: '2', label: 'Net rental real estate income (loss)', description: 'IRS Schedule K-1 Box 2', cellType: 'number', sortOrder: 101 },
  { boxNumber: '3', label: 'Other net rental income (loss)', description: 'IRS Schedule K-1 Box 3', cellType: 'number', sortOrder: 102 },
  { boxNumber: '4', label: 'Guaranteed payments for services', description: 'IRS Schedule K-1 Box 4', cellType: 'number', sortOrder: 103 },
  { boxNumber: '4a', label: 'Guaranteed payments for capital', description: 'IRS Schedule K-1 Box 4a', cellType: 'number', sortOrder: 104 },
  { boxNumber: '4b', label: 'Total guaranteed payments', description: 'IRS Schedule K-1 Box 4b', cellType: 'number', sortOrder: 105 },
  { boxNumber: '5', label: 'Interest income', description: 'IRS Schedule K-1 Box 5', cellType: 'number', sortOrder: 106 },
  { boxNumber: '6a', label: 'Ordinary dividends', description: 'IRS Schedule K-1 Box 6a', cellType: 'number', sortOrder: 107 },
  { boxNumber: '6b', label: 'Qualified dividends', description: 'IRS Schedule K-1 Box 6b', cellType: 'number', sortOrder: 108 },
  { boxNumber: '6c', label: 'Dividend equivalents', description: 'IRS Schedule K-1 Box 6c', cellType: 'number', sortOrder: 109 },
  { boxNumber: '7', label: 'Royalties', description: 'IRS Schedule K-1 Box 7', cellType: 'number', sortOrder: 110 },
  { boxNumber: '8', label: 'Net short-term capital gain (loss)', description: 'IRS Schedule K-1 Box 8', cellType: 'number', sortOrder: 111 },
  { boxNumber: '9a', label: 'Net long-term capital gain (loss)', description: 'IRS Schedule K-1 Box 9a', cellType: 'number', sortOrder: 112 },
  { boxNumber: '9b', label: 'Collectibles (28%) gain (loss)', description: 'IRS Schedule K-1 Box 9b', cellType: 'number', sortOrder: 113 },
  { boxNumber: '9c', label: 'Unrecaptured section 1250 gain', description: 'IRS Schedule K-1 Box 9c', cellType: 'number', sortOrder: 114 },
  { boxNumber: '10', label: 'Net section 1231 gain (loss)', description: 'IRS Schedule K-1 Box 10', cellType: 'number', sortOrder: 115 },
  { boxNumber: '11', label: 'Other income (loss)', description: 'IRS Schedule K-1 Box 11', cellType: 'number', sortOrder: 116 },
  { boxNumber: '12', label: 'Section 179 deduction', description: 'IRS Schedule K-1 Box 12', cellType: 'number', sortOrder: 117 },
  { boxNumber: '13', label: 'Other deductions', description: 'IRS Schedule K-1 Box 13', cellType: 'number', sortOrder: 118 },
  { boxNumber: '14', label: 'Self-employment earnings (loss)', description: 'IRS Schedule K-1 Box 14', cellType: 'number', sortOrder: 119 },
  { boxNumber: '15', label: 'Credits', description: 'IRS Schedule K-1 Box 15', cellType: 'number', sortOrder: 120 },
  { boxNumber: '16', label: 'Foreign transactions', description: 'IRS Schedule K-1 Box 16', cellType: 'number', sortOrder: 121 },
  { boxNumber: '16_K3', label: 'Schedule K-3 is attached', description: 'IRS Schedule K-1 Box 16 K-3 checkbox', cellType: 'boolean', sortOrder: 122 },
  { boxNumber: '17', label: 'Alternative minimum tax (AMT) items', description: 'IRS Schedule K-1 Box 17', cellType: 'number', sortOrder: 123 },
  { boxNumber: '18', label: 'Tax-exempt income and nondeductible expenses', description: 'IRS Schedule K-1 Box 18', cellType: 'number', sortOrder: 124 },
  { boxNumber: '19', label: 'Distributions', description: 'IRS Schedule K-1 Box 19', cellType: 'number', sortOrder: 125 },
  { boxNumber: '19a', label: 'Distributions — Cash and marketable securities', description: 'IRS Schedule K-1 Box 19a', cellType: 'number', sortOrder: 126 },
  { boxNumber: '19b', label: 'Distributions — Other property', description: 'IRS Schedule K-1 Box 19b', cellType: 'number', sortOrder: 127 },
  { boxNumber: '20A', label: 'Other information — Code A', description: 'IRS Schedule K-1 Box 20, Code A', cellType: 'number', sortOrder: 128 },
  { boxNumber: '20B', label: 'Other information — Code B', description: 'IRS Schedule K-1 Box 20, Code B', cellType: 'number', sortOrder: 129 },
  { boxNumber: '20V', label: 'Other information — Code V', description: 'IRS Schedule K-1 Box 20, Code V', cellType: 'number', sortOrder: 130 },
  { boxNumber: '20_WILDCARD', label: 'Other information — Other codes', description: 'IRS Schedule K-1 Box 20, all other codes', cellType: 'number', sortOrder: 131 },
  { boxNumber: '21', label: 'Foreign taxes paid or accrued', description: 'IRS Schedule K-1 Box 21', cellType: 'number', sortOrder: 132 },
  { boxNumber: '22', label: 'More than one activity for at-risk purposes', description: 'IRS Schedule K-1 Box 22 — Checkbox', cellType: 'boolean', sortOrder: 133 },
  { boxNumber: '23', label: 'More than one activity for passive activity purposes', description: 'IRS Schedule K-1 Box 23 — Checkbox', cellType: 'boolean', sortOrder: 134 }
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
   * Seed default IRS cell mappings (partnershipId = null) if they don't exist.
   * Also adds any new default mappings that may have been introduced in updates.
   */
  public async seedDefaultMappings() {
    const existing = await this.prismaService.cellMapping.findMany({
      where: { partnershipId: null }
    });
    const existingBoxNumbers = new Set(existing.map((m) => m.boxNumber));

    const newMappings = IRS_DEFAULT_MAPPINGS.filter(
      (m) => !existingBoxNumbers.has(m.boxNumber)
    );

    if (newMappings.length > 0) {
      await this.prismaService.cellMapping.createMany({
        data: newMappings.map((mapping) => ({
          ...mapping,
          partnershipId: null,
          isCustom: false,
          isIgnored: false,
          cellType: mapping.cellType
        }))
      });
    }

    // Backfill cellType on existing defaults that were seeded before the cellType column existed
    for (const defaultMapping of IRS_DEFAULT_MAPPINGS) {
      const existingRow = existing.find((e) => e.boxNumber === defaultMapping.boxNumber);
      if (existingRow && (existingRow as any).cellType === 'number' && defaultMapping.cellType !== 'number') {
        await this.prismaService.cellMapping.update({
          where: { id: existingRow.id },
          data: { cellType: defaultMapping.cellType }
        });
      }
    }

    // Clean up stale parent-level box "20" that was replaced by 20A/20B/20V/20_WILDCARD
    const validBoxNumbers = new Set(IRS_DEFAULT_MAPPINGS.map((m) => m.boxNumber));
    const staleDefaults = existing.filter(
      (m) => !m.isCustom && !validBoxNumbers.has(m.boxNumber)
    );
    if (staleDefaults.length > 0) {
      await this.prismaService.cellMapping.deleteMany({
        where: {
          id: { in: staleDefaults.map((m) => m.id) }
        }
      });
    }
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

  /**
   * Upsert cell mappings for a partnership.
   * Creates partnership-specific overrides; does not modify global defaults.
   */
  public async updateMappings(
    partnershipId: string,
    mappings: Array<{
      boxNumber: string;
      label: string;
      description?: string;
      cellType?: string;
      isCustom: boolean;
    }>
  ) {
    const results = [];

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      const updateData: Record<string, any> = {
        label: mapping.label,
        description: mapping.description || null,
        isCustom: mapping.isCustom,
        sortOrder: i + 1
      };
      if (mapping.cellType) {
        updateData.cellType = mapping.cellType;
      }

      const result = await this.prismaService.cellMapping.upsert({
        where: {
          partnershipId_boxNumber: {
            partnershipId,
            boxNumber: mapping.boxNumber
          }
        },
        update: updateData,
        create: {
          partnershipId,
          boxNumber: mapping.boxNumber,
          label: mapping.label,
          description: mapping.description || null,
          cellType: mapping.cellType || 'number',
          isCustom: mapping.isCustom,
          sortOrder: i + 1
        }
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Reset a partnership's mappings to IRS defaults.
   * Deletes all partnership-specific overrides.
   */
  public async resetMappings(partnershipId: string) {
    await this.prismaService.cellMapping.deleteMany({
      where: { partnershipId }
    });

    return { deleted: true, partnershipId };
  }

  /**
   * Toggle the isIgnored flag on a cell mapping.
   * If a partnership-specific override exists, toggles it.
   * If only the global default exists, creates a partnership-specific override with isIgnored toggled.
   */
  public async toggleIgnored(
    partnershipId: string,
    boxNumber: string
  ) {
    // Check for partnership-specific mapping first
    const existing = await this.prismaService.cellMapping.findUnique({
      where: { partnershipId_boxNumber: { partnershipId, boxNumber } }
    });

    if (existing) {
      return this.prismaService.cellMapping.update({
        where: { id: existing.id },
        data: { isIgnored: !existing.isIgnored }
      });
    }

    // No partnership override — check for global default and create an override
    const globalMapping = await this.prismaService.cellMapping.findFirst({
      where: { partnershipId: null, boxNumber }
    });

    if (globalMapping) {
      return this.prismaService.cellMapping.create({
        data: {
          partnershipId,
          boxNumber: globalMapping.boxNumber,
          label: globalMapping.label,
          description: globalMapping.description,
          cellType: globalMapping.cellType,
          isCustom: false,
          isIgnored: true,
          sortOrder: globalMapping.sortOrder
        }
      });
    }

    throw new HttpException(
      `No cell mapping found for box ${boxNumber}`,
      StatusCodes.NOT_FOUND
    );
  }

  /**
   * Update aggregation rules for a partnership.
   */
  public async updateAggregationRules(
    partnershipId: string,
    rules: Array<{
      name: string;
      operation: string;
      sourceCells: string[];
    }>
  ) {
    // Delete existing partnership rules and recreate
    await this.prismaService.cellAggregationRule.deleteMany({
      where: { partnershipId }
    });

    await this.prismaService.cellAggregationRule.createMany({
      data: rules.map((rule, i) => ({
        partnershipId,
        name: rule.name,
        operation: rule.operation,
        sourceCells: rule.sourceCells,
        sortOrder: i + 1
      }))
    });

    return this.getAggregationRules(partnershipId);
  }

  /**
   * Compute aggregation values for a specific KDocument (FR-036).
   */
  public async computeAggregations(
    kDocumentId: string,
    partnershipId?: string
  ) {
    const kDocument = await this.prismaService.kDocument.findUnique({
      where: { id: kDocumentId }
    });

    if (!kDocument) {
      throw new HttpException('KDocument not found', StatusCodes.NOT_FOUND);
    }

    const pId = partnershipId || kDocument.partnershipId;
    const rules = await this.getAggregationRules(pId);
    const data = kDocument.data as Record<string, any>;

    return rules.map((rule: any) => {
      const sourceCells = (rule.sourceCells || []) as string[];
      const breakdown = sourceCells.map((boxNumber: string) => ({
        boxNumber,
        value: typeof data[boxNumber] === 'number' ? data[boxNumber] : 0
      }));

      let value = 0;
      if (rule.operation === 'SUM') {
        value = breakdown.reduce(
          (sum: number, item: any) => sum + item.value,
          0
        );
      }

      return {
        name: rule.name,
        operation: rule.operation,
        value,
        breakdown
      };
    });
  }
}
