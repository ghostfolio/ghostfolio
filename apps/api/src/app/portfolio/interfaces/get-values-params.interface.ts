import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';

import { DateQuery } from './date-query.interface';

export interface GetValuesParams {
  dataGatheringItems: DataGatheringItem[];
  dateQuery: DateQuery;
}
