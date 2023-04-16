import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { CryptocurrencyModule } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.module';
import { TrackinsightDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/trackinsight/trackinsight.service';
import { YahooFinanceDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/yahoo-finance/yahoo-finance.service';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { YahooFinanceService } from '@ghostfolio/api/services/data-provider/yahoo-finance/yahoo-finance.service';
import { Module } from '@nestjs/common';

@Module({
  exports: [
    'DataEnhancers',
    TrackinsightDataEnhancerService,
    YahooFinanceDataEnhancerService
  ],
  imports: [ConfigurationModule, CryptocurrencyModule, DataProviderModule],
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
    },
    YahooFinanceService
  ]
})
export class DataEnhancerModule {}
