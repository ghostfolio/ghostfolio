import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '@ghostfolio/api/services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { ImpersonationService } from '@ghostfolio/api/services/impersonation.service';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Module } from '@nestjs/common';

import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [RedisCacheModule, DataProviderModule],
  controllers: [AccountController],
  providers: [
    AccountService,
    ConfigurationService,
    ExchangeRateDataService,
    GhostfolioScraperApiService,
    ImpersonationService,
    PrismaService,
    RakutenRapidApiService,
    YahooFinanceService
  ]
})
export class AccountModule {}
