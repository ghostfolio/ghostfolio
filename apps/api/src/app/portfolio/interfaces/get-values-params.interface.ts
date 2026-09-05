import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { DateQuery } from './date-query.interface';

export interface GetValuesParams {
  assetProfileIdentifiersWithQuotes: AssetProfileIdentifier[];
  dataGatheringItems: DataGatheringItem[];
  dateQuery: DateQuery;
}
