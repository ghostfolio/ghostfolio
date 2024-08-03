import { DataSource } from '@prisma/client';

export interface AssetProfileIdentifier {
  dataSource: DataSource;
  symbol: string;
}
