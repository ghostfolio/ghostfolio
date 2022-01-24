import { AccessModule } from '@ghostfolio/api/app/access/access.module';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { OrderModule } from '@ghostfolio/api/app/order/order.module';
import { UserModule } from '@ghostfolio/api/app/user/user.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data.module';
import { ImpersonationModule } from '@ghostfolio/api/services/impersonation.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile.module';
import { Module } from '@nestjs/common';

import { CurrentRateService } from './current-rate.service';
import { PortfolioServiceStrategy } from './portfolio-service.strategy';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { PortfolioServiceNew } from './portfolio.service-new';
import { RulesService } from './rules.service';

@Module({
  exports: [PortfolioServiceStrategy],
  imports: [
    AccessModule,
    ConfigurationModule,
    DataGatheringModule,
    DataProviderModule,
    ExchangeRateDataModule,
    ImpersonationModule,
    MarketDataModule,
    OrderModule,
    PrismaModule,
    SymbolProfileModule,
    UserModule
  ],
  controllers: [PortfolioController],
  providers: [
    AccountService,
    CurrentRateService,
    PortfolioService,
    PortfolioServiceNew,
    PortfolioServiceStrategy,
    RulesService
  ]
})
export class PortfolioModule {}
