import { TransactionPointSymbol } from '@ghostfolio/api/app/core/interfaces/transaction-point-symbol.interface';

export interface TransactionPoint {
  date: string;
  items: TransactionPointSymbol[];
}
