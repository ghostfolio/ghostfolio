import {
  activityDummyData,
  assetProfileDummyData,
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
import { parseDate } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Big } from 'big.js';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => ({
  CurrentRateService: jest.fn().mockImplementation(() => CurrentRateServiceMock)
}));

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => ({
    PortfolioSnapshotService: jest
      .fn()
      .mockImplementation(() => PortfolioSnapshotServiceMock)
  })
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => ({
  RedisCacheService: jest.fn().mockImplementation(() => RedisCacheServiceMock)
}));

describe('PortfolioCalculator average price after a partial sell', () => {
  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();
  });

  it('reconciles realized and unrealized performance with cash flows', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2022-04-11').getTime());

    const portfolioCalculator = new PortfolioCalculatorFactory(
      new ConfigurationService(),
      new CurrentRateService(null, null, null),
      new ExchangeRateDataService(null, null, null, null),
      new PortfolioSnapshotService(null, null),
      new RedisCacheService(null, null)
    ).createCalculator({
      activities: [
        createActivity('2022-03-01', 'BUY', 10, 100),
        createActivity('2022-03-07', 'SELL', 4, 120),
        createActivity('2022-03-14', 'BUY', 6, 200),
        createActivity('2022-04-08', 'SELL', 4, 220)
      ],
      calculationType: PerformanceCalculationType.ROAI,
      currency: 'CHF',
      userId: userDummyData.id
    });

    const { positions } = await portfolioCalculator.computeSnapshot();
    const [position] = positions;

    // Proceeds 4*120 + 4*220, purchases 10*100 + 6*200,
    // current value 8*87.8, and fees 0: 1360 - 2200 + 702.4 = -137.6.
    const expectedNetPerformance = new Big(4)
      .mul(120)
      .plus(new Big(4).mul(220))
      .minus(new Big(10).mul(100))
      .minus(new Big(6).mul(200))
      .plus(new Big(8).mul('87.8'));

    expect(position.quantity).toEqual(new Big(8));
    expect(position.netPerformance).toEqual(expectedNetPerformance);
    expect(position.netPerformanceWithCurrencyEffectMap.max).toEqual(
      expectedNetPerformance
    );
  });
});

function createActivity(
  date: string,
  type: Activity['type'],
  quantity: number,
  unitPrice: number
): Activity {
  return {
    ...activityDummyData,
    assetProfile: {
      ...assetProfileDummyData,
      currency: 'CHF',
      dataSource: 'YAHOO',
      name: 'Synthetic holding',
      symbol: 'NOVN.SW'
    },
    date: parseDate(date),
    feeInAssetProfileCurrency: 0,
    feeInBaseCurrency: 0,
    quantity,
    type,
    unitPrice,
    unitPriceInAssetProfileCurrency: unitPrice,
    value: quantity * unitPrice,
    valueInBaseCurrency: quantity * unitPrice
  };
}
