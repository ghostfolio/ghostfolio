import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';

import { DateRange } from './date-range.interface';

export interface GetValueRangeParams {
  dataGatheringItems: IDataGatheringItem[];
  dateRange: DateRange;
}
