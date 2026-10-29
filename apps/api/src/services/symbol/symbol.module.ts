import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';

import { Module } from '@nestjs/common';

import { SymbolService } from './symbol.service';

@Module({
  exports: [SymbolService],
  imports: [DataProviderModule, MarketDataModule, PrismaModule],
  providers: [SymbolService]
})
export class SymbolModule {}
