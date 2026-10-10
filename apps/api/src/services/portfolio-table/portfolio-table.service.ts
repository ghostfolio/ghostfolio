import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { WatchlistService } from '@ghostfolio/api/app/endpoints/watchlist/watchlist.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { transformDataSourceInResponse } from '@ghostfolio/api/helper/data-source.helper';
import { TableColumnDefinition } from '@ghostfolio/api/helper/interfaces/table-column-definition.interface';
import { getMarkdownTable } from '@ghostfolio/api/helper/markdown-table.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import {
  DATE_FORMAT,
  isAccountExcluded,
  isCashPosition
} from '@ghostfolio/common/helper';
import {
  Activity,
  Filter,
  PortfolioPerformance,
  WatchlistResponse
} from '@ghostfolio/common/interfaces';
import { AccountWithValue, DateRange } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  Type as ActivityType
} from '@prisma/client';
import { format } from 'date-fns';

import { DataSourceTableContext } from './interfaces/data-source-table-context.interface';
import { HoldingsTableColumnDefinition } from './types/holdings-table-column-definition.type';

const DATA_SOURCE_COLUMN_NAME = 'Data Source';

function getDataSourceColumnDefinition<T>(
  getDataSource: (row: T) => DataSource | undefined
): TableColumnDefinition<T, DataSourceTableContext> {
  return {
    getValue: (row, { configurationService }) => {
      const dataSource = getDataSource(row);

      return dataSource
        ? transformDataSourceInResponse({ configurationService, dataSource })
        : '';
    },
    name: DATA_SOURCE_COLUMN_NAME
  };
}

function getAmount(value: number) {
  const amount = value.toFixed(2);

  return Number.parseFloat(amount) === 0 ? (0).toFixed(2) : amount;
}

function getPercentage(value: number) {
  return `${(value * 100).toFixed(3)}%`;
}

/**
 * Renders the accounts, the activities, the holdings and the performance of a
 * portfolio and the watchlist of its user as a markdown table. A column with a
 * quantity or with a monetary value, except the unit price of an activity, is
 * given only with the values.
 */
@Injectable()
export class PortfolioTableService {
  private static readonly ACCOUNTS_TABLE_COLUMN_DEFINITIONS: TableColumnDefinition<AccountWithValue>[] =
    [
      {
        getValue: ({ id }) => {
          return id;
        },
        name: 'Id'
      },
      {
        getValue: ({ name }) => {
          return name ?? '';
        },
        name: 'Name'
      },
      {
        getValue: ({ currency }) => {
          return currency ?? '';
        },
        name: 'Currency'
      },
      {
        getValue: ({ platform }) => {
          return platform?.name ?? '';
        },
        name: 'Platform'
      },
      {
        align: 'right',
        getValue: ({ activitiesCount }) => {
          return activitiesCount.toString();
        },
        name: 'Activities Count'
      },
      {
        align: 'right',
        getValue: ({ allocationInPercentage }) => {
          return getPercentage(allocationInPercentage);
        },
        name: 'Allocation in Percentage'
      },
      {
        getValue: ({ tags }) => {
          return isAccountExcluded({ tags }).toString();
        },
        name: 'Excluded from Analysis'
      }
    ];

  private static readonly ACCOUNTS_TABLE_VALUE_COLUMN_DEFINITIONS: TableColumnDefinition<AccountWithValue>[] =
    [
      {
        align: 'right',
        getValue: ({ balance }) => {
          return balance.toString();
        },
        name: 'Balance'
      },
      {
        align: 'right',
        getValue: ({ valueInBaseCurrency }) => {
          return getAmount(valueInBaseCurrency);
        },
        name: 'Value in Base Currency'
      }
    ];

