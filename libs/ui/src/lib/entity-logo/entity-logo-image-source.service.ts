import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Service } from '@angular/core';

// Must stay auto-provided: several table stories render gf-entity-logo
// without providing an override and resolve this from the root injector
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
