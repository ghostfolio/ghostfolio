import { Big } from 'big.js';

import { TransactionPointSymbol } from './transaction-point-symbol.interface';

export interface TransactionPoint {
  date: string;
  fees: Big;
  interest: Big;
  items: TransactionPointSymbol[];
  liabilities: Big;
  valuables: Big;
}
