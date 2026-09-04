import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { TableColumnDefinition } from '@ghostfolio/api/helper/interfaces/table-column-definition.interface';
import { getMarkdownTable } from '@ghostfolio/api/helper/markdown-table.helper';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { DATE_FORMAT, isAccountExcluded } from '@ghostfolio/common/helper';
import { Activity, Filter } from '@ghostfolio/common/interfaces';
import { AccountWithValue } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  Type as ActivityType
} from '@prisma/client';
import { format } from 'date-fns';

import { HoldingsTableColumnDefinition } from './types/holdings-table-column-definition.type';

function getAllocationInPercentage(allocationInPercentage: number) {
  return `${(allocationInPercentage * 100).toFixed(3)}%`;
}

/**
 * Renders the accounts, the activities and the holdings of a portfolio as a
 * markdown table. No table has a column with a quantity or with a monetary
 * value, except the unit price of an activity.
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
          return getAllocationInPercentage(allocationInPercentage);
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

  private static readonly ACTIVITIES_TABLE_COLUMN_DEFINITIONS: TableColumnDefinition<Activity>[] =
    [
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
          return getAllocationInPercentage(allocationInPercentage);
        },
        name: 'Allocation in Percentage'
      }
    ];

  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly i18nService: I18nService,
    private readonly portfolioService: PortfolioService
  ) {}

  public static getAccountsTableColumnNames() {
    return PortfolioTableService.ACCOUNTS_TABLE_COLUMN_DEFINITIONS.map(
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

  public static getHoldingsTableColumnNames() {
    return PortfolioTableService.HOLDINGS_TABLE_COLUMN_DEFINITIONS.map(
      ({ name }) => {
        return name;
      }
    );
  }

  public async getAccountsTable({
    filters,
    userId
  }: {
    filters?: Filter[];
    userId: string;
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
          columnDefinitions:
            PortfolioTableService.ACCOUNTS_TABLE_COLUMN_DEFINITIONS,
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
    userId
  }: {
    endDate?: Date;
    filters?: Filter[];
    skip?: number;
    startDate?: Date;
    take: number;
    types?: ActivityType[];
    userCurrency: string;
    userId: string;
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
          columnDefinitions:
            PortfolioTableService.ACTIVITIES_TABLE_COLUMN_DEFINITIONS,
          rows: activities
        })
      );
    }

    return activitiesSection.join('\n');
  }

  public async getHoldingsTable({
    filters,
    languageCode,
    userId
  }: {
    filters?: Filter[];
    languageCode: string;
    userId: string;
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
        columnDefinitions:
          PortfolioTableService.HOLDINGS_TABLE_COLUMN_DEFINITIONS,
        context: { assetClassTranslations, assetSubClassTranslations },
        rows: sortedHoldings
      })
    ].join('\n');
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
