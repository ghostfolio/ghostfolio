import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import type {
  K1BoxDataType,
  K1BoxDefinition,
  K1BoxDefinitionResolved,
  K1BoxSection
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * Static IRS default box definitions.
 * This is the authoritative list of IRS K-1 (Form 1065) box identifiers.
 */
const IRS_DEFAULT_BOX_DEFINITIONS: Array<{
  boxKey: string;
  label: string;
  section: K1BoxSection;
  dataType: K1BoxDataType;
  sortOrder: number;
  irsFormLine: string | null;
  description: string;
}> = [
  // ── Header / Metadata ──────────────────────────────────────────────────
  { boxKey: 'K1_DOCUMENT_ID', label: 'K-1 Document ID', section: 'HEADER', dataType: 'string', sortOrder: 0, irsFormLine: null, description: 'Large-font ID at top right of K-1 form' },
  { boxKey: 'TAX_YEAR', label: 'Tax Year', section: 'HEADER', dataType: 'string', sortOrder: 1, irsFormLine: null, description: 'Calendar year or tax year beginning/ending' },
  { boxKey: 'FINAL_K1', label: 'Final K-1', section: 'HEADER', dataType: 'boolean', sortOrder: 2, irsFormLine: null, description: 'Check if this is a final K-1' },
  { boxKey: 'AMENDED_K1', label: 'Amended K-1', section: 'HEADER', dataType: 'boolean', sortOrder: 3, irsFormLine: null, description: 'Check if this is an amended K-1' },

  // ── Part I — Information About the Partnership ─────────────────────────
  { boxKey: 'A', label: "Partnership's EIN", section: 'PART_I', dataType: 'string', sortOrder: 10, irsFormLine: 'Part I, Line A', description: 'Part I, Line A — Employer identification number' },
  { boxKey: 'B', label: "Partnership's name, address, city, state, ZIP", section: 'PART_I', dataType: 'string', sortOrder: 11, irsFormLine: 'Part I, Line B', description: 'Part I, Line B' },
  { boxKey: 'C', label: 'IRS center where partnership filed return', section: 'PART_I', dataType: 'string', sortOrder: 12, irsFormLine: 'Part I, Line C', description: 'Part I, Line C' },
  { boxKey: 'D', label: 'Publicly traded partnership (PTP)', section: 'PART_I', dataType: 'boolean', sortOrder: 13, irsFormLine: 'Part I, Line D', description: 'Part I, Line D — Check if PTP' },

  // ── Part II — Information About the Partner ────────────────────────────
  { boxKey: 'E', label: "Partner's identifying number", section: 'PART_II', dataType: 'string', sortOrder: 20, irsFormLine: 'Part II, Line E', description: 'Part II, Line E — SSN or TIN' },
  { boxKey: 'F', label: "Partner's name, address, city, state, ZIP", section: 'PART_II', dataType: 'string', sortOrder: 21, irsFormLine: 'Part II, Line F', description: 'Part II, Line F' },
  { boxKey: 'G_GENERAL', label: 'General partner or LLC member-manager', section: 'PART_II', dataType: 'boolean', sortOrder: 22, irsFormLine: 'Part II, Line G', description: 'Part II, Line G — General partner checkbox' },
  { boxKey: 'G_LIMITED', label: 'Limited partner or other LLC member', section: 'PART_II', dataType: 'boolean', sortOrder: 23, irsFormLine: 'Part II, Line G', description: 'Part II, Line G — Limited partner checkbox' },
  { boxKey: 'H1_DOMESTIC', label: 'Domestic partner', section: 'PART_II', dataType: 'boolean', sortOrder: 24, irsFormLine: 'Part II, Line H1', description: 'Part II, Line H1 — Domestic' },
  { boxKey: 'H1_FOREIGN', label: 'Foreign partner', section: 'PART_II', dataType: 'boolean', sortOrder: 25, irsFormLine: 'Part II, Line H1', description: 'Part II, Line H1 — Foreign' },
  { boxKey: 'H2', label: 'Disregarded entity (DE)', section: 'PART_II', dataType: 'boolean', sortOrder: 26, irsFormLine: 'Part II, Line H2', description: 'Part II, Line H2 — DE checkbox' },
  { boxKey: 'H2_TIN', label: 'Disregarded entity TIN', section: 'PART_II', dataType: 'string', sortOrder: 27, irsFormLine: 'Part II, Line H2', description: 'Part II, Line H2 — DE taxpayer ID' },
  { boxKey: 'I1', label: 'Type of entity', section: 'PART_II', dataType: 'string', sortOrder: 28, irsFormLine: 'Part II, Line I1', description: 'Part II, Line I1 — Entity type of partner' },
  { boxKey: 'I2', label: 'Retirement plan (IRA/SEP/Keogh)', section: 'PART_II', dataType: 'boolean', sortOrder: 29, irsFormLine: 'Part II, Line I2', description: 'Part II, Line I2 — Retirement plan checkbox' },

  // ── Section J — Partner's Share of Profit, Loss, and Capital ───────────
  { boxKey: 'J_PROFIT_BEGIN', label: 'Profit — Beginning %', section: 'SECTION_J', dataType: 'percentage', sortOrder: 30, irsFormLine: 'Section J', description: 'Section J — Profit share beginning of year' },
  { boxKey: 'J_PROFIT_END', label: 'Profit — Ending %', section: 'SECTION_J', dataType: 'percentage', sortOrder: 31, irsFormLine: 'Section J', description: 'Section J — Profit share end of year' },
  { boxKey: 'J_LOSS_BEGIN', label: 'Loss — Beginning %', section: 'SECTION_J', dataType: 'percentage', sortOrder: 32, irsFormLine: 'Section J', description: 'Section J — Loss share beginning of year' },
  { boxKey: 'J_LOSS_END', label: 'Loss — Ending %', section: 'SECTION_J', dataType: 'percentage', sortOrder: 33, irsFormLine: 'Section J', description: 'Section J — Loss share end of year' },
  { boxKey: 'J_CAPITAL_BEGIN', label: 'Capital — Beginning %', section: 'SECTION_J', dataType: 'percentage', sortOrder: 34, irsFormLine: 'Section J', description: 'Section J — Capital share beginning of year' },
  { boxKey: 'J_CAPITAL_END', label: 'Capital — Ending %', section: 'SECTION_J', dataType: 'percentage', sortOrder: 35, irsFormLine: 'Section J', description: 'Section J — Capital share end of year' },
  { boxKey: 'J_SALE', label: 'Decrease due to sale', section: 'SECTION_J', dataType: 'boolean', sortOrder: 36, irsFormLine: 'Section J', description: 'Section J — Check if decrease is due to sale' },
  { boxKey: 'J_EXCHANGE', label: 'Exchange of partnership interest', section: 'SECTION_J', dataType: 'boolean', sortOrder: 37, irsFormLine: 'Section J', description: 'Section J — Check if exchange' },

  // ── Section K — Partner's Share of Liabilities ─────────────────────────
  { boxKey: 'K_NONRECOURSE_BEGIN', label: 'Nonrecourse — Beginning', section: 'SECTION_K', dataType: 'number', sortOrder: 40, irsFormLine: 'Section K', description: 'Section K — Nonrecourse liabilities beginning' },
  { boxKey: 'K_NONRECOURSE_END', label: 'Nonrecourse — Ending', section: 'SECTION_K', dataType: 'number', sortOrder: 41, irsFormLine: 'Section K', description: 'Section K — Nonrecourse liabilities ending' },
  { boxKey: 'K_QUAL_NONRECOURSE_BEGIN', label: 'Qualified nonrecourse — Beginning', section: 'SECTION_K', dataType: 'number', sortOrder: 42, irsFormLine: 'Section K', description: 'Section K — Qualified nonrecourse financing beginning' },
  { boxKey: 'K_QUAL_NONRECOURSE_END', label: 'Qualified nonrecourse — Ending', section: 'SECTION_K', dataType: 'number', sortOrder: 43, irsFormLine: 'Section K', description: 'Section K — Qualified nonrecourse financing ending' },
  { boxKey: 'K_RECOURSE_BEGIN', label: 'Recourse — Beginning', section: 'SECTION_K', dataType: 'number', sortOrder: 44, irsFormLine: 'Section K', description: 'Section K — Recourse liabilities beginning' },
  { boxKey: 'K_RECOURSE_END', label: 'Recourse — Ending', section: 'SECTION_K', dataType: 'number', sortOrder: 45, irsFormLine: 'Section K', description: 'Section K — Recourse liabilities ending' },
  { boxKey: 'K2', label: 'Includes lower-tier partnership liabilities', section: 'SECTION_K', dataType: 'boolean', sortOrder: 46, irsFormLine: 'Section K2', description: 'Section K2 — Checkbox' },
  { boxKey: 'K3', label: 'Liability subject to guarantees', section: 'SECTION_K', dataType: 'boolean', sortOrder: 47, irsFormLine: 'Section K3', description: 'Section K3 — Checkbox' },

  // ── Section L — Partner's Capital Account Analysis ─────────────────────
  { boxKey: 'L_BEG_CAPITAL', label: 'Beginning capital account', section: 'SECTION_L', dataType: 'number', sortOrder: 50, irsFormLine: 'Section L', description: 'Section L — Beginning capital' },
  { boxKey: 'L_CONTRIBUTED', label: 'Capital contributed during year', section: 'SECTION_L', dataType: 'number', sortOrder: 51, irsFormLine: 'Section L', description: 'Section L — Capital contributed' },
  { boxKey: 'L_CURR_YR_INCOME', label: 'Current year net income (loss)', section: 'SECTION_L', dataType: 'number', sortOrder: 52, irsFormLine: 'Section L', description: 'Section L — Current year income/loss' },
  { boxKey: 'L_OTHER', label: 'Other increase (decrease)', section: 'SECTION_L', dataType: 'number', sortOrder: 53, irsFormLine: 'Section L', description: 'Section L — Other adjustments' },
  { boxKey: 'L_WITHDRAWALS', label: 'Withdrawals and distributions', section: 'SECTION_L', dataType: 'number', sortOrder: 54, irsFormLine: 'Section L', description: 'Section L — Withdrawals/distributions' },
  { boxKey: 'L_END_CAPITAL', label: 'Ending capital account', section: 'SECTION_L', dataType: 'number', sortOrder: 55, irsFormLine: 'Section L', description: 'Section L — Ending capital' },

  // ── Section M — Contributed Property ───────────────────────────────────
  { boxKey: 'M_YES', label: 'Contributed property with built-in gain/loss — Yes', section: 'SECTION_M', dataType: 'boolean', sortOrder: 60, irsFormLine: 'Section M', description: 'Section M — Yes checkbox' },
  { boxKey: 'M_NO', label: 'Contributed property with built-in gain/loss — No', section: 'SECTION_M', dataType: 'boolean', sortOrder: 61, irsFormLine: 'Section M', description: 'Section M — No checkbox' },

  // ── Section N — Net Unrecognized Section 704(c) ────────────────────────
  { boxKey: 'N_BEGINNING', label: 'Net 704(c) gain/loss — Beginning', section: 'SECTION_N', dataType: 'number', sortOrder: 62, irsFormLine: 'Section N', description: 'Section N — Beginning balance' },
  { boxKey: 'N_ENDING', label: 'Net 704(c) gain/loss — Ending', section: 'SECTION_N', dataType: 'number', sortOrder: 63, irsFormLine: 'Section N', description: 'Section N — Ending balance' },

  // ── Part III — Partner's Share of Current Year Income, Deductions, etc. ─
  { boxKey: '1', label: 'Ordinary business income (loss)', section: 'PART_III', dataType: 'number', sortOrder: 100, irsFormLine: 'Box 1', description: 'IRS Schedule K-1 Box 1' },
  { boxKey: '2', label: 'Net rental real estate income (loss)', section: 'PART_III', dataType: 'number', sortOrder: 101, irsFormLine: 'Box 2', description: 'IRS Schedule K-1 Box 2' },
  { boxKey: '3', label: 'Other net rental income (loss)', section: 'PART_III', dataType: 'number', sortOrder: 102, irsFormLine: 'Box 3', description: 'IRS Schedule K-1 Box 3' },
  { boxKey: '4', label: 'Guaranteed payments for services', section: 'PART_III', dataType: 'number', sortOrder: 103, irsFormLine: 'Box 4', description: 'IRS Schedule K-1 Box 4' },
  { boxKey: '4a', label: 'Guaranteed payments for capital', section: 'PART_III', dataType: 'number', sortOrder: 104, irsFormLine: 'Box 4a', description: 'IRS Schedule K-1 Box 4a' },
  { boxKey: '4b', label: 'Total guaranteed payments', section: 'PART_III', dataType: 'number', sortOrder: 105, irsFormLine: 'Box 4b', description: 'IRS Schedule K-1 Box 4b' },
  { boxKey: '5', label: 'Interest income', section: 'PART_III', dataType: 'number', sortOrder: 106, irsFormLine: 'Box 5', description: 'IRS Schedule K-1 Box 5' },
  { boxKey: '6a', label: 'Ordinary dividends', section: 'PART_III', dataType: 'number', sortOrder: 107, irsFormLine: 'Box 6a', description: 'IRS Schedule K-1 Box 6a' },
  { boxKey: '6b', label: 'Qualified dividends', section: 'PART_III', dataType: 'number', sortOrder: 108, irsFormLine: 'Box 6b', description: 'IRS Schedule K-1 Box 6b' },
  { boxKey: '6c', label: 'Dividend equivalents', section: 'PART_III', dataType: 'number', sortOrder: 109, irsFormLine: 'Box 6c', description: 'IRS Schedule K-1 Box 6c' },
  { boxKey: '7', label: 'Royalties', section: 'PART_III', dataType: 'number', sortOrder: 110, irsFormLine: 'Box 7', description: 'IRS Schedule K-1 Box 7' },
  { boxKey: '8', label: 'Net short-term capital gain (loss)', section: 'PART_III', dataType: 'number', sortOrder: 111, irsFormLine: 'Box 8', description: 'IRS Schedule K-1 Box 8' },
  { boxKey: '9a', label: 'Net long-term capital gain (loss)', section: 'PART_III', dataType: 'number', sortOrder: 112, irsFormLine: 'Box 9a', description: 'IRS Schedule K-1 Box 9a' },
  { boxKey: '9b', label: 'Collectibles (28%) gain (loss)', section: 'PART_III', dataType: 'number', sortOrder: 113, irsFormLine: 'Box 9b', description: 'IRS Schedule K-1 Box 9b' },
  { boxKey: '9c', label: 'Unrecaptured section 1250 gain', section: 'PART_III', dataType: 'number', sortOrder: 114, irsFormLine: 'Box 9c', description: 'IRS Schedule K-1 Box 9c' },
  { boxKey: '10', label: 'Net section 1231 gain (loss)', section: 'PART_III', dataType: 'number', sortOrder: 115, irsFormLine: 'Box 10', description: 'IRS Schedule K-1 Box 10' },
  { boxKey: '11', label: 'Other income (loss)', section: 'PART_III', dataType: 'number', sortOrder: 116, irsFormLine: 'Box 11', description: 'IRS Schedule K-1 Box 11' },
  { boxKey: '12', label: 'Section 179 deduction', section: 'PART_III', dataType: 'number', sortOrder: 117, irsFormLine: 'Box 12', description: 'IRS Schedule K-1 Box 12' },
  { boxKey: '13', label: 'Other deductions', section: 'PART_III', dataType: 'number', sortOrder: 118, irsFormLine: 'Box 13', description: 'IRS Schedule K-1 Box 13' },
  { boxKey: '14', label: 'Self-employment earnings (loss)', section: 'PART_III', dataType: 'number', sortOrder: 119, irsFormLine: 'Box 14', description: 'IRS Schedule K-1 Box 14' },
  { boxKey: '15', label: 'Credits', section: 'PART_III', dataType: 'number', sortOrder: 120, irsFormLine: 'Box 15', description: 'IRS Schedule K-1 Box 15' },
  { boxKey: '16', label: 'Foreign transactions', section: 'PART_III', dataType: 'number', sortOrder: 121, irsFormLine: 'Box 16', description: 'IRS Schedule K-1 Box 16' },
  { boxKey: '16_K3', label: 'Schedule K-3 is attached', section: 'PART_III', dataType: 'boolean', sortOrder: 122, irsFormLine: 'Box 16', description: 'IRS Schedule K-1 Box 16 K-3 checkbox' },
  { boxKey: '17', label: 'Alternative minimum tax (AMT) items', section: 'PART_III', dataType: 'number', sortOrder: 123, irsFormLine: 'Box 17', description: 'IRS Schedule K-1 Box 17' },
  { boxKey: '18', label: 'Tax-exempt income and nondeductible expenses', section: 'PART_III', dataType: 'number', sortOrder: 124, irsFormLine: 'Box 18', description: 'IRS Schedule K-1 Box 18' },
  { boxKey: '19', label: 'Distributions', section: 'PART_III', dataType: 'number', sortOrder: 125, irsFormLine: 'Box 19', description: 'IRS Schedule K-1 Box 19' },
  { boxKey: '19a', label: 'Distributions — Cash and marketable securities', section: 'PART_III', dataType: 'number', sortOrder: 126, irsFormLine: 'Box 19a', description: 'IRS Schedule K-1 Box 19a' },
  { boxKey: '19b', label: 'Distributions — Other property', section: 'PART_III', dataType: 'number', sortOrder: 127, irsFormLine: 'Box 19b', description: 'IRS Schedule K-1 Box 19b' },
  { boxKey: '20A', label: 'Other information — Code A', section: 'PART_III', dataType: 'number', sortOrder: 128, irsFormLine: 'Box 20, Code A', description: 'IRS Schedule K-1 Box 20, Code A' },
  { boxKey: '20B', label: 'Other information — Code B', section: 'PART_III', dataType: 'number', sortOrder: 129, irsFormLine: 'Box 20, Code B', description: 'IRS Schedule K-1 Box 20, Code B' },
  { boxKey: '20V', label: 'Other information — Code V', section: 'PART_III', dataType: 'number', sortOrder: 130, irsFormLine: 'Box 20, Code V', description: 'IRS Schedule K-1 Box 20, Code V' },
  { boxKey: '20_WILDCARD', label: 'Other information — Other codes', section: 'PART_III', dataType: 'number', sortOrder: 131, irsFormLine: 'Box 20', description: 'IRS Schedule K-1 Box 20, all other codes' },
  { boxKey: '21', label: 'Foreign taxes paid or accrued', section: 'PART_III', dataType: 'number', sortOrder: 132, irsFormLine: 'Box 21', description: 'IRS Schedule K-1 Box 21' },
  { boxKey: '22', label: 'More than one activity for at-risk purposes', section: 'PART_III', dataType: 'boolean', sortOrder: 133, irsFormLine: 'Box 22', description: 'IRS Schedule K-1 Box 22 — Checkbox' },
  { boxKey: '23', label: 'More than one activity for passive activity purposes', section: 'PART_III', dataType: 'boolean', sortOrder: 134, irsFormLine: 'Box 23', description: 'IRS Schedule K-1 Box 23 — Checkbox' }
];

/** Default aggregation rules (embedded constants) */
export const DEFAULT_AGGREGATION_RULES = [
  {
    name: 'Total Ordinary Income',
    operation: 'SUM' as const,
    sourceBoxKeys: ['1'],
    sortOrder: 1
  },
  {
    name: 'Net Rental Income',
    operation: 'SUM' as const,
    sourceBoxKeys: ['2', '3'],
    sortOrder: 2
  },
  {
    name: 'Guaranteed Payments',
    operation: 'SUM' as const,
    sourceBoxKeys: ['4a', '4b'],
    sortOrder: 3
  },
  {
    name: 'Interest Income',
    operation: 'SUM' as const,
    sourceBoxKeys: ['5'],
    sortOrder: 4
  },
  {
    name: 'Total Dividends',
    operation: 'SUM' as const,
    sourceBoxKeys: ['6a'],
    sortOrder: 5
  },
  {
    name: 'Qualified Dividends',
    operation: 'SUM' as const,
    sourceBoxKeys: ['6b'],
    sortOrder: 6
  },
  {
    name: 'Royalties',
    operation: 'SUM' as const,
    sourceBoxKeys: ['7'],
    sortOrder: 7
  },
  {
    name: 'Total Capital Gains',
    operation: 'SUM' as const,
    sourceBoxKeys: ['8', '9a', '9b', '9c', '10'],
    sortOrder: 8
  },
  {
    name: 'Other Income',
    operation: 'SUM' as const,
    sourceBoxKeys: ['11'],
    sortOrder: 9
  },
  {
    name: 'Total Deductions',
    operation: 'SUM' as const,
    sourceBoxKeys: ['12', '13'],
    sortOrder: 10
  },
  {
    name: 'Self-Employment Earnings',
    operation: 'SUM' as const,
    sourceBoxKeys: ['14'],
    sortOrder: 11
  },
  {
    name: 'Alternative Minimum Tax Items',
    operation: 'SUM' as const,
    sourceBoxKeys: ['17'],
    sortOrder: 12
  },
  {
    name: 'Total Distributions',
    operation: 'SUM' as const,
    sourceBoxKeys: ['19a', '19b', '19'],
    sortOrder: 13
  },
  {
    name: 'Foreign Taxes Paid',
    operation: 'SUM' as const,
    sourceBoxKeys: ['21'],
    sortOrder: 14
  },
  {
    name: 'Total K-1 Income (Net)',
    operation: 'SUM' as const,
    sourceBoxKeys: ['1', '2', '3', '4b', '5', '6a', '7', '8', '9a', '9b', '9c', '10', '11', '14'],
    sortOrder: 15
  }
] as const;

@Injectable()
export class K1BoxDefinitionService implements OnModuleInit {
  private readonly logger = new Logger(K1BoxDefinitionService.name);

  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Auto-seed IRS default box definitions on startup.
   * Convention over configuration: the reference table is always populated.
   */
  public async onModuleInit(): Promise<void> {
    try {
      const count = await this.prismaService.k1BoxDefinition.count();

      if (count === 0) {
        this.logger.log(
          'K1BoxDefinition table is empty — seeding IRS defaults...'
        );
        const result = await this.seedDefaults();
        this.logger.log(
          `Auto-seeded ${result.created} IRS default box definitions`
        );
      } else {
        this.logger.log(
          `K1BoxDefinition table has ${count} entries — skipping seed`
        );
      }
    } catch (error) {
      this.logger.error(
        'Failed to auto-seed K1BoxDefinition defaults',
        error
      );
    }
  }

  /**
   * Get all box definitions, ordered by sortOrder.
   * Optionally filter by section.
   */
  public async getAll(section?: string): Promise<K1BoxDefinition[]> {
    const where: Prisma.K1BoxDefinitionWhereInput = {};

    if (section) {
      where.section = section;
    }

    const definitions = await this.prismaService.k1BoxDefinition.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    });

    return definitions.map((d) => ({
      boxKey: d.boxKey,
      label: d.label,
      section: (d.section ?? undefined) as K1BoxSection | undefined,
      dataType: d.dataType as K1BoxDataType,
      sortOrder: d.sortOrder,
      irsFormLine: d.irsFormLine ?? undefined,
      description: d.description ?? undefined,
      isCustom: d.isCustom,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    }));
  }

  /**
   * Get a single box definition by boxKey.
   * Returns null if not found.
   */
  public async getByKey(boxKey: string): Promise<K1BoxDefinition | null> {
    const d = await this.prismaService.k1BoxDefinition.findUnique({
      where: { boxKey }
    });

    if (!d) {
      return null;
    }

    return {
      boxKey: d.boxKey,
      label: d.label,
      section: (d.section ?? undefined) as K1BoxSection | undefined,
      dataType: d.dataType as K1BoxDataType,
      sortOrder: d.sortOrder,
      irsFormLine: d.irsFormLine ?? undefined,
      description: d.description ?? undefined,
      isCustom: d.isCustom,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt
    };
  }

  /**
   * Resolve box definitions for a partnership: merges global definitions
   * with K1BoxOverride for the given partnership.
   * - customLabel overrides label
   * - isIgnored filters out entries
   */
  public async resolve(
    partnershipId: string
  ): Promise<K1BoxDefinitionResolved[]> {
    const [definitions, overrides] = await Promise.all([
      this.prismaService.k1BoxDefinition.findMany({
        orderBy: { sortOrder: 'asc' }
      }),
      this.prismaService.k1BoxOverride.findMany({
        where: { partnershipId }
      })
    ]);

    const overrideMap = new Map(
      overrides.map((o) => [o.boxKey, o])
    );

    return definitions
      .map((d) => {
        const override = overrideMap.get(d.boxKey);
        return {
          boxKey: d.boxKey,
          label: override?.customLabel ?? d.label,
          section: (d.section ?? undefined) as K1BoxSection | undefined,
          dataType: d.dataType as K1BoxDataType,
          sortOrder: d.sortOrder,
          irsFormLine: d.irsFormLine ?? undefined,
          description: d.description ?? undefined,
          isCustom: d.isCustom,
          isIgnored: override?.isIgnored ?? false,
          customLabel: override?.customLabel ?? undefined
        };
      })
      .filter((d) => !d.isIgnored);
  }

  /**
   * Auto-create a box definition if it doesn't already exist (FR-017).
   * Used during K-1 import to handle unknown box keys from PDF extraction.
   * Returns the existing or newly created definition.
   */
  public async autoCreateIfMissing(
    boxKey: string,
    label?: string
  ): Promise<K1BoxDefinition> {
    const existing = await this.prismaService.k1BoxDefinition.findUnique({
      where: { boxKey }
    });

    if (existing) {
      return {
        boxKey: existing.boxKey,
        label: existing.label,
        section: (existing.section ?? undefined) as K1BoxSection | undefined,
        dataType: existing.dataType as K1BoxDataType,
        sortOrder: existing.sortOrder,
        irsFormLine: existing.irsFormLine ?? undefined,
        description: existing.description ?? undefined,
        isCustom: existing.isCustom,
        createdAt: existing.createdAt,
        updatedAt: existing.updatedAt
      };
    }

    this.logger.warn(
      `Auto-creating custom box definition for unknown key: ${boxKey}`
    );

    // Find the max sortOrder to place custom entries at the end
    const maxSortOrder = await this.prismaService.k1BoxDefinition
      .aggregate({ _max: { sortOrder: true } })
      .then((r) => r._max.sortOrder ?? 999);

    const created = await this.prismaService.k1BoxDefinition.create({
      data: {
        boxKey,
        label: label ?? `Custom: ${boxKey}`,
        section: null,
        dataType: 'number',
        sortOrder: maxSortOrder + 1,
        irsFormLine: null,
        description: `Auto-created during import for unrecognized box key "${boxKey}"`,
        isCustom: true
      }
    });

    return {
      boxKey: created.boxKey,
      label: created.label,
      section: (created.section ?? undefined) as K1BoxSection | undefined,
      dataType: created.dataType as K1BoxDataType,
      sortOrder: created.sortOrder,
      irsFormLine: created.irsFormLine ?? undefined,
      description: created.description ?? undefined,
      isCustom: created.isCustom,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  }

  /**
   * Seed all IRS default box definitions via upsert.
   * Safe to call multiple times — won't overwrite existing entries.
   */
  public async seedDefaults(): Promise<{ created: number; existing: number }> {
    let created = 0;
    let existing = 0;

    for (const def of IRS_DEFAULT_BOX_DEFINITIONS) {
      const result = await this.prismaService.k1BoxDefinition.upsert({
        where: { boxKey: def.boxKey },
        update: {},
        create: {
          boxKey: def.boxKey,
          label: def.label,
          section: def.section,
          dataType: def.dataType,
          sortOrder: def.sortOrder,
          irsFormLine: def.irsFormLine,
          description: def.description,
          isCustom: false
        }
      });

      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        existing++;
      }
    }

    this.logger.log(
      `Seeded K1BoxDefinition: ${created} created, ${existing} existing`
    );

    return { created, existing };
  }

  /**
   * Create or update a K1BoxOverride for a partnership.
   */
  public async upsertOverride(
    boxKey: string,
    partnershipId: string,
    data: { customLabel?: string; isIgnored?: boolean }
  ) {
    return this.prismaService.k1BoxOverride.upsert({
      where: {
        boxKey_partnershipId: { boxKey, partnershipId }
      },
      update: {
        ...(data.customLabel !== undefined && {
          customLabel: data.customLabel
        }),
        ...(data.isIgnored !== undefined && { isIgnored: data.isIgnored })
      },
      create: {
        boxKey,
        partnershipId,
        customLabel: data.customLabel ?? null,
        isIgnored: data.isIgnored ?? false
      }
    });
  }

  /**
   * Get the static IRS default box definitions.
   * Useful for seeding or comparison without DB access.
   */
  public static getIrsDefaults() {
    return IRS_DEFAULT_BOX_DEFINITIONS;
  }
}
