import { AdminModule } from '@ghostfolio/api/app/admin/admin.module';
import { SymbolModule } from '@ghostfolio/api/app/symbol/symbol.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
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
    SymbolProfileModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ]
})
export class MarketDataModule {}
