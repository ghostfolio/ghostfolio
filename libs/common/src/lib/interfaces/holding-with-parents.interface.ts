import type { Holding } from './holding.interface';

export interface HoldingWithParents extends Holding {
  parents?: Holding[];
}
