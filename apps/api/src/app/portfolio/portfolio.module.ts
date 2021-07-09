import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { CacheService } from '@ghostfolio/api/app/cache/cache.service';
import { CurrentRateService } from '@ghostfolio/api/app/core/current-rate.service';
import { MarketDataService } from '@ghostfolio/api/app/core/market-data.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider.service';
import { AlphaVantageService } from '@ghostfolio/api/services/data-provider/alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '@ghostfolio/api/services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { RulesService } from '@ghostfolio/api/services/rules.service';
import { Module } from '@nestjs/common';

import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [RedisCacheModule],
  controllers: [PortfolioController],
  providers: [
    AccountService,
    AlphaVantageService,
    CacheService,
    CurrentRateService,
    ConfigurationService,
    DataGatheringService,
    DataProviderService,
    ExchangeRateDataService,
    GhostfolioScraperApiService,
    ImpersonationService,
    OrderService,
    PortfolioService,
    PrismaService,
    RakutenRapidApiService,
    RulesService,
    MarketDataService,
    UserService,
    YahooFinanceService
  ]
})
export class PortfolioModule {}
