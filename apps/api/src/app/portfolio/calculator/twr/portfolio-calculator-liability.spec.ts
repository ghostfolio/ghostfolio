import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import {
  PortfolioCalculatorFactory,
  PerformanceCalculationType
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { parseDate } from '@ghostfolio/common/helper';

import { Big } from 'big.js';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let factory: PortfolioCalculatorFactory;
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

    redisCacheService = new RedisCacheService(null, null);

    factory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      redisCacheService
    );
  });

  describe('compute portfolio snapshot', () => {
    it.only('with liability activity', async () => {
      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2022-01-31').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2023-01-01'), // Date in future
          fee: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'USD',
            dataSource: 'MANUAL',
            name: 'Loan',
            symbol: '55196015-1365-4560-aa60-8751ae6d18f8'
          },
          type: 'LIABILITY',
          unitPrice: 3000
        }
      ];

      const portfolioCalculator = factory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.TWR,
        currency: 'USD',
        hasFilters: false,
        userId: userDummyData.id
      });

      spy.mockRestore();

      const liabilitiesInBaseCurrency =
        await portfolioCalculator.getLiabilitiesInBaseCurrency();

      expect(liabilitiesInBaseCurrency).toEqual(new Big(3000));
    });
  });
});
