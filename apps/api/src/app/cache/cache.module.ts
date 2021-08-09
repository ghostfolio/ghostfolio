import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { AlphaVantageService } from '@ghostfolio/api/services/data-provider/alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '@ghostfolio/api/services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';

import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';

@Module({
  imports: [RedisCacheModule],
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