  private static readonly ACTIVITIES_TABLE_COLUMN_DEFINITIONS: TableColumnDefinition<
    Activity,
    DataSourceTableContext
  >[] = [
    {
      getValue: ({ date }) => {
        return format(date, DATE_FORMAT);
      },
      name: 'Date'
    },
    {
      getValue: ({ type }) => {
        return type;
      },
      name: 'Type'
    },
    {
      getValue: ({ assetProfile }) => {
        return assetProfile.name ?? '';
      },
      name: 'Name'
    },
    {
      getValue: ({ assetProfile }) => {
        return assetProfile.symbol;
      },
      name: 'Symbol'
    },
    getDataSourceColumnDefinition(({ assetProfile }) => {
      return assetProfile.dataSource;
    }),
    {
      getValue: ({ assetProfile, currency }) => {
        return currency ?? assetProfile.currency;
      },
      name: 'Currency'
    },
    {
      align: 'right',
      getValue: ({ unitPrice }) => {
        return unitPrice.toString();
      },
      name: 'Unit Price'
    },
    {
      getValue: ({ account }) => {
        return account?.name ?? '';
      },
      name: 'Account'
    }
  ];

  private static readonly ACTIVITIES_TABLE_VALUE_COLUMN_DEFINITIONS: TableColumnDefinition<
    Activity,
    DataSourceTableContext
  >[] = [
    {
      align: 'right',
      getValue: ({ quantity }) => {
        return quantity.toString();
      },
      name: 'Quantity'
    },
    {
      align: 'right',
      getValue: ({ fee }) => {
        return fee.toString();
      },
      name: 'Fee'
    },
    {
      align: 'right',
      getValue: ({ valueInBaseCurrency }) => {
        return getAmount(valueInBaseCurrency);
      },
      name: 'Value in Base Currency'
    }
  ];

  private static readonly HOLDINGS_TABLE_COLUMN_DEFINITIONS: HoldingsTableColumnDefinition[] =
    [
      {
        getValue: ({ assetProfile }) => {
          return assetProfile.name;
        },
        name: 'Name'
      },
      {
        getValue: ({ assetProfile }) => {
          return assetProfile.symbol;
        },
        name: 'Symbol'
      },
      getDataSourceColumnDefinition(({ assetProfile }) => {
        return isCashPosition(assetProfile)
          ? undefined
          : assetProfile.dataSource;
      }),
      {
        getValue: ({ assetProfile }) => {
          return assetProfile.currency;
        },
        name: 'Currency'
      },
      {
        getValue: ({ assetProfile }, { assetClassTranslations }) => {
          return assetClassTranslations[assetProfile.assetClass] ?? '';
        },
        name: 'Asset Class'
      },
      {
        getValue: ({ assetProfile }, { assetSubClassTranslations }) => {
          return assetSubClassTranslations[assetProfile.assetSubClass] ?? '';
        },
        name: 'Asset Sub Class'
      },
      {
        getValue: ({ dateOfFirstActivity }) => {
          return dateOfFirstActivity
            ? format(dateOfFirstActivity, DATE_FORMAT)
            : '';
        },
        name: 'Date of First Activity'
      },
      {
        align: 'right',
        getValue: ({ activitiesCount }) => {
          return activitiesCount.toString();
        },
        name: 'Activities Count'
      },
      {
        align: 'right',
        getValue: ({ allocationInPercentage }) => {
          return getPercentage(allocationInPercentage);
        },
        name: 'Allocation in Percentage'
      }
    ];

  private static readonly HOLDINGS_TABLE_VALUE_COLUMN_DEFINITIONS: HoldingsTableColumnDefinition[] =
    [
      {
        align: 'right',
        getValue: ({ quantity }) => {
          return quantity.toString();
        },
        name: 'Quantity'
      },
      {
        align: 'right',
        getValue: ({ marketPrice }) => {
          return marketPrice.toString();
        },
        name: 'Market Price'
      },
      {
        align: 'right',
        getValue: ({ valueInBaseCurrency }) => {
          return valueInBaseCurrency === undefined
            ? ''
            : getAmount(valueInBaseCurrency);
        },
        name: 'Value in Base Currency'
      }
    ];

