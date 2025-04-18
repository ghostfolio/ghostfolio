import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { BenchmarkModule } from '@ghostfolio/api/services/benchmark/benchmark.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { DataGatheringModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ApiModule,
    BenchmarkModule,
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    MarketDataModule,
    OrderModule,
    PrismaModule,
    PropertyModule,
    QueueModule,
    SymbolProfileModule,
    TransformDataSourceInRequestModule
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService]
})
export class AdminModule {}
