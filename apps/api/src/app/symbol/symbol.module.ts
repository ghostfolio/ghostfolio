import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

import { SymbolController } from './symbol.controller';
import { SymbolService } from './symbol.service';

@Module({
  controllers: [SymbolController],
  exports: [SymbolService],
  imports: [
    DataProviderModule,
    MarketDataModule,
    PrismaModule,
    PropertyModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ],
  providers: [SymbolService]
})
export class SymbolModule {}
