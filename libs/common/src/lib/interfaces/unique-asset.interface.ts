import { DataSource } from '@prisma/client';

export interface UniqueAsset {
  dataSource: DataSource;
  symbol: string;
}
