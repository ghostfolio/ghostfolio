import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CryptocurrencyModule } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.module';
import { AlphaVantageService } from '@ghostfolio/api/services/data-provider/alpha-vantage/alpha-vantage.service';
import { CoinGeckoService } from '@ghostfolio/api/services/data-provider/coingecko/coingecko.service';
import { YahooFinanceDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/yahoo-finance/yahoo-finance.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { EodHistoricalDataService } from '@ghostfolio/api/services/data-provider/eod-historical-data/eod-historical-data.service';
import { FinancialModelingPrepService } from '@ghostfolio/api/services/data-provider/financial-modeling-prep/financial-modeling-prep.service';
import { GoogleSheetsService } from '@ghostfolio/api/services/data-provider/google-sheets/google-sheets.service';
import { ManualService } from '@ghostfolio/api/services/data-provider/manual/manual.service';
import { RapidApiService } from '@ghostfolio/api/services/data-provider/rapid-api/rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PrismaModule } from '@ghostfolio/api/services/prisma/prisma.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { SymbolProfileModule } from '@ghostfolio/api/services/symbol-profile/symbol-profile.module';

import { Module } from '@nestjs/common';

import { GhostfolioController } from './ghostfolio.controller';
import { GhostfolioService } from './ghostfolio.service';

@Module({
  controllers: [GhostfolioController],
  imports: [
    CryptocurrencyModule,
    DataProviderModule,
    MarketDataModule,
    PrismaModule,
    PropertyModule,
    RedisCacheModule,
    SymbolProfileModule
  ],
  providers: [
    AlphaVantageService,
    CoinGeckoService,
    ConfigurationService,
    DataProviderService,
    EodHistoricalDataService,
    FinancialModelingPrepService,
    GhostfolioService,
    GoogleSheetsService,
    ManualService,
    RapidApiService,
    YahooFinanceService,
    YahooFinanceDataEnhancerService,
    {
      inject: [
        AlphaVantageService,
        CoinGeckoService,
        EodHistoricalDataService,
        FinancialModelingPrepService,
        GoogleSheetsService,
        ManualService,
        RapidApiService,
        YahooFinanceService
      ],
      provide: 'DataProviderInterfaces',
      useFactory: (
        alphaVantageService,
        coinGeckoService,
        eodHistoricalDataService,
        financialModelingPrepService,
        googleSheetsService,
        manualService,
        rapidApiService,
        yahooFinanceService
      ) => [
        alphaVantageService,
        coinGeckoService,
        eodHistoricalDataService,
        financialModelingPrepService,
        googleSheetsService,
        manualService,
        rapidApiService,
        yahooFinanceService
      ]
    }
  ]
})
export class GhostfolioModule {}
