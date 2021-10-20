import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { TrackinsightDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/trackinsight/trackinsight.service';
import { GhostfolioScraperApiService } from '@ghostfolio/api/services/data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { RakutenRapidApiService } from '@ghostfolio/api/services/data-provider/rakuten-rapid-api/rakuten-rapid-api.service';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { PrismaModule } from '@ghostfolio/api/services/prisma.module';
import { Module } from '@nestjs/common';

import { AlphaVantageService } from './alpha-vantage/alpha-vantage.service';
import { DataProviderService } from './data-provider.service';

@Module({
  imports: [ConfigurationModule, PrismaModule],
  providers: [
    AlphaVantageService,
    DataProviderService,
    GhostfolioScraperApiService,
    RakutenRapidApiService,
    TrackinsightDataEnhancerService,
    YahooFinanceService,
    {
      inject: [TrackinsightDataEnhancerService],
      provide: 'DataEnhancers',
      useFactory: (trackinsight) => [trackinsight]
    },
    {
      inject: [
        AlphaVantageService,
        GhostfolioScraperApiService,
        RakutenRapidApiService,
        YahooFinanceService
      ],
      provide: 'DataProviderInterfaces',
      useFactory: (
        alphaVantageService,
        ghostfolioScraperApiService,
        rakutenRapidApiService,
        yahooFinanceService
      ) => [
        alphaVantageService,
        ghostfolioScraperApiService,
        rakutenRapidApiService,
        yahooFinanceService
      ]
    }
  ],
  exports: [DataProviderService, GhostfolioScraperApiService]
})
export class DataProviderModule {}
