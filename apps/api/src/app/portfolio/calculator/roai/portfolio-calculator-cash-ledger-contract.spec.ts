import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { calculateCashBalances } from '@ghostfolio/api/app/account-balance/cash-balance-calculator';
import { AccountService } from '@ghostfolio/api/app/account/account.service';
import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import {
  activityDummyData,
  assetProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { AssetProfileSplitService } from '@ghostfolio/api/services/asset-profile-split/asset-profile-split.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { RedisCacheService } from '@ghostfolio/api/services/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/services/redis-cache/redis-cache.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { DataSource } from '@prisma/client';
import { eachDayOfInterval } from 'date-fns';
import { randomUUID } from 'node:crypto';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

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

jest.mock('@ghostfolio/api/services/redis-cache/redis-cache.service', () => {
  return {
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator', () => {
  let accountBalanceService: AccountBalanceService;
  let accountService: AccountService;
  let activitiesService: ActivitiesService;
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let dataProviderService: DataProviderService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    PortfolioSnapshotServiceMock.reset();
    RedisCacheServiceMock.reset();

    configurationService = new ConfigurationService();

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    accountBalanceService = new AccountBalanceService(
      null,
      exchangeRateDataService,
      null
    );

    accountService = new AccountService(
      accountBalanceService,
      null,
      exchangeRateDataService,
      null,
      null
    );

    redisCacheService = new RedisCacheService(null, configurationService);

    dataProviderService = new DataProviderService(
      configurationService,
      null,
      null,
      null,
      null,
      redisCacheService
    );

    currentRateService = new CurrentRateService(
      null,
      dataProviderService,
      null
    );

    activitiesService = new ActivitiesService(
      accountBalanceService,
      accountService,
      {
        getSplitsByUserId: jest.fn().mockResolvedValue([])
      } as unknown as AssetProfileSplitService,
      null,
      null,
      dataProviderService,
      null,
      exchangeRateDataService,
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  afterEach(() => jest.useRealTimers());
  describe.each([
    PerformanceCalculationType.ROAI,
    PerformanceCalculationType.ROI
  ])('Cash ledger financial contract (%s)', (calculationType) => {
    it.each([
      {
        name: 'deposit',
        movements: ['1000', '500'],
        reconciliation: undefined,
        expected: 1500
      },
      {
        name: 'withdrawal',
        movements: ['1000', '-300'],
        reconciliation: undefined,
        expected: 700
      },
      {
        name: 'absolute reconciliation',
        movements: ['1000'],
        reconciliation: '380',
        expected: 380
      },
      {
        name: 'internal transfer',
        movements: ['1000', '-150'],
        reconciliation: undefined,
        expected: 1000,
        destination: 150
      }
    ])(
      '$name changes wealth without creating performance',
      async ({ movements, reconciliation, expected, destination }) => {
        jest.useFakeTimers().setSystemTime(parseDate('2025-01-01').getTime());
        const accountId = randomUUID();
        const events = movements.map((amount, i) => ({
          type: 'MOVEMENT' as const,
          amount,
          date: `2024-01-0${i + 2}`,
          sequence: i + 1
        }));
        const calculation = calculateCashBalances({
          openingBalance: { date: '2024-01-01', sequence: 0, balance: '0' },
          events: [
            ...events,
            ...(reconciliation === undefined
              ? []
              : [
                  {
                    type: 'CHECKPOINT' as const,
                    balance: reconciliation,
                    date: '2024-01-04',
                    sequence: 3
                  }
                ])
          ]
        });
        const accounts = [
          {
            id: accountId,
            currency: 'CHF',
            userId: userDummyData.id,
            balance: expected - (destination ?? 0)
          }
        ];
        if (destination)
          accounts.push({
            id: randomUUID(),
            currency: 'CHF',
            userId: userDummyData.id,
            balance: destination
          });
        const balances = calculation.balances.map(({ date, value }) => ({
          id: randomUUID(),
          accountId,
          date: parseDate(date),
          value: Number(value),
          valueInBaseCurrency: Number(value)
        }));
        if (destination)
          balances.push({
            id: randomUUID(),
            accountId: accounts[1].id,
            date: parseDate('2024-01-03'),
            value: destination,
            valueInBaseCurrency: destination
          });
        jest
          .spyOn(accountBalanceService, 'getAccountBalances')
          .mockImplementation(async ({ filters }) => ({
            balances: balances.filter((b) =>
              filters.some((f) => f.id === b.accountId)
            )
          }));
        jest.spyOn(accountService, 'getCashDetails').mockResolvedValue({
          accounts,
          balanceInBaseCurrency: expected
        } as never);
        jest
          .spyOn(dataProviderService, 'getDataSourceForExchangeRates')
          .mockReturnValue(DataSource.YAHOO);
        jest
          .spyOn(activitiesService, 'getActivities')
          .mockResolvedValue({ activities: [], count: 0 });
        jest.spyOn(currentRateService, 'getValues').mockResolvedValue({
          values: [],
          dataProviderInfos: [],
          errors: []
        });
        const { activities } =
          await activitiesService.getActivitiesForPortfolioCalculator({
            userCurrency: 'CHF',
            userId: userDummyData.id,
            withCash: true
          });
        const calculator = portfolioCalculatorFactory.createCalculator({
          activities,
          calculationType,
          currency: 'CHF',
          userId: userDummyData.id,
          usePortfolioSnapshotCache: false
        });
        const snapshot = await calculator.computeSnapshot();
        expect(snapshot.hasErrors).toBe(false);
        expect(snapshot.currentValueInBaseCurrency.toNumber()).toBe(expected);
        expect(snapshot.totalCashInBaseCurrency.toNumber()).toBe(expected);
        const last = snapshot.historicalData.at(-1);
        expect(last.netWorth).toBe(expected);
        expect(last.netPerformanceWithCurrencyEffect).toBe(0);
        expect(last.netPerformanceInPercentageWithCurrencyEffect).toBe(0);
        expect(last.totalInvestment).toBe(0);
      }
    );
  });
  it.each([PerformanceCalculationType.ROAI, PerformanceCalculationType.ROI])(
    'counts fees once in wealth and preserves upstream investment performance (%s)',
    async (calculationType) => {
      jest.useFakeTimers().setSystemTime(parseDate('2025-01-01').getTime());
      const accountId = randomUUID();
      const calculation = calculateCashBalances({
        openingBalance: { date: '2024-01-01', sequence: 0, balance: '0' },
        events: [
          { type: 'MOVEMENT', date: '2024-01-02', sequence: 1, amount: '998' }, // deposit 1000 less bank fee 2
          { type: 'MOVEMENT', date: '2024-01-03', sequence: 2, amount: '-201' }, // buy two at 100 plus fee 1
          { type: 'MOVEMENT', date: '2024-01-04', sequence: 3, amount: '219' } // sell one at 220 less fee 1
        ]
      });
      jest
        .spyOn(accountBalanceService, 'getAccountBalances')
        .mockResolvedValue({
          balances: calculation.balances.map(({ date, value }) => ({
            id: randomUUID(),
            accountId,
            date: parseDate(date),
            value: Number(value),
            valueInBaseCurrency: Number(value)
          }))
        });
      const account = {
        id: accountId,
        userId: userDummyData.id,
        currency: 'CHF',
        balance: 1016
      };
      jest.spyOn(accountService, 'getCashDetails').mockResolvedValue({
        accounts: [account],
        balanceInBaseCurrency: 1016
      } as never);
      jest
        .spyOn(dataProviderService, 'getDataSourceForExchangeRates')
        .mockReturnValue(DataSource.YAHOO);
      const financialActivities = [
        { date: '2024-01-03', type: 'BUY' as const, quantity: 2, price: 100 },
        { date: '2024-01-04', type: 'SELL' as const, quantity: 1, price: 220 }
      ].map(({ date, type, quantity, price }) => ({
        ...activityDummyData,
        id: randomUUID(),
        accountId,
        date: parseDate(date),
        type,
        quantity,
        currency: 'CHF',
        fee: 1,
        feeInAssetProfileCurrency: 1,
        feeInBaseCurrency: 1,
        unitPrice: price,
        unitPriceInAssetProfileCurrency: price,
        value: quantity * price,
        valueInBaseCurrency: quantity * price,
        assetProfile: {
          ...assetProfileDummyData,
          id: 'cash-contract-stock',
          symbol: 'CASHCONTRACT',
          name: 'Cash contract stock',
          currency: 'CHF',
          dataSource: DataSource.YAHOO
        }
      }));
      // Real fee projection is intentionally limited to unlinked movements; BUY/SELL fees stay on orders.
      activitiesService = new ActivitiesService(
        accountBalanceService,
        accountService,
        { getSplitsByUserId: jest.fn().mockResolvedValue([]) } as never,
        null,
        null,
        dataProviderService,
        null,
        { toCurrencyAtDate: async (value: number) => value } as never,
        null,
        {
          cashEvent: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: randomUUID(),
                accountId,
                date: parseDate('2024-01-02'),
                fee: 2,
                state: { currency: 'CHF', account }
              }
            ])
          }
        } as never,
        null,
        null,
        {} as never
      );
      jest
        .spyOn(activitiesService, 'getActivities')
        .mockResolvedValue({ activities: financialActivities, count: 2 });
      jest
        .spyOn(currentRateService, 'getValues')
        .mockImplementation(async ({ dataGatheringItems, dateQuery }) => ({
          dataProviderInfos: [],
          errors: [],
          values: eachDayOfInterval({
            start: dateQuery.gte,
            end: dateQuery.lt
          }).flatMap((date) =>
            dataGatheringItems
              .filter((x) => x.symbol === 'CASHCONTRACT')
              .map(({ symbol, dataSource }) => ({
                date,
                symbol,
                dataSource,
                marketPrice: date < parseDate('2024-01-04') ? 100 : 220
              }))
          )
        }));
      const { activities } =
        await activitiesService.getActivitiesForPortfolioCalculator({
          userCurrency: 'CHF',
          userId: userDummyData.id,
          withCash: true
        });
      const snapshot = await portfolioCalculatorFactory
        .createCalculator({
          activities,
          calculationType,
          currency: 'CHF',
          userId: userDummyData.id,
          usePortfolioSnapshotCache: false
        })
        .computeSnapshot();
      expect(snapshot.hasErrors).toBe(false);
      expect(snapshot.totalFeesWithCurrencyEffect.toNumber()).toBe(4);
      expect(snapshot.totalCashInBaseCurrency.toNumber()).toBe(1016);
      // Upstream excludes standalone FEE activities from investment performance.
      // Economic portfolio gain is 1236 - 1000 = 236; investment-only performance is 238.
      expect(snapshot.currentValueInBaseCurrency.toNumber() - 1000).toBe(236);
      expect(snapshot.historicalData.at(-1)).toMatchObject({
        netWorth: 1236,
        netPerformanceWithCurrencyEffect: 238,
        valueWithCurrencyEffect: 220
      });
    }
  );
});
