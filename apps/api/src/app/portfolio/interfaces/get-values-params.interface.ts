import { Currency } from '@prisma/client';

import { DateQuery } from './date-query.interface';

export interface GetValuesParams {
  currencies: { [symbol: string]: Currency };
  dateQuery: DateQuery;
  symbols: string[];
  userCurrency: Currency;
}
