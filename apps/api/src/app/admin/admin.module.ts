import { Module } from '@nestjs/common';

import { DataGatheringService } from '../../services/data-gathering.service';
import { DataProviderService } from '../../services/data-provider.service';
import { AlphaVantageService } from '../../services/data-provider/alpha-vantage/alpha-vantage.service';
import { RakutenRapidApiService } from '../../services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '../../services/data-provider/yahoo-finance/yahoo-finance.service';
import { ExchangeRateDataService } from '../../services/exchange-rate-data.service';
import { PrismaService } from '../../services/prisma.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [],
  controllers: [AdminController],
  providers: [
    AdminService,
    AlphaVantageService,
    DataGatheringService,
    DataProviderService,
    ExchangeRateDataService,
    PrismaService,
    RakutenRapidApiService,
    YahooFinanceService
  ]
})
export class AdminModule {}
