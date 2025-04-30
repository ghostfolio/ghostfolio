import { DataSource } from '@prisma/client';

export interface DataProviderInfo {
  dataSource?: DataSource;
  isPremium: boolean;
  name?: string;
  url?: string;
}
