import { UniqueAsset } from '@ghostfolio/common/interfaces';

export interface ISearchResultItem extends UniqueAsset {
  name: string;
}

export interface ISearchResults {
  assetProfiles: ISearchResultItem[];
  holdings: ISearchResultItem[];
}
