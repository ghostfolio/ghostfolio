/**
 * @jest-environment <rootDir>/jest-environment-tz.js
 * @jest-environment-options {"timeZone": "America/Toronto"}
 */
import {
  activityDummyData,
  assetProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { parseDate } from '@ghostfolio/common/helper';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

describe('PortfolioCalculator market data dates', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it.each([PerformanceCalculationType.ROI, PerformanceCalculationType.ROAI])(
    'preserves UTC market data dates in %s snapshots',
    async (calculationType) => {
      jest.useFakeTimers().setSystemTime(new Date('2026-11-10T03:46:09.994Z'));

      const currentRateService = new CurrentRateService(null, null, null);
      const exchangeRateDataService = new ExchangeRateDataService(
        null,
        null,
        null,
        null
      );

      jest.spyOn(currentRateService, 'getValues').mockResolvedValue({
        dataProviderInfos: [],
        errors: [],
        values: [
          {
            dataSource: 'YAHOO',
            date: new Date('2026-11-08T00:00:00.000Z'),
            marketPrice: 38,
            symbol: 'VBAL.TO'
          },
          {
            dataSource: 'YAHOO',
            date: new Date('2026-11-09T00:00:00.000Z'),
            marketPrice: 39,
            symbol: 'VBAL.TO'
          }
        ]
      });
      jest
        .spyOn(exchangeRateDataService, 'getExchangeRatesByCurrency')
        .mockResolvedValue({ CADCAD: {} });

      const portfolioCalculatorFactory = new PortfolioCalculatorFactory(
        new ConfigurationService(),
        currentRateService,
        exchangeRateDataService,
        null,
        null
      );
      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        calculationType,
        activities: [
          {
            ...activityDummyData,
            assetProfile: {
              ...assetProfileDummyData,
              currency: 'CAD',
              dataSource: 'YAHOO',
              name: 'VBAL.TO',
              symbol: 'VBAL.TO'
            },
            date: parseDate('2026-11-08'),
            feeInAssetProfileCurrency: 0,
            feeInBaseCurrency: 0,
            quantity: 1,
            type: 'BUY',
            unitPriceInAssetProfileCurrency: 37
          }
        ],
        currency: 'CAD',
        usePortfolioSnapshotCache: false,
        userId: userDummyData.id
      });

      const snapshot = await portfolioCalculator.getSnapshot();

      expect(snapshot).toMatchObject({
        currentValueInBaseCurrency: new Big(39),
        hasErrors: false,
        positions: [{ marketPrice: 39 }]
      });
      expect(snapshot.historicalData).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ date: '2026-11-08', value: 38 }),
          expect.objectContaining({ date: '2026-11-09', value: 39 })
        ])
      );
    }
  );
});
