import { OrderWithAccount } from '@ghostfolio/common/types';

export interface Activities {
  activities: Activity[];
  count: number;
}

export interface Activity extends OrderWithAccount {
  error?: ActivityError;
  updateAccountBalance?: boolean;
  value: number;
}

export interface ActivityError {
  code: 'IS_DUPLICATE';
  message?: string;
}
