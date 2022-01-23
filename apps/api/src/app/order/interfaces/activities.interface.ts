import { OrderWithAccount } from '@ghostfolio/common/types';

export interface Activities {
  activities: Activity[];
}

export interface Activity extends OrderWithAccount {
  feeInBaseCurrency: number;
  valueInBaseCurrency: number;
}
