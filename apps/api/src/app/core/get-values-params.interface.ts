import { DateQuery } from '@ghostfolio/api/app/core/market-data.service';
import { Currency } from '@prisma/client';

export interface GetValuesParams {
  dateQuery: DateQuery;
  symbols: string[];
  currencies: { [symbol: string]: Currency };
  userCurrency: Currency;
}
