import { Filter } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiService {
  public constructor() {}

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
    const accountIds = filterByAccounts?.split(',') ?? [];
    const assetClasses = filterByAssetClasses?.split(',') ?? [];
    const assetSubClasses = filterByAssetSubClasses?.split(',') ?? [];
    const dataSource = filterByDataSource;
    const holdingType = filterByHoldingType;
    const searchQuery = filterBySearchQuery?.toLowerCase();
    const symbol = filterBySymbol;
    const tagIds = filterByTags?.split(',') ?? [];

    const filters = [
      ...accountIds.map((accountId) => {
        return <Filter>{
          id: accountId,
          type: 'ACCOUNT'
        };
      }),
      ...assetClasses.map((assetClass) => {
        return <Filter>{
          id: assetClass,
          type: 'ASSET_CLASS'
        };
      }),
      ...assetSubClasses.map((assetClass) => {
        return <Filter>{
          id: assetClass,
          type: 'ASSET_SUB_CLASS'
        };
      }),
      ...tagIds.map((tagId) => {
        return <Filter>{
          id: tagId,
          type: 'TAG'
        };
      })
    ];

    if (holdingType) {
      filters.push({
        id: holdingType,
        type: 'HOLDING_TYPE'
      });
    }

    if (searchQuery) {
      filters.push({
        id: searchQuery,
        type: 'SEARCH_QUERY'
      });
    }

    if (dataSource) {
      filters.push({
        id: dataSource,
        type: 'DATA_SOURCE'
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
}
