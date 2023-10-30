import { DataSource } from '@prisma/client';

export interface Filter {
  id: string;
  label?: string;
  symbolDataSource?: DataSource;
  accountPlatformUrl?: string;
  type:
    | 'ACCOUNT'
    | 'ASSET_CLASS'
    | 'ASSET_SUB_CLASS'
    | 'CURRENCY'
    | 'PRESET_ID'
    | 'SEARCH_QUERY'
    | 'SYMBOL'
    | 'TAG'
    | 'TYPE'
    | 'YEAR';
}
