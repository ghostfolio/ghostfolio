import { DataSource, Type } from '@prisma/client';

export interface ImportDataLike {
  activities?: { dataSource?: DataSource; symbol?: string; type?: Type }[];
  assetProfiles?: { dataSource?: DataSource; symbol?: string }[];
}
