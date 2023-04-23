import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
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
      inject: [
        TrackinsightDataEnhancerService,
        YahooFinanceDataEnhancerService
      ],
      provide: 'DataEnhancers',
      useFactory: (trackinsight, yahooFinance) => [trackinsight, yahooFinance]
    }
  ]
})
export class DataEnhancerModule {}
