import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScopeOfAccess } from '@ghostfolio/api/decorators/requires-scope-of-access.decorator';
import { McpToolExceptionFilter } from '@ghostfolio/api/filters/mcp-tool-exception.filter';
import { PortfolioTableService } from '@ghostfolio/api/services/portfolio-table/portfolio-table.service';
import { MCP_MAX_ACTIVITIES } from '@ghostfolio/common/config';
import { scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import { UseFilters } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { McpController, Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import 'zod/compile';

import {
  GET_ACCOUNTS_PARAMETERS,
  GET_ACTIVITIES_PARAMETERS,
  IMPORT_ACTIVITIES_PARAMETERS,
  SEARCH_ASSET_PROFILES_PARAMETERS
} from './mcp.schemas';
import { McpService } from './mcp.service';

@McpController()
@UseFilters(McpToolExceptionFilter)
export class GhostfolioMcpController {
  public constructor(private readonly mcpService: McpService) {}

  @RequiresScopeOfAccess(scopes.accountRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get accounts'
    },
    description: `Gives the accounts of the portfolio with these columns: ${PortfolioTableService.getAccountsTableColumnNames().join(
      ', '
    )}. The allocation in percentage is relative to the accounts of the result, hence the parameters change it.`,
    name: 'get-accounts',
    parameters: GET_ACCOUNTS_PARAMETERS
  })
  public async getAccounts(
    @Impersonation() { userId }: ImpersonationContext,
    @Payload() parameters: z.infer<typeof GET_ACCOUNTS_PARAMETERS>
  ) {
    return this.mcpService.getAccounts({ ...parameters, userId });
  }

  @RequiresScopeOfAccess(scopes.activityRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get activities'
    },
    description: `Gives the activities of the portfolio, the most recent first, with these columns: ${PortfolioTableService.getActivitiesTableColumnNames().join(
      ', '
    )}. At most ${MCP_MAX_ACTIVITIES} activities are given per call, hence narrow the result with the parameters or get the further activities with the skip parameter.`,
    name: 'get-activities',
    parameters: GET_ACTIVITIES_PARAMETERS
  })
  public async getActivities(
    @Impersonation() { userId, userSettings }: ImpersonationContext,
    @Payload() parameters: z.infer<typeof GET_ACTIVITIES_PARAMETERS>
  ) {
    return this.mcpService.getActivities({
      ...parameters,
      userId,
      userCurrency: userSettings.baseCurrency
    });
  }

  @RequiresScopeOfAccess(scopes.portfolioRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get portfolio'
    },
    description: `Gives the holdings of the portfolio with these columns: ${PortfolioTableService.getHoldingsTableColumnNames().join(
      ', '
    )}.`,
    name: 'get-portfolio'
  })
  public async getPortfolio(@Impersonation() { userId }: ImpersonationContext) {
    return this.mcpService.getPortfolio({ userId });
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
    description: `Imports activities into the portfolio and gives the number of the imported activities and the number of the skipped activities. Use search-asset-profiles first unless the exact symbol and data source are already known. An activity is skipped if an equal activity is in the portfolio already, hence send each activity one time only: two equal activities of the same call are both imported. The access needs the permission "Restricted view and manage". At most ${MCP_MAX_ACTIVITIES} activities are imported per call, while the instance can have a lower limit, which an error names. An error does not remove the activities of the same call which are imported already, hence get the activities after an error before you import them again.`,
    name: 'import-activities',
    parameters: IMPORT_ACTIVITIES_PARAMETERS
  })
  public async importActivities(
    @Impersonation() { userId }: ImpersonationContext,
    @Payload() parameters: z.infer<typeof IMPORT_ACTIVITIES_PARAMETERS>
  ) {
    return this.mcpService.importActivities({ ...parameters, userId });
  }

  @RequiresScopeOfAccess(scopes.activityCreate)
  @Tool({
    annotations: {
      openWorldHint: true,
      readOnlyHint: true,
      title: 'Search asset profiles'
    },
    description:
      'Searches for financial assets, such as stocks, ETFs, cryptocurrencies, mutual funds and commodities, which are available to the user. Each result is an asset profile that can be used to import an activity. Use this before importing an activity unless the exact symbol and data source are already known. Select the candidate that matches the intended asset and pass its symbol, dataSource and currency unchanged to import-activities.',
    name: 'search-asset-profiles',
    parameters: SEARCH_ASSET_PROFILES_PARAMETERS
  })
  public async searchAssetProfiles(
    @Impersonation() { userId }: ImpersonationContext,
    @Payload() parameters: z.infer<typeof SEARCH_ASSET_PROFILES_PARAMETERS>
  ) {
    return this.mcpService.searchAssetProfiles({ ...parameters, userId });
  }
}
