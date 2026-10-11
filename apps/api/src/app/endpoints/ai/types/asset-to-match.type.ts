import { ActivityRow } from './activity-row.type';

export type AssetToMatch = Pick<
  ActivityRow,
  'currency' | 'isin' | 'name' | 'symbol'
> & { id: number };
