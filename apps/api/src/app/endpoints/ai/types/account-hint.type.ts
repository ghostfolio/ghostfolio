import type { ActivityRow } from './activity-row.type';

export type AccountHint = Pick<ActivityRow, 'accountName'> & {
  broker: string | null;
  id: number;
};
