import { TransactionPointSymbol } from './transaction-point-symbol.interface';

export interface TransactionPoint {
  date: string;
  items: TransactionPointSymbol[];
}
