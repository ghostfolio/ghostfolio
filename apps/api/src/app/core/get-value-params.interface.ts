import { Currency } from '@prisma/client';

export interface GetValueParams {
  date: Date;
  symbol: string;
  currency: Currency;
  userCurrency: Currency;
}
