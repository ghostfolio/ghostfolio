import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { CryptocurrencyModule } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.module';
import { AlphaVantageService } from '@ghostfolio/api/services/data-provider/alpha-vantage/alpha-vantage.service';
import { EodHistoricalDataService } from '@ghostfolio/api/services/data-provider/eod-historical-data/eod-historical-data.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { GoogleSheetsService } from '@ghostfolio/api/services/data-provider/google-sheets/google-sheets.service';
import { ManualService } from '@ghostfolio/api/services/data-provider/manual/manual.service';
import { RakutenRapidApiService } from '@ghostfolio/api/services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile.module';
import { Module } from '@nestjs/common';

import { DataProviderService } from './data-provider.service';

@Module({
  imports: [
    ConfigurationModule,
    CryptocurrencyModule,
    PrismaModule,
    SymbolProfileModule
  ],
  providers: [
    AlphaVantageService,
    DataProviderService,
    EodHistoricalDataService,
    GhostfolioScraperApiService,
    GoogleSheetsService,
    ManualService,
    RakutenRapidApiService,
    YahooFinanceService,
    {
      inject: [
        AlphaVantageService,
        EodHistoricalDataService,
        GhostfolioScraperApiService,
        GoogleSheetsService,
        ManualService,
        RakutenRapidApiService,
        YahooFinanceService
      ],
      provide: 'DataProviderInterfaces',
      useFactory: (
        alphaVantageService,
        eodHistoricalDataService,
        ghostfolioScraperApiService,
        googleSheetsService,
        manualService,
        rakutenRapidApiService,
        yahooFinanceService
      ) => [
        alphaVantageService,
        eodHistoricalDataService,
        ghostfolioScraperApiService,
        googleSheetsService,
        manualService,
        rakutenRapidApiService,
        yahooFinanceService
      ]
    }
  ],
  exports: [DataProviderService, GhostfolioScraperApiService]
})
export class DataProviderModule {}
