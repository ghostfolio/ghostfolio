import { ActivitiesService } from '@ghostfolio/api/app/activities/activities.service';
import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  PROPERTY_API_KEY_OPENROUTER,
  PROPERTY_OPENROUTER_MODEL
} from '@ghostfolio/common/config';
import { DATE_FORMAT, isAccountExcluded } from '@ghostfolio/common/helper';
import { Filter } from '@ghostfolio/common/interfaces';
import type { AiPromptMode } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import {
  AssetClass,
  AssetSubClass,
  Type as ActivityType
} from '@prisma/client';
import { generateText } from 'ai';
import { format } from 'date-fns';
import type { ColumnDescriptor } from 'tablemark';

@Injectable()
export class AiService {
  private static readonly ACCOUNTS_TABLE_COLUMN_DEFINITIONS: ({
    key:
      | 'ACTIVITIES_COUNT'
      | 'ALLOCATION_PERCENTAGE'
      | 'CURRENCY'
      | 'EXCLUDED_FROM_ANALYSIS'
      | 'NAME'
      | 'PLATFORM';
  } & ColumnDescriptor)[] = [
    { key: 'NAME', name: 'Name' },
    { key: 'CURRENCY', name: 'Currency' },
    { key: 'PLATFORM', name: 'Platform' },
    { align: 'right', key: 'ACTIVITIES_COUNT', name: 'Activities Count' },
    {
      align: 'right',
      key: 'ALLOCATION_PERCENTAGE',
      name: 'Allocation in Percentage'
    },
    { key: 'EXCLUDED_FROM_ANALYSIS', name: 'Excluded from Analysis' }
  ];

  private static readonly ACTIVITIES_TABLE_COLUMN_DEFINITIONS: ({
    key:
      | 'ACCOUNT'
      | 'CURRENCY'
      | 'DATE'
      | 'NAME'
      | 'SYMBOL'
      | 'TYPE'
      | 'UNIT_PRICE';
  } & ColumnDescriptor)[] = [
    { key: 'DATE', name: 'Date' },
    { key: 'TYPE', name: 'Type' },
    { key: 'NAME', name: 'Name' },
    { key: 'SYMBOL', name: 'Symbol' },
    { key: 'CURRENCY', name: 'Currency' },
    { align: 'right', key: 'UNIT_PRICE', name: 'Unit Price' },
    { key: 'ACCOUNT', name: 'Account' }
  ];

