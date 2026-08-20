import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Service } from '@angular/core';

// Required to allow mocking in Storybook
@Service()
export class EntityLogoImageSourceService {
  public getLogoUrlByAssetProfileIdentifier({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    return `../api/v1/logo/${dataSource}/${symbol}`;
  }

  public getLogoUrlByUrl(url: string) {
    return `../api/v1/logo?url=${encodeURIComponent(url)}`;
  }
}
