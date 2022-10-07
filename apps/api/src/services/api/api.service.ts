import { Filter } from '@ghostfolio/common/interfaces';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ApiService {
  public constructor() {}

  public buildFiltersFromQueryParams({
    filterByAccounts,
    filterByAssetClasses,
    filterByTags
  }: {
    filterByAccounts?: string;
    filterByAssetClasses?: string;
    filterByTags?: string;
  }): Filter[] {
    const accountIds = filterByAccounts?.split(',') ?? [];
    const assetClasses = filterByAssetClasses?.split(',') ?? [];
    const tagIds = filterByTags?.split(',') ?? [];

    return [
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
      ...tagIds.map((tagId) => {
        return <Filter>{
          id: tagId,
          type: 'TAG'
        };
      })
    ];
  }
}
