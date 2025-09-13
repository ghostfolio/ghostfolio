import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@angular/core';

@Injectable({
  // Required to allow mocking in Storybook
  providedIn: 'root'
})
export class EntityLogoImageSourceService {
  public getLogoUrlByAssetProfileIdentifier({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    return `../api/v1/logo/${dataSource}/${symbol}`;
  }

  public getLogoUrlByUrl(url: string) {
    return `../api/v1/logo?url=${url}`;
  }
}
