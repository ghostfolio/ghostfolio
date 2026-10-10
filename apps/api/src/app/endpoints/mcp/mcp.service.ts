import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { SymbolService } from '@ghostfolio/api/app/symbol/symbol.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import {
  transformDataSourceInRequest,
  transformDataSourceInResponse
} from '@ghostfolio/api/helper/data-source.helper';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PortfolioTableService } from '@ghostfolio/api/services/portfolio-table/portfolio-table.service';
import { getIntervalFromDateRange } from '@ghostfolio/common/calculation-helper';
import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';

import { HttpException, Injectable } from '@nestjs/common';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { z } from 'zod';

import {
  GET_ACCOUNTS_PARAMETERS,
  GET_ACTIVITIES_PARAMETERS,
  GET_PERFORMANCE_PARAMETERS,
  IMPORT_ACTIVITIES_PARAMETERS,
  SEARCH_ASSET_PROFILES_PARAMETERS
} from './mcp.schemas';

@Injectable()
export class McpService {
  public constructor(
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly importService: ImportService,
    private readonly portfolioTableService: PortfolioTableService,
    private readonly symbolService: SymbolService,
    private readonly userService: UserService
  ) {}

  public async getAccounts({
    accountIds,
    assetClasses,
    holding,
    userId,
    withValues
  }: z.infer<typeof GET_ACCOUNTS_PARAMETERS> & {
    userId: string;
    withValues?: boolean;
  }) {
    const filters = this.apiService.buildFiltersFromQueryParams({
      ...this.getHoldingFilterParameters({ holding }),
      filterByAccounts: accountIds,
      filterByAssetClasses: assetClasses
    });

    const table = await this.portfolioTableService.getAccountsTable({
      filters,
      userId,
      withValues
    });

    return this.getTextResult(table);
  }

  public async getActivities({
    activityTypes,
    assetClasses,
    holding,
    range,
    skip,
    take,
    userCurrency,
    userId,
    withValues
  }: z.infer<typeof GET_ACTIVITIES_PARAMETERS> & {
    userCurrency: string;
    userId: string;
    withValues?: boolean;
  }) {
    let endDate: Date | undefined;
    let startDate: Date | undefined;

    if (range) {
      ({ endDate, startDate } = getIntervalFromDateRange({
        dateRange: range
      }));
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      ...this.getHoldingFilterParameters({ holding }),
      filterByAssetClasses: assetClasses
    });

    const table = await this.portfolioTableService.getActivitiesTable({
      endDate,
      filters,
      skip,
      startDate,
      take,
      userCurrency,
      userId,
      withValues,
      types: activityTypes
    });

    return this.getTextResult(table);
  }

  public async getPerformance({
    accountIds,
    assetClasses,
    holding,
    range,
    userId,
    withValues
  }: z.infer<typeof GET_PERFORMANCE_PARAMETERS> & {
    userId: string;
    withValues?: boolean;
  }) {
    const filters = this.apiService.buildFiltersFromQueryParams({
      ...this.getHoldingFilterParameters({ holding }),
      filterByAccounts: accountIds,
      filterByAssetClasses: assetClasses
    });

    const table = await this.portfolioTableService.getPerformanceTable({
      filters,
      userId,
      withValues,
      dateRange: range
    });

    return this.getTextResult(table);
  }

  public async getPortfolio({
    userId,
    withValues
  }: {
    userId: string;
    withValues?: boolean;
  }) {
    const table = await this.portfolioTableService.getHoldingsTable({
      userId,
      withValues,
      languageCode: DEFAULT_LANGUAGE_CODE,
      withDataSource: true
    });

    return this.getTextResult(table);
  }

  public async getWatchlist({ userId }: { userId: string }) {
    const table = await this.portfolioTableService.getWatchlistTable({
      userId
    });

    return this.getTextResult(table);
  }

  public async importActivities({
    activities,
    userId
  }: z.infer<typeof IMPORT_ACTIVITIES_PARAMETERS> & { userId: string }) {
    const user = await this.getUserWithPermission({
      userId,
      permission: permissions.createActivity
    });

    const activitiesDto = activities.map((activity) => {
      return {
        ...activity,
        dataSource: transformDataSourceInRequest({
          configurationService: this.configurationService,
          dataSource: activity.dataSource
        })
      };
    });

    // The filter passes on the message of a CallerFacingError, which is
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

    return this.getTextResult(text);
  }

  public async searchAssetProfiles({
    query,
    userId
  }: z.infer<typeof SEARCH_ASSET_PROFILES_PARAMETERS> & { userId: string }) {
    const user = await this.getUserWithPermission({
      userId,
      permission: permissions.createActivity
    });

    const { items } = await this.symbolService.lookup({ query, user });

    const assetProfiles = items.flatMap(
      ({
        assetClass,
        assetSubClass,
        currency,
        dataProviderInfo,
        dataSource,
        name,
        symbol
      }) => {
        if (!dataSource || dataProviderInfo.isPremium) {
          return [];
        }

        return [
          {
            assetClass,
            assetSubClass,
            currency,
            name,
            symbol,
            dataSource: transformDataSourceInResponse({
              dataSource,
              configurationService: this.configurationService
            })
          }
        ];
      }
    );

    return this.getTextResult(JSON.stringify({ assetProfiles }, null, 2));
  }

  private getHoldingFilterParameters({
    holding
  }: Pick<z.infer<typeof GET_ACCOUNTS_PARAMETERS>, 'holding'>) {
    return {
      filterByDataSource: transformDataSourceInRequest({
        configurationService: this.configurationService,
        dataSource: holding?.dataSource
      }),
      filterBySymbol: holding?.symbol
    };
  }

  private getTextResult(text: string) {
    return { content: [{ text, type: 'text' as const }] };
  }

  /**
   * Gives the user of the access, if the role of the user has the permission.
   * The scope of the access is evaluated separately by the ScopeGuard, hence a
   * tool which changes data has to call this.
   */
  private async getUserWithPermission({
    permission,
    userId
  }: {
    permission: string;
    userId: string;
  }) {
    const user = await this.userService.user({ id: userId });

    if (!hasPermission(user?.permissions, permission)) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return user;
  }
}
