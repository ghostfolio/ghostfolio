import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { TransformDataSourceInResponseModule } from '@ghostfolio/api/interceptors/transform-data-source-in-response/transform-data-source-in-response.module';

import { Module } from '@nestjs/common';

import { ApiController } from './api.controller';

@Module({
  controllers: [ApiController],
  imports: [PortfolioModule, TransformDataSourceInResponseModule]
})
export class ApiModule {}
