import { HoldingBalance } from './holding-balance.interface';

export interface HoldingBalancesAtDate {
  date: string;
  holdings: HoldingBalance[];
}