  private static readonly PERFORMANCE_TABLE_COLUMN_DEFINITIONS: TableColumnDefinition<PortfolioPerformance>[] =
    [
      {
        align: 'right',
        getValue: ({ netPerformancePercentage }) => {
          return getPercentage(netPerformancePercentage);
        },
        name: 'Asset Performance in Percentage'
      },
      {
        align: 'right',
        getValue: ({
          netPerformancePercentage,
          netPerformancePercentageWithCurrencyEffect
        }) => {
          const currencyPerformancePercentage = getPercentage(
            netPerformancePercentageWithCurrencyEffect -
              netPerformancePercentage
          );

          return Number.parseFloat(currencyPerformancePercentage) === 0
            ? getPercentage(0)
            : currencyPerformancePercentage;
        },
        name: 'Currency Performance in Percentage'
      },
      {
        align: 'right',
        getValue: ({ netPerformancePercentageWithCurrencyEffect }) => {
          return getPercentage(netPerformancePercentageWithCurrencyEffect);
        },
        name: 'Net Performance in Percentage'
      }
    ];

  private static readonly PERFORMANCE_TABLE_VALUE_COLUMN_DEFINITIONS: TableColumnDefinition<PortfolioPerformance>[] =
    [
      {
        align: 'right',
        getValue: ({ currentValueInBaseCurrency }) => {
          return getAmount(currentValueInBaseCurrency);
        },
        name: 'Current Value in Base Currency'
      },
      {
        align: 'right',
        getValue: ({ netPerformance }) => {
          return getAmount(netPerformance);
        },
        name: 'Asset Performance in Base Currency'
      },
      {
        align: 'right',
        getValue: ({ netPerformance, netPerformanceWithCurrencyEffect }) => {
          return getAmount(netPerformanceWithCurrencyEffect - netPerformance);
        },
        name: 'Currency Performance in Base Currency'
      },
      {
        align: 'right',
        getValue: ({ netPerformanceWithCurrencyEffect }) => {
          return getAmount(netPerformanceWithCurrencyEffect);
        },
        name: 'Net Performance in Base Currency'
      }
    ];

