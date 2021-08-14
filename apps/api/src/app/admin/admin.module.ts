import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    PrismaModule
  ],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
