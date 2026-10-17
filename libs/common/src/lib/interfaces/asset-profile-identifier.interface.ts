import type { DataSource } from '@ghostfolio/prisma/enums';

export interface AssetProfileIdentifier {
  dataSource: DataSource;
  symbol: string;
}
