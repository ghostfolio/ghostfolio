import { SubscriptionModule } from '@ghostfolio/api/app/subscription/subscription.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile.module';
import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    MarketDataModule,
    PrismaModule,
    PropertyModule,
    QueueModule,
    SubscriptionModule,
    SymbolProfileModule
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}
