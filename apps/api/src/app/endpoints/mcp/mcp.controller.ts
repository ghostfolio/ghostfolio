import { Impersonation } from '@ghostfolio/api/decorators/impersonation.decorator';
import { RequiresScopeOfAccess } from '@ghostfolio/api/decorators/requires-scope-of-access.decorator';
import { McpToolExceptionFilter } from '@ghostfolio/api/filters/mcp-tool-exception.filter';
import { PortfolioTableService } from '@ghostfolio/api/services/portfolio-table/portfolio-table.service';
import { MCP_MAX_ACTIVITIES } from '@ghostfolio/common/config';
import { SubscriptionType } from '@ghostfolio/common/enums';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import { UseFilters } from '@nestjs/common';
import { Payload } from '@nestjs/microservices';
import { McpController, Tool } from '@rekog/mcp-nest';
import { z } from 'zod';
import 'zod/compile';

import {
  GET_ACCOUNTS_PARAMETERS,
  GET_ACTIVITIES_PARAMETERS,
  GET_PERFORMANCE_PARAMETERS,
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
    )}. If the access reads the monetary values, these columns are given in addition: ${PortfolioTableService.getAccountsTableValueColumnNames().join(
      ', '
    )}. The allocation in percentage is relative to the accounts of the result, hence the parameters change it. The parameters change the value in base currency as well. With the holding parameter, it is the value of the holding in the account without the cash balance. Without the holding parameter, it includes the full cash balance of the account, also with the assetClasses parameter. The balance is always the full cash balance of the account in the currency of the account.`,
    name: 'get-accounts',
    parameters: GET_ACCOUNTS_PARAMETERS
  })
  public async getAccounts(
    @Impersonation()
    { scopes: impersonationScopes, userId }: ImpersonationContext,
    @Payload() parameters: z.infer<typeof GET_ACCOUNTS_PARAMETERS>
  ) {
    return this.mcpService.getAccounts({
      ...parameters,
      userId,
      withValues: this.hasScopeToReadValues(impersonationScopes)
    });
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
    )}. If the access reads the monetary values, these columns are given in addition: ${PortfolioTableService.getActivitiesTableValueColumnNames().join(
      ', '
    )}. The unit price and the fee are in the currency of the activity. At most ${MCP_MAX_ACTIVITIES} activities are given per call, hence narrow the result with the parameters or get the further activities with the skip parameter.`,
    name: 'get-activities',
    parameters: GET_ACTIVITIES_PARAMETERS
  })
  public async getActivities(
    @Impersonation()
    { scopes: impersonationScopes, userId, userSettings }: ImpersonationContext,
    @Payload() parameters: z.infer<typeof GET_ACTIVITIES_PARAMETERS>
  ) {
    return this.mcpService.getActivities({
      ...parameters,
      userId,
      userCurrency: userSettings.baseCurrency,
      withValues: this.hasScopeToReadValues(impersonationScopes)
    });
  }

  @RequiresScopeOfAccess(scopes.portfolioRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get performance'
    },
    description: `Gives the performance of the portfolio in the date range with these columns: ${PortfolioTableService.getPerformanceTableColumnNames().join(
      ', '
    )}. If the access reads the monetary values, these columns are given in addition: ${PortfolioTableService.getPerformanceTableValueColumnNames().join(
      ', '
    )}. The value in base currency is the value at the end of the date range. The asset performance excludes the effect of the exchange rates, the currency performance is that effect, and the net performance is the sum of both in the base currency of the user. Each performance is the return on average investment (ROAI) and includes the dividends (total return). The accounts and the activities which are excluded from analysis are not part of the performance. The parameters limit the performance to the holdings of the accounts, of the asset classes or of the asset profile.`,
    name: 'get-performance',
    parameters: GET_PERFORMANCE_PARAMETERS
  })
  public async getPerformance(
    @Impersonation()
    {
      scopes: impersonationScopes,
      userId,
      userSubscription
    }: ImpersonationContext,
    @Payload() parameters: z.infer<typeof GET_PERFORMANCE_PARAMETERS>
  ) {
    return this.mcpService.getPerformance({
      ...parameters,
      userId,
      withAssetPerformanceInBaseCurrency:
        userSubscription?.type !== SubscriptionType.Basic,
      withValues: this.hasScopeToReadValues(impersonationScopes)
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
    )}. If the access reads the monetary values, these columns are given in addition: ${PortfolioTableService.getHoldingsTableValueColumnNames().join(
      ', '
    )}.`,
    name: 'get-portfolio'
  })
  public async getPortfolio(
    @Impersonation()
    { scopes: impersonationScopes, userId }: ImpersonationContext
  ) {
    return this.mcpService.getPortfolio({
      userId,
      withValues: this.hasScopeToReadValues(impersonationScopes)
    });
  }

  @RequiresScopeOfAccess(scopes.watchlistRead)
  @Tool({
    annotations: {
      openWorldHint: false,
      readOnlyHint: true,
      title: 'Get watchlist'
    },
    description: `Gives the watchlist of the user, sorted by name, with these columns: ${PortfolioTableService.getWatchlistTableColumnNames().join(
      ', '
    )}. A trend compares the average market price of the last 50 or 200 days with the average of the 50 or 200 days before. A trend is UNKNOWN if there is not sufficient market data. The change from the all time high is the difference between the current market price and the all time high in percentage.`,
    name: 'get-watchlist'
  })
  public async getWatchlist(@Impersonation() { userId }: ImpersonationContext) {
    return this.mcpService.getWatchlist({ userId });
  }

  @RequiresScopeOfAccess(scopes.activityCreate)
  @Tool({
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: false,
      title: 'Import activities'
    },
    description: `Imports activities into the portfolio and gives the number of the imported activities and the number of the skipped activities. Use search-asset-profiles first unless the exact symbol and data source are already known. An activity is skipped if an equal activity is in the portfolio already, hence send each activity one time only: two equal activities of the same call are both imported. At most ${MCP_MAX_ACTIVITIES} activities are imported per call, while the instance can have a lower limit, which an error names. An error does not remove the activities of the same call which are imported already, hence get the activities after an error before you import them again.`,
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

  private hasScopeToReadValues(impersonationScopes: string[]) {
    return hasScope(impersonationScopes, scopes.portfolioReadValues);
  }
}
