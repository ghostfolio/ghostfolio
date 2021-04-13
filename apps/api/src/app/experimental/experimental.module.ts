import { Module } from '@nestjs/common';

import { DataProviderService } from '../../services/data-provider.service';
import { AlphaVantageService } from '../../services/data-provider/alpha-vantage/alpha-vantage.service';
import { RakutenRapidApiService } from '../../services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '../../services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '../../services/exchange-rate-data.service';
import { PrismaService } from '../../services/prisma.service';
import { RulesService } from '../../services/rules.service';
import { ExperimentalController } from './experimental.controller';
import { ExperimentalService } from './experimental.service';

@Module({
  imports: [],
  controllers: [ExperimentalController],
  providers: [
    AlphaVantageService,
    DataProviderService,
    ExchangeRateDataService,
    ExperimentalService,
    PrismaService,
    RakutenRapidApiService,
    RulesService,
    YahooFinanceService
  ]
})
export class ExperimentalModule {}
