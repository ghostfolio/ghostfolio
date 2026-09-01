import { AiService } from '@ghostfolio/api/app/endpoints/ai/ai.service';
import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScopeOfAccess } from '@ghostfolio/api/decorators/requires-scope-of-access.decorator';
import { McpToolExceptionFilter } from '@ghostfolio/api/filters/mcp-tool-exception.filter';
import { getUnmaskedGhostfolioDataSource } from '@ghostfolio/api/helper/data-source.helper';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import {
  DEFAULT_LANGUAGE_CODE,
  MCP_MAX_ACTIVITIES
} from '@ghostfolio/common/config';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import { HttpException, UseFilters } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { McpController, Tool } from '@rekog/mcp-nest';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import {
  GET_ACCOUNTS_PARAMETERS,
  GET_ACTIVITIES_PARAMETERS,
  IMPORT_ACTIVITIES_PARAMETERS
} from './mcp.schemas';
import { McpService } from './mcp.service';

@McpController()
@UseFilters(McpToolExceptionFilter)
export class GhostfolioMcpController {
  public constructor(
    private readonly aiService: AiService,
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly importService: ImportService,
    private readonly mcpService: McpService,
    private readonly userService: UserService
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
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accountIds?.join(','),
      filterByAssetClasses: assetClasses?.join(','),
      filterByDataSource: holding?.dataSource,
      filterBySymbol: holding?.symbol
    });

    const table = await this.aiService.getAccountsTable({ filters, userId });

    return this.mcpService.getTextResult(table);
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

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAssetClasses: assetClasses?.join(','),
      filterByDataSource: holding?.dataSource,
      filterBySymbol: holding?.symbol
    });

    const table = await this.aiService.getActivitiesTable({
      endDate,
      filters,
      skip,
      startDate,
      take,
      userId,
      types: activityTypes,
      userCurrency: userSettings.baseCurrency
    });

    return this.mcpService.getTextResult(table);
  }

  @RequiresScopeOfAccess(scopes.portfolioRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get portfolio'
    },
    description: `Gives the holdings of the portfolio with these columns: ${AiService.getHoldingsTableColumnNames().join(
      ', '
    )}.`,
    name: 'get-portfolio'
  })
  public async getPortfolio(
    @Impersonation() { userId, userSettings }: ImpersonationContext
  ) {
    const prompt = await this.aiService.getPrompt({
      userId,
      languageCode: DEFAULT_LANGUAGE_CODE,
      mode: 'portfolio',
      userCurrency: userSettings.baseCurrency
    });

    return this.mcpService.getTextResult(prompt);
  }

  /**
   * The transport gives the tool to every client, because it filters the list
   * of the tools by the scopes of request.user, which a request of an access
   * never has. The guard refuses the call itself, hence the description names
   * the permission which the access needs.
   */
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
    @Impersonation() { userId }: ImpersonationContext,
    @Payload() { activities }: z.infer<typeof IMPORT_ACTIVITIES_PARAMETERS>
  ) {
    const user = await this.userService.user({ id: userId });

    if (!hasPermission(user?.permissions, permissions.createActivity)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

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

    // The filter passes on the message of an ImportValidationError, which is
    // written for the caller, and hides the message of every other error
    const importedActivities = await this.importService.import({
      activitiesDto,
      user,
      accountsWithBalancesDto: [],
      assetProfilesWithMarketDataDto: [],
      platformsDto: [],
      tagsDto: []
    });

    const text = [
      `Imported activities: ${importedActivities.length}`,
      `Skipped duplicate activities: ${
        activities.length - importedActivities.length
      }`
    ].join('\n');

    return this.mcpService.getTextResult(text);
  }
}
