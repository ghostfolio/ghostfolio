import { Module } from '@nestjs/common';

import { ConfigurationService } from '../../services/configuration.service';
import { DataGatheringService } from '../../services/data-gathering.service';
import { DataProviderService } from '../../services/data-provider.service';
import { AlphaVantageService } from '../../services/data-provider/alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from '../../services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '../../services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '../../services/data-provider/yahoo-finance/yahoo-finance.service';
import { ImpersonationService } from '../../services/impersonation.service';
import { PrismaService } from '../../services/prisma.service';
import { CacheService } from '../cache/cache.service';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [RedisCacheModule],
  controllers: [OrderController],
  providers: [
    AlphaVantageService,
    CacheService,
    ConfigurationService,
    DataGatheringService,
    DataProviderService,
    GhostfolioScraperApiService,
    ImpersonationService,
    OrderService,
    PrismaService,
    RakutenRapidApiService,
    YahooFinanceService
  ]
})
export class OrderModule {}
