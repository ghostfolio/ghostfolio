import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { SymbolController } from './symbol.controller';
import { SymbolService } from './symbol.service';

@Module({
  controllers: [SymbolController],
  exports: [SymbolService],
  imports: [
    ConfigurationModule,
    DataProviderModule,
    MarketDataModule,
    PrismaModule
  ],
  providers: [SymbolService]
})
export class SymbolModule {}
