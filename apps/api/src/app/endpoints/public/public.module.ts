import { ActivitiesModule } from '@ghostfolio/api/app/activities/activities.module';
import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { TransformDataSourceInRequestModule } from '@ghostfolio/api/interceptors/transform-data-source-in-request/transform-data-source-in-request.module';
import { AccessModule } from '@ghostfolio/api/services/access/access.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';

import { Module } from '@nestjs/common';

import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  controllers: [PublicController],
  imports: [
    AccessModule,
    ActivitiesModule,
    ExchangeRateDataModule,
    PortfolioModule,
    TransformDataSourceInRequestModule,
    UserModule
  ],
  providers: [PublicService]
})
export class PublicModule {}
