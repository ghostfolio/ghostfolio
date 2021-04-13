import { Currency } from '@prisma/client';

export interface SymbolItem {
  currency: Currency;
  marketPrice: number;
}
