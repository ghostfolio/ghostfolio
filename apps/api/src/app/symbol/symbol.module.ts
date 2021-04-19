import { Module } from '@nestjs/common';

import { ConfigurationService } from '../../services/configuration.service';
import { DataProviderService } from '../../services/data-provider.service';
import { AlphaVantageService } from '../../services/data-provider/alpha-vantage/alpha-vantage.service';
import { GhostfolioScraperApiService } from '../../services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '../../services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '../../services/data-provider/yahoo-finance/yahoo-finance.service';
import { PrismaService } from '../../services/prisma.service';
import { SymbolController } from './symbol.controller';
import { SymbolService } from './symbol.service';

@Module({
  imports: [],
  controllers: [SymbolController],
  providers: [
    AlphaVantageService,
    ConfigurationService,
    DataProviderService,
    GhostfolioScraperApiService,
    PrismaService,
    RakutenRapidApiService,
    SymbolService,
    YahooFinanceService
  ]
})
export class SymbolModule {}
