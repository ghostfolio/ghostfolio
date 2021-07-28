import { Currency } from '@prisma/client';

export interface GetValueParams {
  currency: Currency;
  date: Date;
  symbol: string;
  userCurrency: Currency;
}
