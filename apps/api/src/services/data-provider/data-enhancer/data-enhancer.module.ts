import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { CryptocurrencyModule } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.module';
import { TrackinsightDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/trackinsight/trackinsight.service';
import { YahooFinanceDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/yahoo-finance/yahoo-finance.service';
import { Module } from '@nestjs/common';

@Module({
  exports: [
    'DataEnhancers',
    TrackinsightDataEnhancerService,
    YahooFinanceDataEnhancerService
  ],
  imports: [ConfigurationModule, CryptocurrencyModule],
  providers: [
    TrackinsightDataEnhancerService,
    YahooFinanceDataEnhancerService,
    {
      // Yahoo Finance before Trackinsight
      inject: [
        YahooFinanceDataEnhancerService,
        TrackinsightDataEnhancerService
      ],
      provide: 'DataEnhancers',
      useFactory: (yahooFinance, trackinsight) => [yahooFinance, trackinsight]
    }
  ]
})
export class DataEnhancerModule {}
