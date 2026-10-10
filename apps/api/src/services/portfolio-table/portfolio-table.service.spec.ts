import type { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import type { WatchlistService } from '@ghostfolio/api/app/endpoints/watchlist/watchlist.service';
import type { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { encodeDataSource } from '@ghostfolio/api/helper/data-source.helper';
import type { TableParameters } from '@ghostfolio/api/helper/interfaces/table-parameters.interface';
import type { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import type { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import {
  DEFAULT_LANGUAGE_CODE,
  TAG_ID_EXCLUDE_FROM_ANALYSIS
} from '@ghostfolio/common/config';
import {
  Activity,
  HistoricalDataItem,
  PortfolioPerformanceResponse,
  PortfolioPosition,
  WatchlistResponse
} from '@ghostfolio/common/interfaces';
import { AccountWithValue } from '@ghostfolio/common/types';

import { AssetClass, AssetSubClass, DataSource } from '@prisma/client';

import { PortfolioTableService } from './portfolio-table.service';

/**
 * The markdown table is rendered by a package which ships as an ECMAScript
 * module only, which Jest cannot run. The mock keeps the mapping of the
 * columns and of the rows and writes them in the same shape as the renderer
 */
jest.mock('@ghostfolio/api/helper/markdown-table.helper', () => {
  const { getTableInput } = jest.requireActual<
    typeof import('@ghostfolio/api/helper/markdown-table.helper')
  >('@ghostfolio/api/helper/markdown-table.helper');

  return {
    getTableInput,
    getMarkdownTable: jest.fn(
      (parameters: TableParameters<unknown, unknown>) => {
        const { columns, rows } = getTableInput(parameters);

        const names = columns.map(({ name }) => {
          return name;
        });

        return Promise.resolve(
          [
            names,
            names.map(() => {
              return '---';
            }),
            ...rows.map((row) => {
              return names.map((name) => {
                return row[name];
              });
            })
          ]
            .map((cells) => {
              return `| ${cells.join(' | ')} |`;
            })
            .join('\n')
        );
      }
    )
  };
});

const SUBSCRIPTION_CONFIGURATION = { ENABLE_FEATURE_SUBSCRIPTION: true };

function createAccount({
  id = 'account-a-id',
  isExcluded = false,
  name = 'Account A'
}: {
  id?: string;
  isExcluded?: boolean;
  name?: string;
} = {}) {
  return {
    id,
    name,
    activitiesCount: 3,
    allocationInPercentage: 0.25,
    balance: 1000,
    currency: 'CHF',
    platform: { name: 'Platform A' },
    tags: isExcluded ? [{ id: TAG_ID_EXCLUDE_FROM_ANALYSIS }] : [],
    value: 2000,
    valueInBaseCurrency: 1800
  } as unknown as AccountWithValue;
}

function createActivity({
  dataSource = DataSource.YAHOO,
  symbol = 'AAPL'
}: {
  dataSource?: DataSource;
  symbol?: string;
} = {}) {
  return {
    account: { name: 'Account A' },
    assetProfile: {
      dataSource,
      symbol,
      currency: 'CHF',
      name: `Name of ${symbol}`
    },
    currency: 'CHF',
    date: new Date('2024-01-01'),
    fee: 1.5,
    quantity: 5,
    type: 'BUY',
    unitPrice: 100,
    valueInBaseCurrency: 512.3456
  } as unknown as Activity;
}

function createHolding({
  allocationInPercentage = 0.75,
  assetClass = AssetClass.EQUITY,
  assetSubClass = AssetSubClass.STOCK,
  dataSource = DataSource.YAHOO,
  symbol = 'AAPL'
}: {
  allocationInPercentage?: number;
  assetClass?: AssetClass;
  assetSubClass?: AssetSubClass;
  dataSource?: DataSource;
  symbol?: string;
} = {}) {
  return {
    allocationInPercentage,
    activitiesCount: 3,
    assetProfile: {
      assetClass,
      assetSubClass,
      dataSource,
      symbol,
      currency: 'CHF',
      name: `Name of ${symbol}`
    },
    dateOfFirstActivity: new Date('2024-01-01'),
    grossPerformance: 100,
    marketPrice: 400,
    netPerformance: 90,
    quantity: 5,
    valueInBaseCurrency: 2000
  } as unknown as PortfolioPosition;
}

function createPerformance({
  netPerformance = 200,
  netPerformancePercentage = 0.1,
  netPerformancePercentageWithCurrencyEffect = 0.15,
  netPerformanceWithCurrencyEffect = 300
}: {
  netPerformance?: number;
  netPerformancePercentage?: number;
  netPerformancePercentageWithCurrencyEffect?: number;
  netPerformanceWithCurrencyEffect?: number;
} = {}): PortfolioPerformanceResponse['performance'] {
  return {
    netPerformance,
    netPerformancePercentage,
    netPerformancePercentageWithCurrencyEffect,
    netPerformanceWithCurrencyEffect,
    currentNetWorth: 3000,
    currentValueInBaseCurrency: 2000,
    dividendInBaseCurrency: 50,
    totalInvestment: 1700,
    totalInvestmentValueWithCurrencyEffect: 1700
  };
}

function createWatchlistItem({
  dataSource = DataSource.YAHOO,
  name = 'Name of AAPL',
  performancePercent = -0.25,
  symbol = 'AAPL'
}: {
  dataSource?: DataSource;
  name?: string;
  performancePercent?: number;
  symbol?: string;
} = {}): WatchlistResponse['watchlist'][number] {
  return {
    dataSource,
    name,
    symbol,
    marketCondition: 'BEAR_MARKET',
    performances: {
      allTimeHigh: {
        performancePercent,
        date: new Date('2024-01-01T00:00:00')
      }
    },
    trend50d: 'UP',
    trend200d: 'DOWN'
  };
}

function createPortfolioTableService({
  accounts = [],
  activities = [],
  chart = [{ date: '2024-01-01' }],
  configuration = { ENABLE_FEATURE_SUBSCRIPTION: false },
  holdings = [],
  performance = createPerformance(),
  watchlist = []
}: {
  accounts?: AccountWithValue[];
  activities?: Activity[];
  chart?: HistoricalDataItem[];
  configuration?: Record<string, unknown>;
  holdings?: PortfolioPosition[];
  performance?: PortfolioPerformanceResponse['performance'];
  watchlist?: WatchlistResponse['watchlist'];
} = {}) {
  const activitiesService = {
    getActivities: jest
      .fn()
      .mockResolvedValue({ activities, count: activities.length })
  } as unknown as ActivitiesService;

  const configurationService = {
    get: jest.fn((key: string) => {
      return configuration[key];
    })
  } as unknown as ConfigurationService;

  // The mock gives the identifier of the translation, so that a test can tell
  // the translation of the asset class from that of the asset sub class
  const i18nService = {
    getTranslation: jest.fn(({ id }: { id: string }) => {
      return `translation of ${id}`;
    })
  } as unknown as I18nService;

  const portfolioService = {
    getAccountsWithAggregations: jest.fn().mockResolvedValue({ accounts }),
    getDetails: jest.fn().mockResolvedValue({ holdings }),
    getPerformance: jest.fn().mockResolvedValue({ chart, performance })
  } as unknown as PortfolioService;

  const watchlistService = {
    getWatchlistItems: jest.fn().mockResolvedValue(watchlist)
  } as unknown as WatchlistService;

  return new PortfolioTableService(
    activitiesService,
    configurationService,
    i18nService,
    portfolioService,
    watchlistService
  );
}

describe('PortfolioTableService', () => {
  // A column with a monetary value is given only with the values, hence the
  // names of these columns are given separately
  describe('getAccountsTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(PortfolioTableService.getAccountsTableColumnNames()).toEqual([
        'Id',
        'Name',
        'Currency',
        'Platform',
        'Activities Count',
        'Allocation in Percentage',
        'Excluded from Analysis'
      ]);
    });
  });

  describe('getAccountsTableValueColumnNames', () => {
    it('gives the columns with a monetary value', () => {
      expect(PortfolioTableService.getAccountsTableValueColumnNames()).toEqual([
        'Balance',
        'Value in Base Currency'
      ]);
    });
  });

  describe('getActivitiesTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(PortfolioTableService.getActivitiesTableColumnNames()).toEqual([
        'Date',
        'Type',
        'Name',
        'Symbol',
        'Data Source',
        'Currency',
        'Unit Price',
        'Account'
      ]);
    });
  });

  describe('getActivitiesTableValueColumnNames', () => {
    it('gives the columns with a quantity or with a monetary value', () => {
      expect(
        PortfolioTableService.getActivitiesTableValueColumnNames()
      ).toEqual(['Quantity', 'Fee', 'Value in Base Currency']);
    });
  });

  describe('getHoldingsTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(PortfolioTableService.getHoldingsTableColumnNames()).toEqual([
        'Name',
        'Symbol',
        'Data Source',
        'Currency',
        'Asset Class',
        'Asset Sub Class',
        'Date of First Activity',
        'Activities Count',
        'Allocation in Percentage'
      ]);
    });
  });

  describe('getHoldingsTableValueColumnNames', () => {
    it('gives the columns with a quantity or with a monetary value', () => {
      expect(PortfolioTableService.getHoldingsTableValueColumnNames()).toEqual([
        'Quantity',
        'Market Price',
        'Value in Base Currency'
      ]);
    });
  });

  describe('getPerformanceTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(PortfolioTableService.getPerformanceTableColumnNames()).toEqual([
        'Asset Performance in Percentage',
        'Currency Performance in Percentage',
        'Net Performance in Percentage'
      ]);
    });
  });

  describe('getPerformanceTableValueColumnNames', () => {
    it('gives the columns with a monetary value', () => {
      expect(
        PortfolioTableService.getPerformanceTableValueColumnNames()
      ).toEqual([
        'Current Value in Base Currency',
        'Asset Performance in Base Currency',
        'Currency Performance in Base Currency',
        'Net Performance in Base Currency'
      ]);
    });
  });

  describe('getWatchlistTableColumnNames', () => {
    it('gives no column with a monetary value', () => {
      expect(PortfolioTableService.getWatchlistTableColumnNames()).toEqual([
        'Name',
        'Symbol',
        'Data Source',
        'Trend 50 Days',
        'Trend 200 Days',
        'Date of Last All Time High',
        'Change from All Time High',
        'Market Condition'
      ]);
    });
  });

  describe('getAccountsTable', () => {
    it('gives no cash balance and no value of an account', async () => {
      const portfolioTableService = createPortfolioTableService({
        accounts: [createAccount()]
      });

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      expect(result).not.toContain('Cash Balance');
      expect(result).not.toContain('1000');
      expect(result).not.toContain('1800');
      expect(result).not.toContain('2000');
    });

    it('gives the balance and the value with the values', async () => {
      const portfolioTableService = createPortfolioTableService({
        accounts: [createAccount()]
      });

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id',
        withValues: true
      });

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| account-a-id');
      });

      expect(row).toMatch(/\| false \| 1000 \| 1800\.00 \|$/);
    });

    // The accountIds parameter of the tool takes the identifiers, hence the
    // table has to give them
    it('gives the identifier of an account', async () => {
      const portfolioTableService = createPortfolioTableService({
        accounts: [createAccount()]
      });

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      expect(result).toContain('account-a-id');
    });

    it('marks an account which is excluded from the analysis', async () => {
      const portfolioTableService = createPortfolioTableService({
        accounts: [
          createAccount({ isExcluded: true }),
          createAccount({ id: 'account-b-id', name: 'Account B' })
        ]
      });

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      const [rowOfAccountA, rowOfAccountB] = result
        .split('\n')
        .filter((line) => {
          return line.startsWith('| account-');
        });

      expect(rowOfAccountA).toContain('true');
      expect(rowOfAccountB).toContain('false');
    });

    it('tells that no accounts are found if the result is empty', async () => {
      const portfolioTableService = createPortfolioTableService();

      const result = await portfolioTableService.getAccountsTable({
        userId: 'user-id'
      });

      expect(result).toContain('No accounts found.');
    });
  });

  describe('getActivitiesTable', () => {
    it('gives the data source, encoded if the subscription is enabled', async () => {
      const result = await createPortfolioTableService({
        activities: [
          createActivity({ dataSource: DataSource.YAHOO, symbol: 'AAPL' }),
          createActivity({
            dataSource: DataSource.MANUAL,
            symbol: 'GF_GOLD'
          })
        ],
        configuration: SUBSCRIPTION_CONFIGURATION
      }).getActivitiesTable({
        take: 50,
        userCurrency: 'CHF',
        userId: 'user-id'
      });

      const [rowOfAapl, rowOfGold] = result.split('\n').filter((line) => {
        return line.startsWith('| 2024-01-01');
      });

      expect(rowOfAapl).toContain(`| ${encodeDataSource(DataSource.YAHOO)} |`);
      expect(rowOfGold).toContain(`| ${DataSource.MANUAL} |`);
    });

    it('gives no quantity, no fee and no value by default', async () => {
      const result = await createPortfolioTableService({
        activities: [createActivity()]
      }).getActivitiesTable({
        take: 50,
        userCurrency: 'CHF',
        userId: 'user-id'
      });

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| 2024-01-01');
      });

      expect(result).not.toContain('Quantity');
      expect(row).toMatch(/\| 100 \| Account A \|$/);
    });

    it('gives the quantity, the fee and the value with the values', async () => {
      const result = await createPortfolioTableService({
        activities: [createActivity()]
      }).getActivitiesTable({
        take: 50,
        userCurrency: 'CHF',
        userId: 'user-id',
        withValues: true
      });

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| 2024-01-01');
      });

      expect(row).toMatch(/\| Account A \| 5 \| 1\.5 \| 512\.35 \|$/);
    });
  });

  describe('getHoldingsTable', () => {
    function getHoldingsTable(
      holdings: PortfolioPosition[],
      {
        configuration,
        withDataSource,
        withValues
      }: {
        configuration?: Record<string, unknown>;
        withDataSource?: boolean;
        withValues?: boolean;
      } = {}
    ) {
      return createPortfolioTableService({
        configuration,
        holdings
      }).getHoldingsTable({
        withDataSource,
        withValues,
        languageCode: DEFAULT_LANGUAGE_CODE,
        userId: 'user-id'
      });
    }

    it('gives no data source by default', async () => {
      const result = await getHoldingsTable([createHolding()], {
        configuration: SUBSCRIPTION_CONFIGURATION
      });

      expect(result).not.toContain('Data Source');
      expect(result).not.toContain(encodeDataSource(DataSource.YAHOO));
    });

    it('gives the data source, encoded if the subscription is enabled', async () => {
      const result = await getHoldingsTable(
        [
          createHolding({ dataSource: DataSource.YAHOO, symbol: 'AAPL' }),
          createHolding({
            allocationInPercentage: 0.25,
            dataSource: DataSource.MANUAL,
            symbol: 'GF_GOLD'
          })
        ],
        { configuration: SUBSCRIPTION_CONFIGURATION, withDataSource: true }
      );

      const [rowOfAapl, rowOfGold] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of');
      });

      expect(rowOfAapl).toContain(`| ${encodeDataSource(DataSource.YAHOO)} |`);
      expect(rowOfGold).toContain(`| ${DataSource.MANUAL} |`);
    });

    it('gives the data source unencoded if the subscription is disabled', async () => {
      const result = await getHoldingsTable([createHolding()], {
        configuration: { ENABLE_FEATURE_SUBSCRIPTION: false },
        withDataSource: true
      });

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of AAPL');
      });

      expect(row).toContain(`| ${DataSource.YAHOO} |`);
    });

    it('gives no data source of a cash position', async () => {
      const result = await getHoldingsTable(
        [
          createHolding({
            assetClass: AssetClass.LIQUIDITY,
            assetSubClass: AssetSubClass.CASH,
            dataSource: DataSource.YAHOO,
            symbol: 'USD'
          })
        ],
        { configuration: SUBSCRIPTION_CONFIGURATION, withDataSource: true }
      );

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of USD');
      });

      expect(row).toContain('| USD |  | CHF |');
      expect(row).not.toContain(encodeDataSource(DataSource.YAHOO));
    });

    it('gives the translation of the asset class and of the asset sub class', async () => {
      const result = await getHoldingsTable([createHolding()]);

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of AAPL');
      });

      expect(row).toContain('translation of assetClass.EQUITY');
      expect(row).toContain('translation of assetSubClass.STOCK');
    });

    it('gives the holding with the largest allocation first', async () => {
      const result = await getHoldingsTable([
        createHolding({ allocationInPercentage: 0.25, symbol: 'MSFT' }),
        createHolding({ allocationInPercentage: 0.75, symbol: 'AAPL' })
      ]);

      const [firstRow, secondRow] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of');
      });

      expect(firstRow).toContain('AAPL');
      expect(secondRow).toContain('MSFT');
    });

    it('gives no quantity and no value by default', async () => {
      const result = await getHoldingsTable([createHolding()]);

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of AAPL');
      });

      expect(result).not.toContain('Quantity');
      expect(row).toMatch(/\| 75\.000% \|$/);
    });

    it('gives the quantity, the market price and the value with the values', async () => {
      const result = await getHoldingsTable([createHolding()], {
        withValues: true
      });

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of AAPL');
      });

      expect(row).toMatch(/\| 75\.000% \| 5 \| 400 \| 2000\.00 \|$/);
    });
  });

  describe('getPerformanceTable', () => {
    function getPerformanceTable(
      parameters: Parameters<typeof createPortfolioTableService>[0] = {},
      withValues?: boolean
    ) {
      return createPortfolioTableService(parameters).getPerformanceTable({
        withValues,
        dateRange: 'ytd',
        userId: 'user-id'
      });
    }

    it('gives the currency performance as the difference of the net performance and the asset performance', async () => {
      const result = await getPerformanceTable();

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| 10.000%');
      });

      expect(row).toBe('| 10.000% | 5.000% | 15.000% |');
    });

    it('gives a currency performance of zero without a sign', async () => {
      const result = await getPerformanceTable({
        performance: createPerformance({
          netPerformancePercentage: 0.10000000000000003,
          netPerformancePercentageWithCurrencyEffect: 0.1
        })
      });

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| 10.000%');
      });

      expect(row).toBe('| 10.000% | 0.000% | 10.000% |');
    });

    it('gives no monetary value', async () => {
      const result = await getPerformanceTable();

      const [, , row] = result.split('\n').filter((line) => {
        return line.startsWith('|');
      });

      for (const cell of row.split('|').slice(1, -1)) {
        expect(cell.trim()).toMatch(/^-?\d+\.\d{3}%$/);
      }
    });

    it('gives the current value and the performance in base currency with the values', async () => {
      const result = await getPerformanceTable({}, true);

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| 10.000%');
      });

      expect(row).toBe(
        '| 10.000% | 5.000% | 15.000% | 2000.00 | 200.00 | 100.00 | 300.00 |'
      );
    });

    it('gives a currency performance in base currency of zero without a sign', async () => {
      const result = await getPerformanceTable(
        {
          performance: createPerformance({
            netPerformance: 200.000001,
            netPerformanceWithCurrencyEffect: 200
          })
        },
        true
      );

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| 10.000%');
      });

      expect(row).toMatch(/\| 200\.00 \| 0\.00 \| 200\.00 \|$/);
    });

    it('tells that no performance is found if the chart is empty', async () => {
      const result = await getPerformanceTable({ chart: [] });

      expect(result).toContain('No performance found.');
      expect(result).not.toContain('%');
    });
  });

  describe('getWatchlistTable', () => {
    function getWatchlistTable(
      watchlist: WatchlistResponse['watchlist'],
      configuration?: Record<string, unknown>
    ) {
      return createPortfolioTableService({
        configuration,
        watchlist
      }).getWatchlistTable({
        userId: 'user-id'
      });
    }

    it('gives the data source, encoded if the subscription is enabled', async () => {
      const result = await getWatchlistTable(
        [
          createWatchlistItem(),
          createWatchlistItem({
            dataSource: DataSource.MANUAL,
            name: 'Name of GF_GOLD',
            symbol: 'GF_GOLD'
          })
        ],
        SUBSCRIPTION_CONFIGURATION
      );

      const [rowOfAapl, rowOfGold] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of');
      });

      expect(rowOfAapl).toContain(`| ${encodeDataSource(DataSource.YAHOO)} |`);
      expect(rowOfGold).toContain(`| ${DataSource.MANUAL} |`);
    });

    it('gives the date and the change of the all time high', async () => {
      const result = await getWatchlistTable([createWatchlistItem()]);

      const [row] = result.split('\n').filter((line) => {
        return line.startsWith('| Name of AAPL');
      });

      expect(row).toContain('2024-01-01');
      expect(row).toContain('-25.000%');
    });

    it('tells that no watchlist items are found if the result is empty', async () => {
      const result = await getWatchlistTable([]);

      expect(result).toContain('No watchlist items found.');
    });
  });
});
