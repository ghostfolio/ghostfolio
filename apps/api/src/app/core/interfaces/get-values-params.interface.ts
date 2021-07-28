import { DateQuery } from '@ghostfolio/api/app/core/interfaces/date-query.interface';
import { Currency } from '@prisma/client';

export interface GetValuesParams {
  currencies: { [symbol: string]: Currency };
  dateQuery: DateQuery;
  symbols: string[];
  userCurrency: Currency;
}
