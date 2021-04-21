import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { AlphaVantageService } from '@ghostfolio/api/services/data-provider/alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '@ghostfolio/api/services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { RulesService } from '@ghostfolio/api/services/rules.service';
import { Module } from '@nestjs/common';

import { ExperimentalController } from './experimental.controller';
import { ExperimentalService } from './experimental.service';

@Module({
  imports: [],
  controllers: [ExperimentalController],
  providers: [
    AlphaVantageService,
    ConfigurationService,
    DataProviderService,
    ExchangeRateDataService,
    ExperimentalService,
    GhostfolioScraperApiService,
    PrismaService,
    RakutenRapidApiService,
    RulesService,
    YahooFinanceService
  ]
})
export class ExperimentalModule {}
