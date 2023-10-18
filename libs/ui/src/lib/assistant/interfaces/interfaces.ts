import { UniqueAsset } from '@ghostfolio/common/interfaces';

export interface ISearchResultItem extends UniqueAsset {
  assetSubClassString: string;
  currency: string;
  name: string;
}

export interface ISearchResults {
  assetProfiles: ISearchResultItem[];
  holdings: ISearchResultItem[];
}
