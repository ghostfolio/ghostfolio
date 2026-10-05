import type { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import type { SubscriptionType } from '@ghostfolio/common/enums';

import type { DateQuery } from './date-query.interface';

export interface GetValuesParams {
  dataGatheringItems: DataGatheringItem[];
  dateQuery: DateQuery;
  subscriptionType?: SubscriptionType;
}
