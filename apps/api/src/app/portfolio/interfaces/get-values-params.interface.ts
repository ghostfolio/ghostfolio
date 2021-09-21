import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';

import { DateQuery } from './date-query.interface';

export interface GetValuesParams {
  currencies: { [symbol: string]: string };
  dataGatheringItems: IDataGatheringItem[];
  dateQuery: DateQuery;
  userCurrency: string;
}
