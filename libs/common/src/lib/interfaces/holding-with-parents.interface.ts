import { Holding } from './holding.interface';

export interface HoldingWithParents extends Holding {
  parents?: Holding[];
}
