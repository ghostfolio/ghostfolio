import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';

import { SearchMode } from '../enums/search-mode';

export interface IAssetSearchResultItem extends AssetProfileIdentifier {
  assetSubClassString: string;
  currency: string;
  mode: SearchMode.ASSET_PROFILE | SearchMode.HOLDING;
  name: string;
}

export interface IDateRangeOption {
  label: string;
  value: DateRange;
}

export interface IQuickLinkSearchResultItem {
  mode: SearchMode.QUICK_LINK;
  name: string;
  routerLink: string[];
}

export type ISearchResultItem =
  | IAssetSearchResultItem
  | IQuickLinkSearchResultItem;

export interface ISearchResults {
  assetProfiles: ISearchResultItem[];
  holdings: ISearchResultItem[];
  quickLinks: ISearchResultItem[];
}
