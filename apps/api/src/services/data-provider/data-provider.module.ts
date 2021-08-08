import { Module } from '@nestjs/common';
import { AlphaVantageService } from './alpha-vantage/alpha-vantage.service';
import { DataProviderService } from './data-provider.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '@ghostfolio/api/services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';

@Module({
  imports: [ConfigurationModule, PrismaModule],
  providers: [
    AlphaVantageService,
    DataProviderService,
    GhostfolioScraperApiService,
    RakutenRapidApiService,
    YahooFinanceService
  ],
  exports: [DataProviderService, GhostfolioScraperApiService]
})
export class DataProviderModule {}
