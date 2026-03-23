import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PLAID_SYNC_QUEUE } from '@ghostfolio/common/config';

import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';

@Injectable()
export class PlaidSyncService {
  private readonly logger = new Logger(PlaidSyncService.name);

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService,
    @InjectQueue(PLAID_SYNC_QUEUE) private readonly syncQueue: Queue
  ) {}

  public async enqueueSyncJob(plaidItemId: string): Promise<string> {
    const job = await this.syncQueue.add(
      'sync-holdings',
      { plaidItemId },
      {
        attempts: 3,
        backoff: {
          delay: 60000,
          type: 'exponential'
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );

    this.logger.log(`Enqueued sync job ${job.id} for PlaidItem ${plaidItemId}`);
    return String(job.id);
  }

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  public async handleDailySync() {
    if (!this.configurationService.get('ENABLE_FEATURE_PLAID')) {
      return;
    }

    this.logger.log('Starting daily Plaid sync for all items');

    const plaidItems = await this.prismaService.plaidItem.findMany({
      select: { id: true },
      where: { error: null }
    });

    for (const item of plaidItems) {
      await this.enqueueSyncJob(item.id);
    }

    this.logger.log(`Enqueued ${plaidItems.length} sync jobs`);
  }
}
