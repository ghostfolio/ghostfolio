import { Module } from '@nestjs/common';

import { ConfigurationService } from '../../services/configuration.service';
import { DataGatheringService } from '../../services/data-gathering.service';
import { DataProviderService } from '../../services/data-provider.service';
import { AlphaVantageService } from '../../services/data-provider/alpha-vantage/alpha-vantage.service';
import { RakutenRapidApiService } from '../../services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '../../services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '../../services/exchange-rate-data.service';
import { ImpersonationService } from '../../services/impersonation.service';
import { PrismaService } from '../../services/prisma.service';
import { RulesService } from '../../services/rules.service';
import { CacheService } from '../cache/cache.service';
import { OrderService } from '../order/order.service';
import { RedisCacheModule } from '../redis-cache/redis-cache.module';
import { UserService } from '../user/user.service';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [RedisCacheModule],
  controllers: [PortfolioController],
  providers: [
    AlphaVantageService,
    CacheService,
    ConfigurationService,
    DataGatheringService,
    DataProviderService,
    ExchangeRateDataService,
    ImpersonationService,
    OrderService,
    PortfolioService,
    PrismaService,
    RakutenRapidApiService,
    RulesService,
    UserService,
    YahooFinanceService
  ]
})
export class PortfolioModule {}
