import { OrderWithAccount } from '@ghostfolio/common/types';

export interface Activities {
  activities: Activity[];
}

export interface Activity extends OrderWithAccount {
  feeInBaseCurrency: number;
  isDuplicate: boolean;
  updateAccountBalance?: boolean;
  value: number;
  valueInBaseCurrency: number;
}
