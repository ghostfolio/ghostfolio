import { Big } from 'big.js';

import { TransactionPointSymbol } from './transaction-point-symbol.interface';

export interface TransactionPoint {
  date: string;
  fees: Big;
  items: TransactionPointSymbol[];
}
