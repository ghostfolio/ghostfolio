import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';

@Module({
  imports: [
    ConfigurationModule,
    DataProviderModule,
    DataGatheringModule,
    PrismaModule
  ],
  controllers: [AdminController],
  providers: [AdminService, ExchangeRateDataService]
})
export class AdminModule {}
