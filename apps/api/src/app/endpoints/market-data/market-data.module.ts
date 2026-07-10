import { SymbolModule } from '@ghostfolio/api/app/symbol/symbol.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { MarketDataModule as MarketDataServiceModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { MarketDataController } from './market-data.controller';

@Module({
  controllers: [MarketDataController],
  imports: [
    DataProviderModule,
    MarketDataServiceModule,
    SymbolModule,
    SymbolProfileModule
  ]
})
export class MarketDataModule {}
