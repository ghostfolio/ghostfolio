import { TransactionPointSymbol } from '@ghostfolio/api/app/core/transaction-point-symbol';

export interface TransactionPoint {
  date: string;
  items: TransactionPointSymbol[];
}
