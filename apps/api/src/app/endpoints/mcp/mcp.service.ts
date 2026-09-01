import { ImportService } from '@ghostfolio/api/app/import/import.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { getUnmaskedGhostfolioDataSource } from '@ghostfolio/api/helper/data-source.helper';
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
  IMPORT_ACTIVITIES_PARAMETERS
} from './mcp.schemas';

@Injectable()
export class McpService {
  public constructor(
    private readonly apiService: ApiService,
    private readonly configurationService: ConfigurationService,
    private readonly importService: ImportService,
    private readonly portfolioTableService: PortfolioTableService,
    private readonly userService: UserService
  ) {}

  public async getAccounts({
    accountIds,
    assetClasses,
    holding,
    userId
  }: z.infer<typeof GET_ACCOUNTS_PARAMETERS> & { userId: string }) {
    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAccounts: accountIds,
      filterByAssetClasses: assetClasses,
      filterByDataSource: holding?.dataSource,
      filterBySymbol: holding?.symbol
    });

    const table = await this.portfolioTableService.getAccountsTable({
      filters,
      userId
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
    userId
  }: z.infer<typeof GET_ACTIVITIES_PARAMETERS> & {
    userCurrency: string;
    userId: string;
  }) {
    let endDate: Date | undefined;
    let startDate: Date | undefined;

    if (range) {
      ({ endDate, startDate } = getIntervalFromDateRange({
        dateRange: range
      }));
    }

    const filters = this.apiService.buildFiltersFromQueryParams({
      filterByAssetClasses: assetClasses,
      filterByDataSource: holding?.dataSource,
      filterBySymbol: holding?.symbol
    });

    const table = await this.portfolioTableService.getActivitiesTable({
      endDate,
      filters,
      skip,
      startDate,
      take,
      userCurrency,
      userId,
      types: activityTypes
    });

    return this.getTextResult(table);
  }

  public async getPortfolio({ userId }: { userId: string }) {
    const table = await this.portfolioTableService.getHoldingsTable({
      userId,
      languageCode: DEFAULT_LANGUAGE_CODE
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
