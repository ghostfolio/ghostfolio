import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { SubscriptionType } from '@ghostfolio/common/enums';

import { DateQuery } from './date-query.interface';

export interface GetValuesParams {
  dataGatheringItems: DataGatheringItem[];
  dateQuery: DateQuery;
  subscriptionType?: SubscriptionType;
}
