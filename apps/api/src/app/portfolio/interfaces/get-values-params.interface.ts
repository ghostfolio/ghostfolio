import type { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import type { SubscriptionType } from '@ghostfolio/common/enums';
import type { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import type { DateQuery } from './date-query.interface';

export interface GetValuesParams {
  assetProfileIdentifiersWithQuotes: AssetProfileIdentifier[];
  dataGatheringItems: DataGatheringItem[];
  dateQuery: DateQuery;
  subscriptionType?: SubscriptionType;
}
