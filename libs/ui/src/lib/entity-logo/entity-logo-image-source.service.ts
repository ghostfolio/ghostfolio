import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@angular/core';

@Injectable({
  // Required to allow mocking in Storybook
  providedIn: 'root'
})
export class EntityLogoImageSourceService {
  private failedImageSources = new Set<string>();

  public getLogoUrlByAssetProfileIdentifier({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    return `../api/v1/logo/${dataSource}/${symbol}`;
  }

  public getLogoUrlByUrl(url: string) {
    return `../api/v1/logo?url=${url}`;
  }

  public hasFailed(imageSource: string) {
    return this.failedImageSources.has(imageSource);
  }

  public markAsFailed(imageSource: string) {
    this.failedImageSources.add(imageSource);
  }
}
