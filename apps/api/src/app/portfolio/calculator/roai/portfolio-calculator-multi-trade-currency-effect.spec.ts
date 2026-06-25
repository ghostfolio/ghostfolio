import {
  activityDummyData,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate, resetHours } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';
import { addDays, format, isBefore } from 'date-fns';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => {
    return {
      PortfolioSnapshotService: jest.fn().mockImplementation(() => {
        return PortfolioSnapshotServiceMock;
      })
    };
  }
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null);

    redisCacheService = new RedisCacheService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  describe('get current positions', () => {
    it('calculates currency-effect return against net invested capital after round-trip trades', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2024-03-02').getTime());

      const exchangeRates: { [date: string]: number } = {};
      const marketPrices: { [date: string]: number } = {};

      for (
        let date = resetHours(parseDate('2023-12-31'));
        isBefore(date, parseDate('2024-03-03'));
        date = addDays(date, 1)
      ) {
        const dateString = format(date, 'yyyy-MM-dd');

        exchangeRates[dateString] = isBefore(date, parseDate('2024-02-01'))
          ? 4
          : isBefore(date, parseDate('2024-03-01'))
            ? 4.1
            : 3.9;

        marketPrices[dateString] = isBefore(date, parseDate('2024-02-01'))
          ? 100
          : isBefore(date, parseDate('2024-03-01'))
            ? 120
            : 500;
      }

      jest
        .spyOn(exchangeRateDataService, 'getExchangeRatesByCurrency')
        .mockResolvedValue({
          MYRMYR: Object.fromEntries(
            Object.keys(exchangeRates).map((date) => [date, 1])
          ),
          USDMYR: exchangeRates
        });

      jest
        .spyOn(currentRateService, 'getValues')
        .mockImplementation(async ({ dataGatheringItems, dateQuery }) => {
          const values = [];

          for (
            let date = resetHours(dateQuery.gte);
            isBefore(date, dateQuery.lt);
            date = addDays(date, 1)
          ) {
            const dateString = format(date, 'yyyy-MM-dd');

            for (const dataGatheringItem of dataGatheringItems) {
              values.push({
                date,
                dataSource: dataGatheringItem.dataSource,
                marketPrice: marketPrices[dateString],
                symbol: dataGatheringItem.symbol
              });
            }
          }

          return { values, dataProviderInfos: [], errors: [] };
        });

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: parseDate('2024-01-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 10,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Micron Technology Inc.',
            symbol: 'MU'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 100
        },
        {
          ...activityDummyData,
          date: parseDate('2024-02-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 10,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Micron Technology Inc.',
            symbol: 'MU'
          },
          type: 'SELL',
          unitPriceInAssetProfileCurrency: 120
        },
        {
          ...activityDummyData,
          date: parseDate('2024-03-01'),
          feeInAssetProfileCurrency: 0,
          feeInBaseCurrency: 0,
          quantity: 3,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'YAHOO',
            name: 'Micron Technology Inc.',
            symbol: 'MU'
          },
          type: 'BUY',
          unitPriceInAssetProfileCurrency: 500
        }
      ];

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.ROAI,
        currency: 'MYR',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const position = portfolioSnapshot.positions.find(({ symbol }) => {
        return symbol === 'MU';
      });

      expect(position).toMatchObject({
        grossPerformanceWithCurrencyEffect: new Big(920),
        investmentWithCurrencyEffect: new Big(5850),
        netPerformanceWithCurrencyEffectMap: {
          max: new Big(920)
        },
        quantity: new Big(3),
        valueInBaseCurrency: new Big(5850)
      });

      expect(
        position.netPerformancePercentageWithCurrencyEffectMap.max
      ).toEqual(new Big(920).div(5850));
    });
  });
});
