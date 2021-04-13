import { Currency } from '@prisma/client';

export interface Data {
  currency: Currency;
  value: number;
}
