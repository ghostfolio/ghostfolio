import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { AlphaVantageService } from '@ghostfolio/api/services/data-provider/alpha-vantage/alpha-vantage.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '@ghostfolio/api/services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';

import { CacheController } from './cache.controller';

@Module({
  imports: [ExchangeRateDataModule, RedisCacheModule],
  controllers: [CacheController],
  providers: [
    AlphaVantageService,
    CacheService,
    ConfigurationService,
    DataGatheringService,
    DataProviderService,
    GhostfolioScraperApiService,
    PrismaService,
    RakutenRapidApiService,
    YahooFinanceService
  ]
})
export class CacheModule {}
