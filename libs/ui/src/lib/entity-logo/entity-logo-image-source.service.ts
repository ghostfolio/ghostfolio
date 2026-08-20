import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Service } from '@angular/core';

// Must stay auto-provided so it can be mocked in Storybook
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
