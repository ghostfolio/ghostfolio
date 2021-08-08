import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';

@Module({
  imports: [DataProviderModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    ConfigurationService,
    DataGatheringService,
    ExchangeRateDataService,
    PrismaService
  ]
})
export class AdminModule {}
