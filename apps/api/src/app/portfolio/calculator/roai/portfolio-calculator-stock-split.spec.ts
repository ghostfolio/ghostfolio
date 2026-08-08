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
import { adjustActivityBySplits } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { Activity } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { AssetProfileSplit, DataSource } from '@prisma/client';
import { Big } from 'big.js';

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

describe('RoaiPortfolioCalculator stock splits', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    configurationService = new ConfigurationService();
    currentRateService = new CurrentRateService(null, null, null, null);
    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );
    portfolioSnapshotService = new PortfolioSnapshotService(null, null);
    redisCacheService = new RedisCacheService(null, null);
    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  it('doubles the position and halves the average price for a 2:1 split', () => {
    const activity = adjustActivityBySplits(
      createActivity({ unitPrice: 100 }),
      [createSplit({ denominator: 1, numerator: 2 })]
    );

    const position = getLastPosition(portfolioCalculatorFactory, [activity]);

    expect(position).toMatchObject({
      averagePrice: new Big(50),
      investment: new Big(1000),
      quantity: new Big(20)
    });
  });

  it('applies the inverse quantity and price changes for a reverse split', () => {
    const activity = adjustActivityBySplits(
      createActivity({ unitPrice: 100 }),
      [createSplit({ denominator: 10, numerator: 1 })]
    );

    const position = getLastPosition(portfolioCalculatorFactory, [activity]);

    expect(position).toMatchObject({
      averagePrice: new Big(1000),
      investment: new Big(1000),
      quantity: new Big(1)
    });
  });

  it('uses adjusted quantities when selling after a split', () => {
    const buy = adjustActivityBySplits(
      createActivity({ date: '2020-01-01', unitPrice: 100 }),
      [createSplit({ denominator: 1, numerator: 2 })]
    );
    const sell = createActivity({
      date: '2021-01-01',
      quantity: 5,
      type: 'SELL',
      unitPrice: 60
    });

    const position = getLastPosition(portfolioCalculatorFactory, [buy, sell]);

    expect(position).toMatchObject({
      averagePrice: new Big(50),
      investment: new Big(750),
      quantity: new Big(15)
    });
  });

  it('applies multiple splits while preserving fractional precision', () => {
    const activity = adjustActivityBySplits(
      createActivity({ unitPrice: 100 }),
      [
        createSplit({ denominator: 1, numerator: 2 }),
        createSplit({ denominator: 3, numerator: 1, date: '2022-01-01' })
      ]
    );

    const position = getLastPosition(portfolioCalculatorFactory, [activity]);

    expect(position.averagePrice).toEqual(new Big(150));
    expect(position.quantity.toFixed(15)).toBe(new Big(20).div(3).toFixed(15));
    expect(position.investment.toNumber()).toBeCloseTo(1000, 12);
  });

  it('resets quantity and investment when the adjusted position is closed', () => {
    const buy = adjustActivityBySplits(
      createActivity({ date: '2020-01-01', unitPrice: 100 }),
      [createSplit({ denominator: 1, numerator: 2 })]
    );
    const sell = createActivity({
      date: '2021-01-01',
      quantity: 20,
      type: 'SELL',
      unitPrice: 60
    });

    const position = getLastPosition(portfolioCalculatorFactory, [buy, sell]);

    expect(position.quantity).toEqual(new Big(0));
    expect(position.investment).toEqual(new Big(0));
  });

  it('preserves existing behavior when no splits exist', () => {
    const position = getLastPosition(portfolioCalculatorFactory, [
      createActivity({ unitPrice: 100 })
    ]);

    expect(position).toMatchObject({
      averagePrice: new Big(100),
      investment: new Big(1000),
      quantity: new Big(10)
    });
  });

  it('uses provider market data without adjusting it a second time', async () => {
    jest.useFakeTimers().setSystemTime(parseDate('2023-07-10').getTime());

    const activity = adjustActivityBySplits(
      createActivity({ date: '2023-07-09', unitPrice: 674.44 }),
      [
        createSplit({
          date: '2023-07-10',
          denominator: 1,
          numerator: 2
        })
      ]
    );
    const calculator = portfolioCalculatorFactory.createCalculator({
      activities: [activity],
      calculationType: PerformanceCalculationType.ROAI,
      currency: 'USD',
      userId: userDummyData.id
    });

    const snapshot = await calculator.computeSnapshot();
    const [position] = snapshot.positions;

    expect(position).toMatchObject({
      investment: new Big(6744.4),
      marketPrice: 331.83,
      quantity: new Big(20),
      valueInBaseCurrency: new Big(6636.6)
    });
  });
});

function getLastPosition(
  portfolioCalculatorFactory: PortfolioCalculatorFactory,
  activities: Activity[]
) {
  const calculator = portfolioCalculatorFactory.createCalculator({
    activities,
    calculationType: PerformanceCalculationType.ROAI,
    currency: 'USD',
    userId: userDummyData.id
  });

  return calculator.getTransactionPoints().at(-1).items[0];
}

function createActivity({
  date = '2020-01-01',
  quantity = 10,
  type = 'BUY',
  unitPrice = 100
}: {
  date?: string;
  quantity?: number;
  type?: Activity['type'];
  unitPrice?: number;
}): Activity {
  return {
    ...activityDummyData,
    assetProfile: {
      ...assetProfileDummyData,
      currency: 'USD',
      dataSource: DataSource.YAHOO,
      name: 'Microsoft Inc.',
      symbol: 'MSFT'
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
  } as Activity;
}

function createSplit({
  date = '2021-01-01',
  denominator,
  numerator
}: {
  date?: string;
  denominator: number;
  numerator: number;
}): AssetProfileSplit {
  const splitDate = parseDate(date);

  return {
    createdAt: splitDate,
    date: splitDate,
    denominator,
    id: `${date}-${numerator}-${denominator}`,
    numerator,
    symbolProfileId: 'msft-profile',
    updatedAt: splitDate
  };
}
