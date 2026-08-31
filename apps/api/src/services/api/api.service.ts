import { Filter, UserSettings } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiService {
  public buildFilters({
    accountIds = [],
    assetClasses = [],
    assetSubClasses = [],
    dataSource,
    holdingType,
    searchQuery,
    symbol,
    tagIds = []
  }: {
    accountIds?: string[];
    assetClasses?: string[];
    assetSubClasses?: string[];
    dataSource?: string;
    holdingType?: string;
    searchQuery?: string;
    symbol?: string;
    tagIds?: string[];
  }): Filter[] {
    const filters = [
      ...accountIds.map((accountId) => {
        return {
          id: accountId,
          type: 'ACCOUNT'
        } as Filter;
      }),
      ...assetClasses.map((assetClass) => {
        return {
          id: assetClass,
          type: 'ASSET_CLASS'
        } as Filter;
      }),
      ...assetSubClasses.map((assetSubClass) => {
        return {
          id: assetSubClass,
          type: 'ASSET_SUB_CLASS'
        } as Filter;
      }),
      ...tagIds.map((tagId) => {
        return {
          id: tagId,
          type: 'TAG'
        } as Filter;
      })
    ];

    if (dataSource) {
      filters.push({
        id: dataSource,
        type: 'DATA_SOURCE'
      });
    }

    if (holdingType) {
      filters.push({
        id: holdingType,
        type: 'HOLDING_TYPE'
      });
    }

    if (searchQuery) {
      filters.push({
        id: searchQuery.toLowerCase(),
        type: 'SEARCH_QUERY'
      });
    }

    if (symbol) {
      filters.push({
        id: symbol,
        type: 'SYMBOL'
      });
    }

    return filters;
  }

  /**
   * Builds the filters of the query parameters of a route, which carry the
   * identifiers as a list separated by commas
   */
  public buildFiltersFromQueryParams({
    filterByAccounts,
    filterByAssetClasses,
    filterByAssetSubClasses,
    filterByDataSource,
    filterByHoldingType,
    filterBySearchQuery,
    filterBySymbol,
    filterByTags
  }: {
    filterByAccounts?: string;
    filterByAssetClasses?: string;
    filterByAssetSubClasses?: string;
    filterByDataSource?: string;
    filterByHoldingType?: string;
    filterBySearchQuery?: string;
    filterBySymbol?: string;
    filterByTags?: string;
  }): Filter[] {
    return this.buildFilters({
      accountIds: filterByAccounts?.split(','),
      assetClasses: filterByAssetClasses?.split(','),
      assetSubClasses: filterByAssetSubClasses?.split(','),
      dataSource: filterByDataSource,
      holdingType: filterByHoldingType,
      searchQuery: filterBySearchQuery,
      symbol: filterBySymbol,
      tagIds: filterByTags?.split(',')
    });
  }

  public buildFiltersFromUserSettings({
    userSettings
  }: {
    userSettings: UserSettings;
  }): Filter[] {
    return this.buildFiltersFromQueryParams({
      filterByAccounts: userSettings?.['filters.accounts']?.[0],
      filterByAssetClasses: userSettings?.['filters.assetClasses']?.[0],
      filterByDataSource: userSettings?.['filters.dataSource'],
      filterBySymbol: userSettings?.['filters.symbol'],
      filterByTags: userSettings?.['filters.tags']?.[0]
    });
  }
}
