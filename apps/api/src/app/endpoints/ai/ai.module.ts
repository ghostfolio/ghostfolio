import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { ApiModule } from '@ghostfolio/api/services/api/api.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation/impersonation.module';
import { PortfolioTableModule } from '@ghostfolio/api/services/portfolio-table/portfolio-table.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  controllers: [AiController],
  exports: [AiService],
  imports: [
    ApiModule,
    ConfigurationModule,
    ImpersonationModule,
    PortfolioTableModule,
    PropertyModule,
    TransformDataSourceInRequestModule
  ],
  providers: [AiService]
})
export class AiModule {}
