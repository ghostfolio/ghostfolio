import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { DateRange } from '@ghostfolio/common/types';

export interface IDateRangeOption {
  label: string;
  value: DateRange;
}

export interface ISearchResultItem extends AssetProfileIdentifier {
  assetSubClassString: string;
  currency: string;
  name: string;
}

export interface ISearchResults {
  assetProfiles: ISearchResultItem[];
  holdings: ISearchResultItem[];
}
