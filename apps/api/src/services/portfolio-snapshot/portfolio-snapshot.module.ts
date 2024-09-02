import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/portfolio-snapshot/portfolio-snapshot.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';
import { PORTFOLIO_SNAPSHOT_QUEUE } from '@ghostfolio/common/config';

import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { PortfolioSnapshotProcessor } from './portfolio-snapshot.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      // limiter: {
      //   duration: ms('4 seconds'),
      //   max: 1
      // },
      name: PORTFOLIO_SNAPSHOT_QUEUE
    }),
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    MarketDataModule,
    PrismaModule,
    PropertyModule,
    SymbolProfileModule
  ],
  providers: [PortfolioSnapshotProcessor, PortfolioSnapshotService],
  exports: [BullModule, PortfolioSnapshotService]
})
export class PortfolioSnapshotQueueModule {}
