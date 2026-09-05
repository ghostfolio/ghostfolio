import { ActivitiesModule } from '@ghostfolio/api/app/activities/activities.module';
import { PortfolioModule } from '@ghostfolio/api/app/portfolio/portfolio.module';
import { I18nModule } from '@ghostfolio/api/services/i18n/i18n.module';

import { Module } from '@nestjs/common';

import { PortfolioTableService } from './portfolio-table.service';

@Module({
  exports: [PortfolioTableService],
  imports: [ActivitiesModule, I18nModule, PortfolioModule],
  providers: [PortfolioTableService]
})
export class PortfolioTableModule {}
