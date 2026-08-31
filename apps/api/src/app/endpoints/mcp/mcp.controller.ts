import { AiService } from '@ghostfolio/api/app/endpoints/ai/ai.service';
import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { HasPermission } from '@ghostfolio/api/decorators/has-permission.decorator';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScopeOfAccess } from '@ghostfolio/api/decorators/requires-scope-of-access.decorator';
import { DATE_RANGE_PATTERN } from '@ghostfolio/api/dtos/date-range-filter.dto';
import { McpToolExceptionFilter } from '@ghostfolio/api/filters/mcp-tool-exception.filter';
import { getUnmaskedGhostfolioDataSource } from '@ghostfolio/api/helper/data-source.helper';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  DATE_RANGES,
  DEFAULT_LANGUAGE_CODE,
  MCP_MAX_ACCOUNTS,
  MCP_MAX_ACTIVITIES
} from '@ghostfolio/common/config';
import {
  isValidCurrencyCode,
  isValidDateAfter1970
} from '@ghostfolio/common/helper';
import { permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import { UseFilters } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { AssetClass, DataSource, Type as ActivityType } from '@prisma/client';
import { McpController, Tool } from '@rekog/mcp-nest';
import { z } from 'zod';

const ACCOUNT_IDS_PARAMETER = z
  .array(z.string().min(1))
  .min(1)
  .max(MCP_MAX_ACCOUNTS)
  .optional();

const ASSET_CLASSES_PARAMETER = z.array(z.enum(AssetClass)).min(1).optional();

const HOLDING_PARAMETER = z
  .object({
    dataSource: z
      .enum(DataSource)
      .describe('The data source of the asset profile'),
    symbol: z.string().describe('The symbol of the asset profile')
  })
  .optional();

const GET_ACCOUNTS_PARAMETERS = z.object({
  accountIds: ACCOUNT_IDS_PARAMETER.describe(
    `The identifiers of the accounts to get, at most ${MCP_MAX_ACCOUNTS}`
  ),
  assetClasses: ASSET_CLASSES_PARAMETER.describe(
    'The asset classes of the accounts to get'
  ),
  holding: HOLDING_PARAMETER.describe(
    'The asset profile of the accounts to get'
  )
});

const GET_ACTIVITIES_PARAMETERS = z.object({
  accountIds: ACCOUNT_IDS_PARAMETER.describe(
    `The identifiers of the accounts of the activities to get, at most ${MCP_MAX_ACCOUNTS}`
  ),
  activityTypes: z
    .array(z.enum(ActivityType))
    .min(1)
    .optional()
    .describe('The types of the activities to get'),
  assetClasses: ASSET_CLASSES_PARAMETER.describe(
    'The asset classes of the activities to get'
  ),
  holding: HOLDING_PARAMETER.describe(
    'The asset profile of the activities to get'
  ),
  range: z
    .string()
    .regex(DATE_RANGE_PATTERN)
    .optional()
    .describe(
      `The date range of the activities to get, either ${DATE_RANGES.join(
        ', '
      )} or a calendar year like 2024`
    ),
  skip: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('The number of activities to skip'),
  take: z
    .number()
    .int()
    .min(1)
    .max(MCP_MAX_ACTIVITIES)
    .optional()
    .describe(`The number of activities to get, at most ${MCP_MAX_ACTIVITIES}`)
});

const GET_HOLDINGS_PARAMETERS = z.object({
  accountIds: ACCOUNT_IDS_PARAMETER.describe(
    `The identifiers of the accounts of the holdings to get, at most ${MCP_MAX_ACCOUNTS}`
  ),
  assetClasses: ASSET_CLASSES_PARAMETER.describe(
    'The asset classes of the holdings to get'
  ),
  holding: HOLDING_PARAMETER.describe(
    'The asset profile of the holdings to get'
  )
});

export const IMPORT_ACTIVITIES_PARAMETERS = z.object({
  activities: z
    .array(
      z.object({
        accountId: z
          .string()
          .min(1)
          .optional()
          .describe('The identifier of the account of the activity'),
        comment: z.string().optional().describe('The comment of the activity'),
        currency: z
          .string()
          .refine(isValidCurrencyCode)
          .describe(
            'The currency of the fee and of the unit price, as an ISO 4217 code in upper case'
          ),
        dataSource: z
          .enum(DataSource)
          .optional()
          .describe('The data source of the asset profile'),
        date: z
          .string()
          .refine(isValidDateAfter1970)
          .describe(
            'The date of the activity, as an ISO 8601 date or date and time'
          ),
        fee: z.number().min(0).describe('The fee of the activity'),
        quantity: z.number().min(0).describe('The quantity of the activity'),
        symbol: z.string().min(1).describe('The symbol of the asset profile'),
        type: z.enum(ActivityType).describe('The type of the activity'),
        unitPrice: z.number().min(0).describe('The unit price of the activity')
      })
    )
    .min(1)
    .max(MCP_MAX_ACTIVITIES)
    .describe(`The activities to import, at most ${MCP_MAX_ACTIVITIES}`)
});

/**
 * Gives the result of a tool, which is a text in every case, because the tools
 * present tables of the markdown format
 */
function getTextContent(text: string) {
  return { content: [{ text, type: 'text' as const }] };
}

@McpController()
@UseFilters(McpToolExceptionFilter)
export class GhostfolioMcpController {
  public constructor(
    private readonly aiService: AiService,
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly importService: ImportService
  ) {}

  @RequiresScopeOfAccess(scopes.accountRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get accounts'
    },
    description: `Gives the accounts of the portfolio with these columns: ${AiService.getAccountsTableColumnNames().join(
      ', '
    )}. The allocation in percentage is relative to the accounts of the result, hence the parameters change it.`,
    name: 'get-accounts',
    parameters: GET_ACCOUNTS_PARAMETERS
  })
  public async getAccounts(
    @Impersonation() { userId }: ImpersonationContext,
    @Payload()
    {
      accountIds,
      assetClasses,
      holding
    }: z.infer<typeof GET_ACCOUNTS_PARAMETERS>
  ) {
    const filters = this.apiService.buildFilters({
      accountIds,
      assetClasses,
      dataSource: holding?.dataSource,
      symbol: holding?.symbol
    });

    const table = await this.aiService.getAccountsTable({ filters, userId });

    return getTextContent(table);
  }

  @RequiresScopeOfAccess(scopes.activityRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get activities'
    },
    description: `Gives the activities of the portfolio, the most recent first, with these columns: ${AiService.getActivitiesTableColumnNames().join(
      ', '
    )}. At most ${MCP_MAX_ACTIVITIES} activities are given per call, hence narrow the result with the parameters or get the further activities with the skip parameter.`,
    name: 'get-activities',
    parameters: GET_ACTIVITIES_PARAMETERS
  })
  public async getActivities(
    @Impersonation()
    { userId, userSettings }: ImpersonationContext,
    @Payload()
    {
      accountIds,
      activityTypes,
      assetClasses,
      holding,
      range,
      skip,
      take
    }: z.infer<typeof GET_ACTIVITIES_PARAMETERS>
  ) {
    let endDate: Date | undefined;
    let startDate: Date | undefined;

    if (range) {
      ({ endDate, startDate } = getIntervalFromDateRange({
        dateRange: range
      }));
    }

    const filters = this.apiService.buildFilters({
      accountIds,
      assetClasses,
      dataSource: holding?.dataSource,
      symbol: holding?.symbol
    });

    const table = await this.aiService.getActivitiesTable({
      endDate,
      filters,
      skip,
      startDate,
      userId,
      take: take ?? MCP_MAX_ACTIVITIES,
      types: activityTypes,
      userCurrency: userSettings.baseCurrency
    });

    return getTextContent(table);
  }

  @RequiresScopeOfAccess(scopes.portfolioRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get holdings'
    },
    description: `Gives the holdings of the portfolio, the largest first, with these columns: ${AiService.getHoldingsTableColumnNames().join(
      ', '
    )}. The allocation in percentage is relative to the holdings of the result, hence the parameters change it.`,
    name: 'get-holdings',
    parameters: GET_HOLDINGS_PARAMETERS
  })
  public async getHoldings(
    @Impersonation() { userId }: ImpersonationContext,
    @Payload()
    {
      accountIds,
      assetClasses,
      holding
    }: z.infer<typeof GET_HOLDINGS_PARAMETERS>
  ) {
    const filters = this.apiService.buildFilters({
      accountIds,
      assetClasses,
      dataSource: holding?.dataSource,
      symbol: holding?.symbol
    });

    const table = await this.aiService.getHoldingsTable({
      filters,
      userId,
      languageCode: DEFAULT_LANGUAGE_CODE
    });

    return getTextContent(table);
  }

  @HasPermission(permissions.createActivity)
  @RequiresScopeOfAccess(scopes.activityCreate)
  @Tool({
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: false,
      title: 'Import activities'
    },
    description: `Imports activities into the portfolio and gives the number of the imported activities and the number of the skipped activities. An activity is skipped if an equal activity is in the portfolio already, hence send each activity one time only: two equal activities of the same call are both imported. The access needs the permission "Restricted view and manage". At most ${MCP_MAX_ACTIVITIES} activities are imported per call, while the instance can have a lower limit, which an error names. An error does not remove the activities of the same call which are imported already, hence get the activities after an error before you import them again.`,
    name: 'import-activities',
    parameters: IMPORT_ACTIVITIES_PARAMETERS
  })
  public async importActivities(
    @Impersonation() { user }: ImpersonationContext,
    @Payload() { activities }: z.infer<typeof IMPORT_ACTIVITIES_PARAMETERS>
  ) {
    const ghostfolioDataSources = this.configurationService.get(
      'ENABLE_FEATURE_SUBSCRIPTION'
    )
      ? this.configurationService.get('DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER')
      : [];

    const activitiesDto = activities.map((activity) => {
      return {
        ...activity,
        dataSource: getUnmaskedGhostfolioDataSource({
          ghostfolioDataSources,
          dataSource: activity.dataSource
        })
      };
    });

    // The McpToolExceptionFilter decides which message reaches the caller,
    // hence an error is not handled here
    const importedActivities = await this.importService.import({
      activitiesDto,
      user,
      accountsWithBalancesDto: [],
      assetProfilesWithMarketDataDto: [],
      platformsDto: [],
      tagsDto: []
    });

    return getTextContent(
      [
        `Imported activities: ${importedActivities.length}`,
        `Skipped duplicate activities: ${
          activities.length - importedActivities.length
        }`
      ].join('\n')
    );
  }
}
