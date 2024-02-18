import { AccountModule } from '@ghostfolio/api/app/account/account.module';
import { CacheModule } from '@ghostfolio/api/app/cache/cache.module';
import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { PlatformModule } from '@ghostfolio/api/app/platform/platform.module';
import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  controllers: [ImportController],
  imports: [
    AccountModule,
    CacheModule,
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    OrderModule,
    PlatformModule,
    PortfolioModule,
    PrismaModule,
    RedisCacheModule,
    SymbolProfileModule
  ],
  providers: [ImportService]
})
export class ImportModule {}
