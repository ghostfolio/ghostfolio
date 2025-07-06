import { AdminModule } from '@ghostfolio/api/app/admin/admin.module';
import { SymbolModule } from '@ghostfolio/api/app/symbol/symbol.module';
import { MarketDataModule as MarketDataServiceModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { MarketDataController } from './market-data.controller';

@Module({
  controllers: [MarketDataController],
  imports: [
    AdminModule,
    MarketDataServiceModule,
    SymbolModule,
    SymbolProfileModule
  ]
})
export class MarketDataModule {}