  private static readonly WATCHLIST_TABLE_COLUMN_DEFINITIONS: TableColumnDefinition<
    WatchlistResponse['watchlist'][number],
    DataSourceTableContext
  >[] = [
    {
      getValue: ({ name }) => {
        return name ?? '';
      },
      name: 'Name'
    },
    {
      getValue: ({ symbol }) => {
        return symbol;
      },
      name: 'Symbol'
    },
    getDataSourceColumnDefinition(({ dataSource }) => {
      return dataSource;
    }),
    {
      getValue: ({ trend50d }) => {
        return trend50d;
      },
      name: 'Trend 50 Days'
    },
    {
      getValue: ({ trend200d }) => {
        return trend200d;
      },
      name: 'Trend 200 Days'
    },
    {
      getValue: ({ performances }) => {
        return performances.allTimeHigh.date
          ? format(performances.allTimeHigh.date, DATE_FORMAT)
          : '';
      },
      name: 'Date of Last All Time High'
    },
    {
      align: 'right',
      getValue: ({ performances }) => {
        return getPercentage(performances.allTimeHigh.performancePercent);
      },
      name: 'Change from All Time High'
    },
    {
      getValue: ({ marketCondition }) => {
        return marketCondition;
      },
      name: 'Market Condition'
    }
  ];

  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly configurationService: ConfigurationService,
    private readonly i18nService: I18nService,
    private readonly portfolioService: PortfolioService,
    private readonly watchlistService: WatchlistService
  ) {}

  public static getAccountsTableColumnNames() {
    return PortfolioTableService.ACCOUNTS_TABLE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public static getAccountsTableValueColumnNames() {
    return PortfolioTableService.ACCOUNTS_TABLE_VALUE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public static getActivitiesTableColumnNames() {
    return PortfolioTableService.ACTIVITIES_TABLE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public static getActivitiesTableValueColumnNames() {
    return PortfolioTableService.ACTIVITIES_TABLE_VALUE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public static getHoldingsTableColumnNames() {
    return PortfolioTableService.HOLDINGS_TABLE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public static getHoldingsTableValueColumnNames() {
    return PortfolioTableService.HOLDINGS_TABLE_VALUE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public static getPerformanceTableColumnNames() {
    return PortfolioTableService.PERFORMANCE_TABLE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public static getPerformanceTableValueColumnNames() {
    return PortfolioTableService.PERFORMANCE_TABLE_VALUE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public static getWatchlistTableColumnNames() {
    return PortfolioTableService.WATCHLIST_TABLE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public async getAccountsTable({
    filters,
    userId,
    withValues = false
  }: {
    filters?: Filter[];
    userId: string;
    withValues?: boolean;
  }) {
    const { accounts } =
      await this.portfolioService.getAccountsWithAggregations({
        filters,
        userId,
        withExcludedAccounts: true
      });

    const accountsSection = ['## Accounts', ''];

    if (accounts.length > 0) {
      accountsSection.push(
        await getMarkdownTable({
          columnDefinitions: this.getColumnDefinitions({
            withValues,
            columnDefinitions:
              PortfolioTableService.ACCOUNTS_TABLE_COLUMN_DEFINITIONS,
            valueColumnDefinitions:
              PortfolioTableService.ACCOUNTS_TABLE_VALUE_COLUMN_DEFINITIONS
          }),
          rows: accounts
        })
      );
    } else {
      accountsSection.push('No accounts found.');
    }

    return accountsSection.join('\n');
  }

  public async getActivitiesTable({
    endDate,
    filters,
    skip = 0,
    startDate,
    take,
    types,
    userCurrency,
    userId,
    withValues = false
  }: {
    endDate?: Date;
    filters?: Filter[];
    skip?: number;
    startDate?: Date;
    take: number;
    types?: ActivityType[];
    userCurrency: string;
    userId: string;
    withValues?: boolean;
  }) {
    const { activities, count } = await this.activitiesService.getActivities({
      endDate,
      filters,
      skip,
      startDate,
      take,
      types,
      userCurrency,
      userId,
      includeDrafts: true,
      sortColumn: 'date',
      sortDirection: 'desc',
      withExcludedAccountsAndActivities: true
    });

    const activitiesSection = [
      '## Activities',
      '',
      this.getActivitiesSummary({
        count,
        skip,
        numberOfActivities: activities.length
      })
    ];

    if (activities.length > 0) {
      activitiesSection.push(
        '',
        await getMarkdownTable({
          columnDefinitions: this.getColumnDefinitions({
            withValues,
            columnDefinitions:
              PortfolioTableService.ACTIVITIES_TABLE_COLUMN_DEFINITIONS,
            valueColumnDefinitions:
              PortfolioTableService.ACTIVITIES_TABLE_VALUE_COLUMN_DEFINITIONS
          }),
          context: { configurationService: this.configurationService },
          rows: activities
        })
      );
    }

    return activitiesSection.join('\n');
  }

  public async getHoldingsTable({
    filters,
    languageCode,
    userId,
    withDataSource = false,
    withValues = false
  }: {
    filters?: Filter[];
    languageCode: string;
    userId: string;
    withDataSource?: boolean;
    withValues?: boolean;
  }) {
    const { holdings } = await this.portfolioService.getDetails({
      filters,
      userId
    });

    const assetClassTranslations = this.getEnumTranslations({
      languageCode,
      id: 'assetClass',
      values: Object.values(AssetClass)
    });

    const assetSubClassTranslations = this.getEnumTranslations({
      languageCode,
      id: 'assetSubClass',
      values: Object.values(AssetSubClass)
    });

    const sortedHoldings = [...holdings].sort((a, b) => {
      return b.allocationInPercentage - a.allocationInPercentage;
    });

    return [
      '## Holdings',
      '',
      await getMarkdownTable({
        columnDefinitions: this.getColumnDefinitions({
          withValues,
          columnDefinitions:
            PortfolioTableService.HOLDINGS_TABLE_COLUMN_DEFINITIONS,
          valueColumnDefinitions:
            PortfolioTableService.HOLDINGS_TABLE_VALUE_COLUMN_DEFINITIONS
        }).filter(({ name }) => {
          return withDataSource || name !== DATA_SOURCE_COLUMN_NAME;
        }),
        context: {
          assetClassTranslations,
          assetSubClassTranslations,
          configurationService: this.configurationService
        },
        rows: sortedHoldings
      })
    ].join('\n');
  }

  public async getPerformanceTable({
    dateRange,
    filters,
    userId,
    withValues = false
  }: {
    dateRange: DateRange;
    filters?: Filter[];
    userId: string;
    withValues?: boolean;
  }) {
    const { chart, performance } = await this.portfolioService.getPerformance({
      dateRange,
      filters,
      userId
    });

    const performanceSection = ['## Performance', ''];

    if (chart?.length > 0) {
      performanceSection.push(
        await getMarkdownTable({
          columnDefinitions: this.getColumnDefinitions({
            withValues,
            columnDefinitions:
              PortfolioTableService.PERFORMANCE_TABLE_COLUMN_DEFINITIONS,
            valueColumnDefinitions:
              PortfolioTableService.PERFORMANCE_TABLE_VALUE_COLUMN_DEFINITIONS
          }),
          rows: [performance]
        })
      );
    } else {
      performanceSection.push('No performance found.');
    }

    return performanceSection.join('\n');
  }

  public async getWatchlistTable({ userId }: { userId: string }) {
    const watchlist = await this.watchlistService.getWatchlistItems(userId);

    const watchlistSection = ['## Watchlist', ''];

    if (watchlist.length > 0) {
      watchlistSection.push(
        await getMarkdownTable({
          columnDefinitions:
            PortfolioTableService.WATCHLIST_TABLE_COLUMN_DEFINITIONS,
          context: { configurationService: this.configurationService },
          rows: watchlist
        })
      );
    } else {
      watchlistSection.push('No watchlist items found.');
    }

    return watchlistSection.join('\n');
  }

  private getActivitiesSummary({
    count,
    numberOfActivities,
    skip
  }: {
    count: number;
    numberOfActivities: number;
    skip: number;
  }) {
    if (count === 0) {
      return 'No activities found.';
    }

    if (numberOfActivities === 0) {
      return `No activities beyond the ${count} which match the parameters, hence lower the skip parameter.`;
    }

    if (numberOfActivities === count) {
      return `Showing all ${count} activities, the most recent first.`;
    }

    const lastActivity = skip + numberOfActivities;

    const summary = `Showing the activities ${
      skip + 1
    } to ${lastActivity} of ${count}, the most recent first.`;

    if (lastActivity === count) {
      return summary;
    }

    return `${summary} Get the further activities by raising the skip parameter or narrow the result with the other parameters.`;
  }

  private getColumnDefinitions<T>({
    columnDefinitions,
    valueColumnDefinitions,
    withValues
  }: {
    columnDefinitions: T[];
    valueColumnDefinitions: T[];
    withValues: boolean;
  }) {
    return withValues
      ? [...columnDefinitions, ...valueColumnDefinitions]
      : columnDefinitions;
  }

  private getEnumTranslations<T extends string>({
    id,
    languageCode,
    values
  }: {
    id: string;
    languageCode: string;
    values: T[];
  }) {
    return values.reduce(
      (translations, value) => {
        translations[value] =
          this.i18nService.getTranslation({
            languageCode,
            id: `${id}.${value}`
          }) || value;

        return translations;
      },
      {} as Record<T, string>
    );
  }
}
