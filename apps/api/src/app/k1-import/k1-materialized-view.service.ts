import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class K1MaterializedViewService {
  private readonly logger = new Logger(K1MaterializedViewService.name);

  constructor(private readonly prismaService: PrismaService) {}

  @OnEvent('k-document.changed')
  async handleKDocumentChanged(payload?: {
    kDocumentId?: string;
    partnershipId?: string;
  }) {
    this.logger.log(
      `Refreshing K-1 materialized views (trigger: ${payload?.kDocumentId ?? 'manual'})...`
    );
    await this.refreshAll();
  }

  async refreshAll() {
    try {
      await this.prismaService.$executeRawUnsafe(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY mv_k1_partnership_year_summary`
      );
      this.logger.log('Materialized view mv_k1_partnership_year_summary refreshed.');
    } catch (error) {
      this.logger.error(
        'Failed to refresh materialized view mv_k1_partnership_year_summary',
        error
      );
      throw error;
    }
  }

  async getPartnershipYearSummary(
    partnershipId: string,
    taxYear: number
  ): Promise<
    Array<{
      partnership_id: string;
      tax_year: number;
      box_key: string;
      label: string;
      section: string | null;
      total_amount: number | null;
      line_count: bigint;
    }>
  > {
    return this.prismaService.$queryRaw`
      SELECT *
      FROM mv_k1_partnership_year_summary
      WHERE partnership_id = ${partnershipId}
        AND tax_year = ${taxYear}
      ORDER BY box_key
    `;
  }
}
