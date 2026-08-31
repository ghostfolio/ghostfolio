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
import {
  Activity,
  Filter,
  PortfolioPosition
} from '@ghostfolio/common/interfaces';
import type { AccountWithValue, AiPromptMode } from '@ghostfolio/common/types';

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

/**
 * Describes one column of a table which a tool or a prompt presents. The value
 * of a cell is derived from the item of the row, hence a table needs no
 * mapping of its own.
 */
type TableColumnDefinition<T> = ColumnDescriptor & {
  getValue: (item: T) => string;
  name: string;
};

@Injectable()
export class AiService {
  public constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly configurationService: ConfigurationService,
    private readonly i18nService: I18nService,
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService
  ) {}

  public static getAccountsTableColumnNames() {
    return AiService.getAccountsTableColumnDefinitions().map(({ name }) => {
      return name;
    });
  }

  public static getActivitiesTableColumnNames() {
    return AiService.getActivitiesTableColumnDefinitions().map(({ name }) => {
      return name;
    });
  }

  public static getHoldingsTableColumnNames() {
    return AiService.getHoldingsTableColumnDefinitions().map(({ name }) => {
      return name;
    });
  }

  private static getAccountsTableColumnDefinitions(): TableColumnDefinition<AccountWithValue>[] {
    return [
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
          return `${(allocationInPercentage * 100).toFixed(3)}%`;
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
  }

  private static getActivitiesTableColumnDefinitions(): TableColumnDefinition<Activity>[] {
    return [
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
  }

  /**
   * The translations of the enumerations depend on the language of the caller,
   * hence the definitions are built per request. The names of the columns are
   * independent of them, hence a caller which needs the names only passes no
   * translation.
   */
  private static getHoldingsTableColumnDefinitions({
    assetClassTranslations = {},
    assetSubClassTranslations = {}
  }: {
    assetClassTranslations?: Record<string, string>;
    assetSubClassTranslations?: Record<string, string>;
  } = {}): TableColumnDefinition<PortfolioPosition>[] {
    return [
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
        getValue: ({ assetProfile }) => {
          return assetProfile.currency;
        },
        name: 'Currency'
      },
      {
        getValue: ({ assetProfile }) => {
          return assetClassTranslations[assetProfile.assetClass] ?? '';
        },
        name: 'Asset Class'
      },
      {
        getValue: ({ assetProfile }) => {
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
          return `${(allocationInPercentage * 100).toFixed(3)}%`;
        },
        name: 'Allocation in Percentage'
      }
    ];
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

    return this.getSection({
      columnDefinitions: AiService.getAccountsTableColumnDefinitions(),
      items: accounts,
      messageIfEmpty: 'No accounts found.',
      title: '## Accounts'
    });
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
        await this.getMarkdownTable({
          columnDefinitions: AiService.getActivitiesTableColumnDefinitions(),
          items: activities
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

    const columnDefinitions = AiService.getHoldingsTableColumnDefinitions({
      assetClassTranslations: this.getEnumTranslations({
        languageCode,
        id: 'assetClass',
        values: Object.values(AssetClass)
      }),
      assetSubClassTranslations: this.getEnumTranslations({
        languageCode,
        id: 'assetSubClass',
        values: Object.values(AssetSubClass)
      })
    });

    return this.getSection({
      columnDefinitions,
      items: [...holdings].sort((a, b) => {
        return b.allocationInPercentage - a.allocationInPercentage;
      }),
      messageIfEmpty: 'No holdings found.',
      title: '## Holdings'
    });
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
    const holdingsSection = await this.getHoldingsTable({
      filters,
      languageCode,
      userId
    });

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

  private async getMarkdownTable<T>({
    columnDefinitions,
    items
  }: {
    columnDefinitions: readonly TableColumnDefinition<T>[];
    items: T[];
  }) {
    // Dynamic import to load ESM module from CommonJS context
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('s', 'return import(s)') as (
      s: string
    ) => Promise<typeof import('tablemark')>;
    const { tablemark } = await dynamicImport('tablemark');

    const rows = items.map((item) => {
      return columnDefinitions.reduce(
        (row, { getValue, name }) => {
          row[name] = getValue(item);

          return row;
        },
        {} as Record<string, string>
      );
    });

    return tablemark(rows, {
      columns: columnDefinitions.map(({ align, name }) => {
        return { name, align: align ?? 'left' };
      })
    });
  }

  private async getSection<T>({
    columnDefinitions,
    items,
    messageIfEmpty,
    title
  }: {
    columnDefinitions: readonly TableColumnDefinition<T>[];
    items: T[];
    messageIfEmpty: string;
    title: string;
  }) {
    const section = [title, ''];

    if (items.length > 0) {
      section.push(await this.getMarkdownTable({ columnDefinitions, items }));
    } else {
      section.push(messageIfEmpty);
    }

    return section.join('\n');
  }
}