  private static readonly HOLDINGS_TABLE_COLUMN_DEFINITIONS: ({
    key:
      | 'ACTIVITIES_COUNT'
      | 'ALLOCATION_PERCENTAGE'
      | 'ASSET_CLASS'
      | 'ASSET_SUB_CLASS'
      | 'CURRENCY'
      | 'DATE_OF_FIRST_ACTIVITY'
      | 'NAME'
      | 'SYMBOL';
  } & ColumnDescriptor)[] = [
    { key: 'NAME', name: 'Name' },
    { key: 'SYMBOL', name: 'Symbol' },
    { key: 'CURRENCY', name: 'Currency' },
    { key: 'ASSET_CLASS', name: 'Asset Class' },
    { key: 'ASSET_SUB_CLASS', name: 'Asset Sub Class' },
    { key: 'DATE_OF_FIRST_ACTIVITY', name: 'Date of First Activity' },
    { align: 'right', key: 'ACTIVITIES_COUNT', name: 'Activities Count' },
    {
      align: 'right',
      key: 'ALLOCATION_PERCENTAGE',
      name: 'Allocation in Percentage'
    }
  ];

  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly configurationService: ConfigurationService,
    private readonly i18nService: I18nService,
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService
  ) {}

  public static getAccountsTableColumnNames() {
    return AiService.ACCOUNTS_TABLE_COLUMN_DEFINITIONS.map(({ name }) => {
      return name;
    });
  }

  public static getActivitiesTableColumnNames() {
    return AiService.ACTIVITIES_TABLE_COLUMN_DEFINITIONS.map(({ name }) => {
      return name;
    });
  }

  public static getHoldingsTableColumnNames() {
    return AiService.HOLDINGS_TABLE_COLUMN_DEFINITIONS.map(({ name }) => {
      return name;
    });
  }

  public async generateText({
    prompt,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT')
  }: {
    prompt: string;
    requestTimeout?: number;
  }) {
    const openRouterApiKey = await this.propertyService.getByKey<string>(
      PROPERTY_API_KEY_OPENROUTER
    );

    const openRouterModel = await this.propertyService.getByKey<string>(
      PROPERTY_OPENROUTER_MODEL
    );

    const openRouterService = createOpenRouter({
      apiKey: openRouterApiKey
    });

    return generateText({
      prompt,
      model: openRouterService.chat(openRouterModel),
      timeout: requestTimeout
    });
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

    const accountsTableRows = accounts.map(
      ({
        activitiesCount,
        allocationInPercentage,
        currency,
        name: label,
        platform,
        tags
      }) => {
        return AiService.ACCOUNTS_TABLE_COLUMN_DEFINITIONS.reduce(
          (row, { key, name }) => {
            switch (key) {
              case 'ACTIVITIES_COUNT':
                row[name] = activitiesCount.toString();
                break;

              case 'ALLOCATION_PERCENTAGE':
                row[name] = `${(allocationInPercentage * 100).toFixed(3)}%`;
                break;

              case 'CURRENCY':
                row[name] = currency ?? '';
                break;

              case 'EXCLUDED_FROM_ANALYSIS':
                row[name] = isAccountExcluded({ tags }).toString();
                break;

              case 'NAME':
                row[name] = label ?? '';
                break;

              case 'PLATFORM':
                row[name] = platform?.name ?? '';
                break;

              default:
                row[name] = '';
                break;
            }

            return row;
          },
          {} as Record<string, string>
        );
      }
    );

    const accountsSection = ['## Accounts', ''];

    if (accountsTableRows.length > 0) {
      accountsSection.push(
        await this.getMarkdownTable({
          columnDefinitions: AiService.ACCOUNTS_TABLE_COLUMN_DEFINITIONS,
          rows: accountsTableRows
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

    const activitiesTableRows = activities.map(
      ({ account, assetProfile, currency, date, type, unitPrice }) => {
        return AiService.ACTIVITIES_TABLE_COLUMN_DEFINITIONS.reduce(
          (row, { key, name }) => {
            switch (key) {
              case 'ACCOUNT':
                row[name] = account?.name ?? '';
                break;

              case 'CURRENCY':
                row[name] = currency ?? assetProfile.currency;
                break;

              case 'DATE':
                row[name] = format(date, DATE_FORMAT);
                break;

              case 'NAME':
                row[name] = assetProfile.name ?? '';
                break;

              case 'SYMBOL':
                row[name] = assetProfile.symbol;
                break;

              case 'TYPE':
                row[name] = type;
                break;

              case 'UNIT_PRICE':
                row[name] = unitPrice.toString();
                break;

              default:
                row[name] = '';
                break;
            }

            return row;
          },
          {} as Record<string, string>
        );
      }
    );

    const activitiesSection = [
      '## Activities',
      '',
      this.getActivitiesSummary({
        count,
        skip,
        numberOfActivities: activities.length
      })
    ];

    if (activitiesTableRows.length > 0) {
      activitiesSection.push(
        '',
        await this.getMarkdownTable({
          columnDefinitions: AiService.ACTIVITIES_TABLE_COLUMN_DEFINITIONS,
          rows: activitiesTableRows
        })
      );
    }

    return activitiesSection.join('\n');
  }

  public async getPrompt({
    filters,
    languageCode,
    mode,
    userCurrency,
    userId
  }: {
    filters?: Filter[];
    languageCode: string;
    mode: AiPromptMode;
    userCurrency: string;
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

    const holdingsTableRows = [...holdings]
      .sort((a, b) => {
        return b.allocationInPercentage - a.allocationInPercentage;
      })
      .map(
        ({
          activitiesCount,
          allocationInPercentage,
          assetProfile: {
            assetClass,
            assetSubClass,
            currency,
            name: label,
            symbol
          },
          dateOfFirstActivity
        }) => {
          return AiService.HOLDINGS_TABLE_COLUMN_DEFINITIONS.reduce(
            (row, { key, name }) => {
              switch (key) {
                case 'ACTIVITIES_COUNT':
                  row[name] = activitiesCount.toString();
                  break;

                case 'ALLOCATION_PERCENTAGE':
                  row[name] = `${(allocationInPercentage * 100).toFixed(3)}%`;
                  break;

                case 'ASSET_CLASS':
                  row[name] = assetClassTranslations[assetClass] ?? '';
                  break;

                case 'ASSET_SUB_CLASS':
                  row[name] = assetSubClassTranslations[assetSubClass] ?? '';
                  break;

                case 'CURRENCY':
                  row[name] = currency;
                  break;

                case 'DATE_OF_FIRST_ACTIVITY':
                  row[name] = dateOfFirstActivity
                    ? format(dateOfFirstActivity, DATE_FORMAT)
                    : '';
                  break;

                case 'NAME':
                  row[name] = label;
                  break;

                case 'SYMBOL':
                  row[name] = symbol;
                  break;

                default:
                  row[name] = '';
                  break;
              }

              return row;
            },
            {} as Record<string, string>
          );
        }
      );

    const holdingsSection = [
      '## Holdings',
      '',
      await this.getMarkdownTable({
        columnDefinitions: AiService.HOLDINGS_TABLE_COLUMN_DEFINITIONS,
        rows: holdingsTableRows
      })
    ].join('\n');

    if (mode === 'portfolio') {
      return holdingsSection;
    }

    return [
      `You are a neutral financial assistant. Please analyze the following investment portfolio (base currency being ${userCurrency}) in simple words.`,
      holdingsSection,
      'Structure your answer with these sections:',
      'Overview: Briefly summarize the portfolio’s composition and allocation rationale.',
      'Risk Assessment: Identify potential risks, including market volatility, concentration, and sectoral imbalances.',
      'Advantages: Highlight strengths, focusing on growth potential, diversification, or other benefits.',
      'Disadvantages: Point out weaknesses, such as overexposure or lack of defensive assets.',
      'Target Group: Discuss who this portfolio might suit (e.g., risk tolerance, investment goals, life stages, and experience levels).',
      'Optimization Ideas: Offer ideas to complement the portfolio, ensuring they are constructive and neutral in tone.',
      'Conclusion: Provide a concise summary highlighting key insights.',
      `Provide your answer in the following language: ${languageCode}.`
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

  private async getMarkdownTable({
    columnDefinitions,
    rows
  }: {
    columnDefinitions: readonly ColumnDescriptor[];
    rows: Record<string, string>[];
  }) {
    // Dynamic import to load ESM module from CommonJS context
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('s', 'return import(s)') as (
      s: string
    ) => Promise<typeof import('tablemark')>;
    const { tablemark } = await dynamicImport('tablemark');

    return tablemark(rows, {
      columns: columnDefinitions.map(({ align, name }) => {
        return { name, align: align ?? 'left' };
      })
    });
  }
}
