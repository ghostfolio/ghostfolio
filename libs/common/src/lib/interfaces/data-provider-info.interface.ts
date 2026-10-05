import type { DataSource } from '@ghostfolio/prisma/enums';

export interface DataProviderInfo {
  dataSource?: DataSource;
  isPremium: boolean;
  name?: string;
  url?: string;
}
