import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';
import { SymbolModule } from '@ghostfolio/api/services/symbol/symbol.module';

import { Module } from '@nestjs/common';

import { SymbolsController } from './symbols.controller';

@Module({
  controllers: [SymbolsController],
  imports: [
    SymbolModule,
    TransformDataSourceInRequestModule,
    TransformDataSourceInResponseModule
  ]
})
export class SymbolsModule {}
