import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { Currency } from '@prisma/client';

import { DateQuery } from './date-query.interface';

export interface GetValuesParams {
  currencies: { [symbol: string]: Currency };
  dataGatheringItems: IDataGatheringItem[];
  dateQuery: DateQuery;
  userCurrency: Currency;
}
