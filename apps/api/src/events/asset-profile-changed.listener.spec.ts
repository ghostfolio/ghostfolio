import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS } from '@ghostfolio/common/config';
import { parseDate } from '@ghostfolio/common/helper';

import { DataSource } from '@prisma/client';

import { AssetProfileChangedListener } from './asset-profile-changed.listener';

describe('AssetProfileChangedListener', () => {
  describe('processAssetProfileChanged', () => {
    it('retains the completed exchange rate job for the duration of the cooldown', async () => {
      const gatherSymbol = jest.fn();

      const listener = new AssetProfileChangedListener(
        {
          getStatisticsByCurrency: jest.fn().mockResolvedValue({
            dateOfFirstActivity: parseDate('2026-01-01')
          })
        } as unknown as ActivitiesService,
        {
          get: jest.fn().mockReturnValue(true)
        } as unknown as ConfigurationService,
        { gatherSymbol } as unknown as DataGatheringService,
        {
          getDataSourceForExchangeRates: jest
            .fn()
            .mockReturnValue(DataSource.YAHOO)
        } as unknown as DataProviderService,
        {
          getCurrencies: jest.fn().mockReturnValue(['EUR', 'USD'])
        } as unknown as ExchangeRateDataService
      );

      await listener['processAssetProfileChanged']({
        currency: 'EUR',
        dataSource: DataSource.YAHOO,
        symbol: 'PPFB.DE'
      });

      expect(gatherSymbol).toHaveBeenCalledWith({
        dataSource: DataSource.YAHOO,
        date: parseDate('2026-01-01'),
        removeOnComplete: {
          age: GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS / 1000
        },
        symbol: 'USDEUR'
      });
    });
  });
});
