import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { AccountWithValue, DateRange } from '@ghostfolio/common/types';

import { SearchMode } from '../enums/search-mode';

export interface AccountSearchResultItem
  extends Pick<AccountWithValue, 'id' | 'name'> {
  mode: SearchMode.ACCOUNT;
  routerLink: string[];
}

export interface AssetSearchResultItem extends AssetProfileIdentifier {
  assetSubClassString: string;
  currency: string;
  mode: SearchMode.ASSET_PROFILE | SearchMode.HOLDING;
  name: string;
}

export interface DateRangeOption {
  label: string;
  value: DateRange;
}

export interface QuickLinkSearchResultItem {
  mode: SearchMode.QUICK_LINK;
  name: string;
  routerLink: string[];
}

export type SearchResultItem =
  | AccountSearchResultItem
  | AssetSearchResultItem
  | QuickLinkSearchResultItem;

export interface SearchResults {
  accounts: SearchResultItem[];
  assetProfiles: SearchResultItem[];
  holdings: SearchResultItem[];
  quickLinks: SearchResultItem[];
}
